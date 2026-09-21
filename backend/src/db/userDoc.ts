// db/userDoc.ts
//
// A user, loaded from Postgres in the SAME NESTED SHAPE the Mongoose document
// had — `user.wallet.bitAward`, `user.school.ownedRoomIds`, `user.sessions`,
// `user._id` — with a `save()` that writes back only what changed.
//
// ── Why this exists, and what it is NOT for ────────────────────────────────
//
// Every controller in this backend was written against that document shape,
// and the pure logic they call (config/sessions.js, config/entitlements.js,
// the school catalog) takes it as input. Rewriting ~5,000 lines to flat columns
// in one step would be the riskiest possible way to move off Mongo, so this
// layer lets the port change the data SOURCE while leaving that logic, and the
// JSON the API returns, byte-for-byte alone.
//
// It is for ordinary reads and ordinary edits: profile fields, phone
// verification state, password reset tokens, sessions at login.
//
// It is NOT for money or anything race-sensitive. `save()` is last-write-wins
// on the columns it changes — exactly as Mongoose's was — so a wallet debit,
// a room purchase, a payment settlement or a learned-words merge must go
// through the repos (db/repos/*), which do those atomically. Accordingly:
//   - wallet columns ARE diffed, so a controller that never touches the wallet
//     never overwrites a concurrent debit, but nothing should ever assign it;
//   - `entitlements` and `learnedWords` are loaded read-only and are never
//     written by save(), whatever a caller does to the arrays.

import { and, asc, desc, eq, gt, ilike, inArray, ne, notInArray, or, sql } from "drizzle-orm";

import { DEFAULT_PLACEMENT } from "../config/roomLayout.js";
import { db } from "./client.js";
import type { Tx } from "./client.js";
import { userEntitlement, userLearnedWord, userSession, users } from "./schema.js";
import type { NewUser, User } from "./schema.js";
import * as usersRepo from "./repos/users.repo.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UserDoc = Record<string, any> & {
  _id: string;
  id: string;
  save: (tx?: Tx) => Promise<void>;
};

// ── Shape translation ───────────────────────────────────────────────────────

/** Mongoose applied these to a missing `room` subtree on every read. */
function defaultRoom(): Record<string, unknown> {
  return {
    apartmentTier: "studio",
    ownedItemIds: [],
    lightsOn: true,
    placedItems: {
      wallpaper: null,
      flooring: null,
      furniture1: null,
      chair: null,
      furniture2: null,
      poster: null,
      wardrobe: null,
      table: null,
      shelf: null,
      window: null,
    },
    placement: structuredClone(DEFAULT_PLACEMENT),
  };
}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function rowToDoc(
  row: User,
  sessions: (typeof userSession.$inferSelect)[],
  entitlements: (typeof userEntitlement.$inferSelect)[],
  learnedWords: string[] | null,
): UserDoc {
  const doc: Record<string, unknown> = {
    _id: row.id,
    id: row.id,
    username: row.username,
    email: row.email ?? undefined,
    phoneNumber: row.phoneNumber ?? undefined,
    isPhoneVerified: row.isPhoneVerified,
    pendingRegistration: row.pendingRegistration,
    banned: row.banned,
    legalConsent: {
      version: row.legalConsentVersion ?? undefined,
      termsAcceptedAt: row.legalConsentTermsAcceptedAt ?? undefined,
      dataConsentAcceptedAt: row.legalConsentDataAcceptedAt ?? undefined,
    },
    phoneVerificationCodeHash: row.phoneVerificationCodeHash,
    phoneVerificationExpires: row.phoneVerificationExpires,
    phoneVerificationAttempts: row.phoneVerificationAttempts,
    phoneVerificationLastSentAt: row.phoneVerificationLastSentAt,
    phoneVerificationTicketHash: row.phoneVerificationTicketHash,
    phoneVerificationTicketExpires: row.phoneVerificationTicketExpires,
    createdAt: row.createdAt,
    passwordResetToken: row.passwordResetToken ?? undefined,
    passwordResetExpires: row.passwordResetExpires ?? undefined,
    avatar: row.avatar,
    nickname: row.nickname,
    lastActiveAt: row.lastActiveAt,
    sessions: sessions.map((s) => ({
      jti: s.jti,
      deviceId: s.deviceId,
      deviceLabel: s.deviceLabel,
      ipPrefix: s.ipPrefix,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
    })),
    loginSignals: {
      recentIpPrefixes: (row.recentIpPrefixes ?? []).map((entry) => ({
        prefix: entry.prefix,
        firstSeenAt: new Date(entry.firstSeenAt),
        lastSeenAt: new Date(entry.lastSeenAt),
        count: entry.count,
      })),
      blockedLoginCount: row.blockedLoginCount,
      lastBlockedAt: row.lastBlockedAt,
    },
    streak: {
      current: row.streakCurrent,
      longest: row.streakLongest,
      lastSubmittedDate: row.streakLastSubmittedDate,
    },
    achievements: {
      listeningTime: row.achievementListeningTime,
      questionsAnswered: row.achievementQuestionsAnswered,
      studyStreak: row.achievementStudyStreak,
      storiesListened: row.achievementStoriesListened,
      wordsLearned: row.achievementWordsLearned,
    },
    totalListeningSeconds: row.totalListeningSeconds,
    wallet: { bitAward: row.bitAward, bitWord: row.bitWord, bitPhrase: row.bitPhrase },
    entitlements: entitlements.map((e) => ({
      sku: e.sku,
      grantedAt: e.grantedAt,
      expiresAt: e.expiresAt,
      source: e.source,
      paymentId: e.paymentId,
    })),
    room: row.room ?? defaultRoom(),
    character: {
      skinTone: row.characterSkinTone,
      ownedItemIds: row.characterOwnedItemIds,
      equipped: {
        hairstyle: row.characterEquippedHairstyle,
        outfit: row.characterEquippedOutfit,
        hat: row.characterEquippedHat,
      },
    },
    school: {
      ownedRoomIds: row.schoolOwnedRoomIds,
      stage: row.schoolStage,
      layoutId: row.schoolLayoutId,
      wallpaperId: row.schoolWallpaperId,
      floorId: row.schoolFloorId,
      presets: row.schoolPresets ?? {},
      payroll: { lastPaidAt: row.schoolPayrollLastPaidAt ?? undefined },
      variantId: row.schoolVariantId,
    },
  };

  // NOT enumerable, so JSON.stringify(user) and `{ ...user }` can never carry
  // the hash into a response. Mongoose achieved this with select("-password").
  Object.defineProperty(doc, "password", {
    value: row.password,
    writable: true,
    enumerable: false,
    configurable: true,
  });

  if (learnedWords === null) {
    // Not loaded on the hot path (every authenticated request). Throwing beats
    // silently answering "[]" to a caller that forgot to ask for them.
    Object.defineProperty(doc, "learnedWords", {
      get() {
        throw new Error("learnedWords was not loaded for this user (pass { learnedWords: true })");
      },
      enumerable: false,
      configurable: true,
    });
  } else {
    doc.learnedWords = learnedWords;
  }

  return doc as UserDoc;
}

/**
 * The doc flattened back into columns. Every column save() is allowed to
 * write, and nothing else — id, entitlements and learned words are absent.
 */
function docToColumns(doc: UserDoc): Partial<NewUser> {
  const consent = doc.legalConsent ?? {};
  const signals = doc.loginSignals ?? {};
  const streak = doc.streak ?? {};
  const ach = doc.achievements ?? {};
  const wallet = doc.wallet ?? {};
  const character = doc.character ?? {};
  const equipped = character.equipped ?? {};
  const school = doc.school ?? {};

  return {
    username: doc.username,
    email: typeof doc.email === "string" && doc.email ? doc.email.toLowerCase().trim() : null,
    password: doc.password,
    phoneNumber: doc.phoneNumber ?? null,
    isPhoneVerified: Boolean(doc.isPhoneVerified),
    pendingRegistration: Boolean(doc.pendingRegistration),
    banned: Boolean(doc.banned),

    legalConsentVersion: consent.version ?? null,
    legalConsentTermsAcceptedAt: toDate(consent.termsAcceptedAt),
    legalConsentDataAcceptedAt: toDate(consent.dataConsentAcceptedAt),

    phoneVerificationCodeHash: doc.phoneVerificationCodeHash ?? null,
    phoneVerificationExpires: toDate(doc.phoneVerificationExpires),
    phoneVerificationAttempts: Number(doc.phoneVerificationAttempts ?? 0),
    phoneVerificationLastSentAt: toDate(doc.phoneVerificationLastSentAt),
    phoneVerificationTicketHash: doc.phoneVerificationTicketHash ?? null,
    phoneVerificationTicketExpires: toDate(doc.phoneVerificationTicketExpires),

    // password.controller.js assigns `Date.now() + 3600000` — a number. toDate
    // is what keeps that working against a timestamptz column.
    passwordResetToken: doc.passwordResetToken ?? null,
    passwordResetExpires: toDate(doc.passwordResetExpires),

    avatar: doc.avatar ?? "cat",
    nickname: doc.nickname ?? null,
    lastActiveAt: toDate(doc.lastActiveAt) ?? new Date(),
    totalListeningSeconds: Number(doc.totalListeningSeconds ?? 0),

    bitAward: Number(wallet.bitAward ?? 0),
    bitWord: Number(wallet.bitWord ?? 0),
    bitPhrase: Number(wallet.bitPhrase ?? 0),

    streakCurrent: Number(streak.current ?? 0),
    streakLongest: Number(streak.longest ?? 0),
    streakLastSubmittedDate: streak.lastSubmittedDate ?? null,

    achievementListeningTime: ach.listeningTime ?? null,
    achievementQuestionsAnswered: ach.questionsAnswered ?? null,
    achievementStudyStreak: ach.studyStreak ?? null,
    achievementStoriesListened: ach.storiesListened ?? null,
    achievementWordsLearned: ach.wordsLearned ?? null,

    characterSkinTone: character.skinTone ?? "#f2c48d",
    characterOwnedItemIds: [...(character.ownedItemIds ?? [])],
    characterEquippedHairstyle: equipped.hairstyle ?? null,
    characterEquippedOutfit: equipped.outfit ?? null,
    characterEquippedHat: equipped.hat ?? null,

    schoolOwnedRoomIds: [...(school.ownedRoomIds ?? [])],
    schoolStage: Number(school.stage ?? 0),
    schoolLayoutId: school.layoutId,
    schoolWallpaperId: school.wallpaperId,
    schoolFloorId: school.floorId,
    schoolPresets: school.presets ?? {},
    schoolPayrollLastPaidAt: toDate(school.payroll?.lastPaidAt),
    schoolVariantId: school.variantId,

    blockedLoginCount: Number(signals.blockedLoginCount ?? 0),
    lastBlockedAt: toDate(signals.lastBlockedAt),
    recentIpPrefixes: (signals.recentIpPrefixes ?? []).map(
      (entry: { prefix: string; firstSeenAt: unknown; lastSeenAt: unknown; count?: number }) => ({
        prefix: entry.prefix,
        firstSeenAt: (toDate(entry.firstSeenAt) ?? new Date()).toISOString(),
        lastSeenAt: (toDate(entry.lastSeenAt) ?? new Date()).toISOString(),
        count: Number(entry.count ?? 1),
      }),
    ),

    room: doc.room ?? null,
  };
}

/** Comparable form of one column value. Dates by instant, everything else by JSON. */
function fingerprint(value: unknown): string {
  if (value instanceof Date) return `D${value.getTime()}`;
  return JSON.stringify(value) ?? "u";
}

function sessionsFingerprint(sessions: unknown): string {
  const list = Array.isArray(sessions) ? sessions : [];
  return JSON.stringify(
    list.map((s) => [
      s?.jti,
      s?.deviceId,
      s?.deviceLabel ?? null,
      s?.ipPrefix ?? null,
      toDate(s?.createdAt)?.getTime() ?? null,
      toDate(s?.lastSeenAt)?.getTime() ?? null,
    ]),
  );
}

/**
 * Make the user_session rows for this user exactly match `sessions`.
 *
 * attachSession() in helpers/sessionStore.js computes the complete, pruned,
 * capped list and assigns it to user.sessions; this is the write that list
 * implies. Rows whose jti is no longer present are removed (a rotated jti
 * removes that device's old row, and the upsert below re-creates it), and every
 * listed session is upserted on its (user, device) slot.
 */
async function syncSessions(tx: Tx, userId: string, sessions: unknown): Promise<void> {
  const list = (Array.isArray(sessions) ? sessions : []).filter(
    (s) => typeof s?.jti === "string" && typeof s?.deviceId === "string",
  );
  const jtis = list.map((s) => s.jti as string);

  await tx
    .delete(userSession)
    .where(
      jtis.length
        ? and(eq(userSession.userId, userId), notInArray(userSession.jti, jtis))
        : eq(userSession.userId, userId),
    );

  for (const s of list) {
    const createdAt = toDate(s.createdAt) ?? new Date();
    const lastSeenAt = toDate(s.lastSeenAt) ?? createdAt;
    await tx
      .insert(userSession)
      .values({
        id: crypto.randomUUID(),
        userId,
        jti: s.jti,
        deviceId: s.deviceId,
        deviceLabel: s.deviceLabel ?? null,
        ipPrefix: s.ipPrefix ?? null,
        createdAt,
        lastSeenAt,
      })
      .onConflictDoUpdate({
        target: [userSession.userId, userSession.deviceId],
        set: {
          jti: s.jti,
          deviceLabel: s.deviceLabel ?? null,
          ipPrefix: s.ipPrefix ?? null,
          lastSeenAt,
        },
      });
  }
}

/** Attach a change-tracking save() to a freshly hydrated doc. */
function withSave(doc: UserDoc): UserDoc {
  let columnsSnapshot = docToColumns(doc);
  let sessionsSnapshot = sessionsFingerprint(doc.sessions);

  const save = async (tx?: Tx): Promise<void> => {
    const next = docToColumns(doc);
    const changed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(next)) {
      if (fingerprint(value) !== fingerprint((columnsSnapshot as Record<string, unknown>)[key])) {
        changed[key] = value;
      }
    }
    const nextSessions = sessionsFingerprint(doc.sessions);
    const sessionsChanged = nextSessions !== sessionsSnapshot;

    if (Object.keys(changed).length === 0 && !sessionsChanged) return;

    const run = async (t: Tx) => {
      if (Object.keys(changed).length) {
        await t.update(users).set(changed).where(eq(users.id, doc.id));
      }
      if (sessionsChanged) await syncSessions(t, doc.id, doc.sessions);
    };

    if (tx) await run(tx);
    else await db().transaction(async (t) => run(t));

    columnsSnapshot = next;
    sessionsSnapshot = nextSessions;
  };

  Object.defineProperty(doc, "save", { value: save, enumerable: false, configurable: true });
  return doc;
}

async function hydrate(row: User, opts: LoadOptions, tx: Tx): Promise<UserDoc> {
  const sessionsQuery = () => tx.select().from(userSession).where(eq(userSession.userId, row.id));
  const entitlementsQuery = () =>
    tx.select().from(userEntitlement).where(eq(userEntitlement.userId, row.id));
  const wordsQuery = async () =>
    opts.learnedWords
      ? tx
          .select({ word: userLearnedWord.word })
          .from(userLearnedWord)
          .where(eq(userLearnedWord.userId, row.id))
          .orderBy(asc(userLearnedWord.learnedAt), asc(userLearnedWord.word))
      : null;

  // Concurrent on the pool — this is the per-request auth path, so it matters —
  // but sequential inside a transaction: a transaction is a single connection,
  // and overlapping queries on one pg client are deprecated (removed in pg@9).
  const [sessions, entitlements, words] =
    tx === db()
      ? await Promise.all([sessionsQuery(), entitlementsQuery(), wordsQuery()])
      : [await sessionsQuery(), await entitlementsQuery(), await wordsQuery()];
  return withSave(rowToDoc(row, sessions, entitlements, words ? words.map((w) => w.word) : null));
}

// ── Loading ─────────────────────────────────────────────────────────────────

export interface LoadOptions {
  /** Load the learned-words set. Off by default: it is the one unbounded list. */
  learnedWords?: boolean;
  /**
   * Take the user row with SELECT ... FOR UPDATE. Only meaningful inside a
   * transaction (pass `tx`), where it holds the row until commit.
   *
   * This is what a read-check-write purchase needs. "Is this item already
   * owned? No — charge, then record it" is a race between two taps unless the
   * second tap waits for the first to commit; with the row locked it does, and
   * then sees the item as owned. Mongo could not express this and relied on a
   * conditional write plus a manual refund instead.
   */
  lock?: boolean;
}

async function loadWhere(
  where: ReturnType<typeof eq>,
  opts: LoadOptions = {},
  tx: Tx = db(),
): Promise<UserDoc | null> {
  const [row] = opts.lock
    ? await tx.select().from(users).where(where).limit(1).for("update")
    : await tx.select().from(users).where(where).limit(1);
  return row ? hydrate(row, opts, tx) : null;
}

/**
 * By id. A malformed id is simply "no such user" rather than a thrown query
 * error — Mongoose's findById on a bad ObjectId threw CastError, which several
 * controllers wrapped in `.catch(() => null)` for exactly this reason.
 */
export async function loadUser(
  id: unknown,
  opts: LoadOptions = {},
  tx: Tx = db(),
): Promise<UserDoc | null> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return null;
  return loadWhere(eq(users.id, id), opts, tx);
}

export async function loadUserBy(
  field: "username" | "email" | "phoneNumber",
  value: unknown,
  opts: LoadOptions = {},
  tx: Tx = db(),
): Promise<UserDoc | null> {
  if (typeof value !== "string" || !value) return null;
  const column = { username: users.username, email: users.email, phoneNumber: users.phoneNumber }[field];
  return loadWhere(eq(column, field === "email" ? value.toLowerCase().trim() : value), opts, tx);
}

/** The signup collision check: any account holding one of these identities. */
export async function loadUserByAnyIdentity(
  identities: { username?: string; phoneNumber?: string; email?: string },
  tx: Tx = db(),
): Promise<UserDoc | null> {
  const clauses = [];
  if (identities.username) clauses.push(eq(users.username, identities.username));
  if (identities.phoneNumber) clauses.push(eq(users.phoneNumber, identities.phoneNumber));
  if (identities.email) clauses.push(eq(users.email, identities.email.toLowerCase().trim()));
  if (!clauses.length) return null;
  const [row] = await tx.select().from(users).where(or(...clauses)).limit(1);
  return row ? hydrate(row, {}, tx) : null;
}

/** An unexpired phone-verification ticket, by its hash. */
export async function loadUserByPhoneTicket(ticketHash: string, tx: Tx = db()): Promise<UserDoc | null> {
  const [row] = await tx
    .select()
    .from(users)
    .where(
      and(
        eq(users.phoneVerificationTicketHash, ticketHash),
        gt(users.phoneVerificationTicketExpires, sql`now()`),
      ),
    )
    .limit(1);
  return row ? hydrate(row, {}, tx) : null;
}

/** An unexpired password-reset token, by its hash. */
export async function loadUserByResetToken(tokenHash: string, tx: Tx = db()): Promise<UserDoc | null> {
  const [row] = await tx
    .select()
    .from(users)
    .where(and(eq(users.passwordResetToken, tokenHash), gt(users.passwordResetExpires, sql`now()`)))
    .limit(1);
  return row ? hydrate(row, {}, tx) : null;
}

/** Is this phone number held by an account other than `selfId`? */
export async function phoneTakenByOther(phoneNumber: string, selfId: string): Promise<boolean> {
  return usersRepo.phoneTakenByOther(phoneNumber, selfId);
}

// ── Creating and deleting ───────────────────────────────────────────────────

/**
 * Create an account from the fields signup has, returning it as a doc. School
 * defaults and the campus variant are filled by users.repo create().
 */
export async function createUser(
  input: {
    username: string;
    password: string;
    email?: string | null;
    phoneNumber?: string | null;
    pendingRegistration?: boolean;
    legalConsent?: { version?: string; termsAcceptedAt?: Date; dataConsentAcceptedAt?: Date };
  },
  tx: Tx = db(),
): Promise<UserDoc> {
  const row = await usersRepo.create(
    {
      username: input.username,
      password: input.password,
      email: input.email ?? null,
      phoneNumber: input.phoneNumber ?? null,
      pendingRegistration: input.pendingRegistration ?? false,
      legalConsentVersion: input.legalConsent?.version ?? null,
      legalConsentTermsAcceptedAt: input.legalConsent?.termsAcceptedAt ?? null,
      legalConsentDataAcceptedAt: input.legalConsent?.dataConsentAcceptedAt ?? null,
    },
    tx,
  );
  return hydrate(row, { learnedWords: true }, tx);
}

/**
 * Delete an account. With `pendingOnly`, only if it never finished signup —
 * see users.repo deletePendingRegistration for why that guard matters.
 */
export async function deleteUser(
  id: string,
  { pendingOnly = false }: { pendingOnly?: boolean } = {},
  tx: Tx = db(),
): Promise<number> {
  if (pendingOnly) return usersRepo.deletePendingRegistration(id, tx);
  const result = await tx.delete(users).where(eq(users.id, id));
  return result.rowCount ?? 0;
}

// ── Lists ───────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** LIKE's own wildcards escaped, so a search for "50%" is literal. */
function likePattern(value: string): string {
  return `%${value.replace(/([\\%_])/g, "\\$1")}%`;
}

/**
 * Hydrate several rows with TWO child queries total, not two per user. The
 * admin roster shows 25 players at once; one round trip per player per child
 * table would be 50 queries for a page.
 */
async function hydrateMany(rows: User[], tx: Tx): Promise<UserDoc[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const sessionsQuery = () => tx.select().from(userSession).where(inArray(userSession.userId, ids));
  const entitlementsQuery = () =>
    tx.select().from(userEntitlement).where(inArray(userEntitlement.userId, ids));
  // Sequential inside a transaction — see hydrate().
  const [sessionRows, entitlementRows] =
    tx === db()
      ? await Promise.all([sessionsQuery(), entitlementsQuery()])
      : [await sessionsQuery(), await entitlementsQuery()];
  return rows.map((row) =>
    withSave(
      rowToDoc(
        row,
        sessionRows.filter((s) => s.userId === row.id),
        entitlementRows.filter((e) => e.userId === row.id),
        null,
      ),
    ),
  );
}

/**
 * The public player search (GET /user/search). An email must match EXACTLY, so
 * a partial guess cannot enumerate other people's addresses; username and
 * nickname match partially and case-insensitively, since those are shown to
 * other players once found anyway.
 */
export async function searchUserDocs(
  query: string,
  { excludeId, limit = 20 }: { excludeId?: string; limit?: number } = {},
  tx: Tx = db(),
): Promise<UserDoc[]> {
  const q = query.trim();
  const match = q.includes("@")
    ? eq(users.email, q.toLowerCase())
    : or(ilike(users.username, likePattern(q)), ilike(users.nickname, likePattern(q)));
  const where = excludeId && UUID_RE.test(excludeId) ? and(match, ne(users.id, excludeId)) : match;
  const rows = await tx.select().from(users).where(where).limit(limit);
  return hydrateMany(rows, tx);
}

/**
 * The admin roster (GET /api/admin/players): everyone, newest first, filtered
 * by a partial match on username, email or nickname.
 */
export async function pageUserDocs(
  query: string,
  offset: number,
  limit: number,
  tx: Tx = db(),
): Promise<{ docs: UserDoc[]; total: number }> {
  const q = query.trim();
  const pattern = likePattern(q);
  const where = q
    ? or(ilike(users.username, pattern), ilike(users.email, pattern), ilike(users.nickname, pattern))
    : undefined;

  const rowsQuery = () =>
    tx.select().from(users).where(where).orderBy(desc(users.createdAt)).offset(offset).limit(limit);
  const countQuery = () =>
    tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(users).where(where);
  // Sequential inside a transaction — see hydrate().
  const [rows, counted] =
    tx === db() ? await Promise.all([rowsQuery(), countQuery()]) : [await rowsQuery(), await countQuery()];

  return { docs: await hydrateMany(rows, tx), total: counted[0]?.n ?? 0 };
}

/** Is this the unique-violation error Postgres raises for a duplicate identity? */
export function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } })?.cause?.code ??
    (error as { code?: string })?.code;
  return code === "23505";
}
