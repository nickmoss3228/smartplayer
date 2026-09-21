// db/repos/users.repo.ts
//
// ── The hot path ───────────────────────────────────────────────────────────
//
// middleware/auth.js runs on EVERY authenticated request and does:
//
//   User.findById(decoded.userId).select("-password")   // whole document
//   ...then reads user.sessions to find the row matching decoded.jti
//
// models/User.js justifies embedding sessions on exactly that basis: the
// document is already loaded, so checking a session "costs zero extra queries",
// and a separate collection "would add a round-trip to the hottest path".
//
// That argument is worth taking seriously, and it survives — but only if the
// session lookup is a JOIN rather than a second call. `findForAuth` below is
// ONE round trip: the user row and their matching session row together. Two
// sequential awaits here would genuinely be a regression against Mongo, so if
// you refactor this, keep it one query.
//
// It is also strictly less data over the wire than before: Mongo shipped the
// whole document including all three session subdocuments and the dead `room`
// subtree on every single request.

import { and, eq, getTableColumns, ilike, isNotNull, ne, or, sql } from "drizzle-orm";

import {
  DEFAULT_FLOOR_ID,
  DEFAULT_LAYOUT_ID,
  DEFAULT_WALLPAPER_ID,
  STARTER_STAGE,
  variantForUserId,
} from "../../config/schoolCatalog.js";
import { db } from "../client.js";
import { newId } from "../ids.js";
import { userSession, users } from "../schema.js";
import type { Tx } from "../client.js";
import type { User, UserSession } from "../schema.js";

/**
 * Every column except the password hash — the `.select("-password")` this
 * codebase writes on almost every read.
 *
 * getTableColumns(), not a spread of `users` itself: a Drizzle table object
 * carries internal metadata alongside its columns, and spreading it hands
 * those to the query builder as if they were fields.
 */
const { password: _password, ...PUBLIC_COLUMNS } = getTableColumns(users);

export type SafeUser = Omit<User, "password">;

/**
 * Resolve a bearer token's claims to a user AND the session it names, in one
 * query. `session` is null when the token carries no jti (a legacy token) or
 * when its session row is gone — signed out, evicted, or revoked. The caller
 * tells those two cases apart, because they produce different error codes.
 */
export async function findForAuth(
  userId: string,
  jti: string | null,
  tx: Tx = db(),
): Promise<{ user: SafeUser; session: UserSession | null } | null> {
  const rows = await tx
    .select({ user: PUBLIC_COLUMNS, session: userSession })
    .from(users)
    .leftJoin(
      userSession,
      // The jti predicate belongs in the JOIN, not in WHERE. In WHERE it would
      // turn the LEFT JOIN into an inner one and a user with no matching
      // session would vanish entirely — reported to the client as "invalid
      // token" rather than the accurate "this session was signed out".
      and(eq(userSession.userId, users.id), jti ? eq(userSession.jti, jti) : sql`false`),
    )
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return { user: row.user, session: row.session ?? null };
}

export async function findById(userId: string, tx: Tx = db()): Promise<SafeUser | null> {
  const [row] = await tx.select(PUBLIC_COLUMNS).from(users).where(eq(users.id, userId));
  return row ?? null;
}

/** Includes the password hash. Only for the login and password-change paths. */
export async function findByIdWithPassword(userId: string, tx: Tx = db()): Promise<User | null> {
  const [row] = await tx.select().from(users).where(eq(users.id, userId));
  return row ?? null;
}

/**
 * Login lookup: one identifier, three possible columns.
 *
 * Note what is NOT here. password.controller.js builds a case-insensitive
 * RegExp from request input, which the improvement backlog flags twice — as a
 * ReDoS risk and because a regex cannot use the unique index, making every
 * login attempt a collection scan. Both problems are gone: `email` is stored
 * lowercased, so an equality match is correct AND index-backed.
 *
 * The whole class of NoSQL operator injection goes with it. auth.controller.js
 * and password.controller.js contain hand-written defences against a body
 * value arriving as `{"$ne": null}` and being spliced into a query object.
 * Parameterised SQL makes those defences dead code — remove them deliberately
 * when porting those files, rather than leaving them to rot as cargo cult.
 */
export async function findByIdentifier(identifier: string, tx: Tx = db()): Promise<User | null> {
  const value = identifier.trim();
  const [row] = await tx
    .select()
    .from(users)
    .where(
      or(
        eq(users.username, value),
        eq(users.email, value.toLowerCase()),
        eq(users.phoneNumber, value),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findByPhone(phoneNumber: string, tx: Tx = db()): Promise<User | null> {
  const [row] = await tx.select().from(users).where(eq(users.phoneNumber, phoneNumber)).limit(1);
  return row ?? null;
}

/**
 * Is this phone number taken by somebody else?
 *
 * The `ne(id)` is what makes re-verifying your own number legal.
 */
export async function phoneTakenByOther(
  phoneNumber: string,
  selfId: string,
  tx: Tx = db(),
): Promise<boolean> {
  const [row] = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.phoneNumber, phoneNumber), ne(users.id, selfId)))
    .limit(1);
  return Boolean(row);
}

/**
 * Spend one phone-verification attempt, atomically, BEFORE the code is graded.
 *
 * The attempt limit is the only thing standing between a 6-digit code and a
 * brute force, so the check and the increment have to be one statement. Done
 * as read-attempts / compare / save on the user doc, 40 parallel guesses all
 * read `attempts = 0` and all 40 were graded (found by test/api/auth.test.js).
 * With the `attempts < max` predicate inside the UPDATE, Postgres's row lock
 * serialises them and exactly `max` succeed.
 *
 *   "claimed"   an attempt was recorded; grade the code
 *   "exhausted" the ticket is live but every attempt is spent
 *   "unknown"   no live ticket by that hash (expired, spent, or never issued)
 */
export async function claimPhoneVerificationAttempt(
  ticketHash: string,
  maxAttempts: number,
  tx: Tx = db(),
): Promise<"claimed" | "exhausted" | "unknown"> {
  const live = and(
    eq(users.phoneVerificationTicketHash, ticketHash),
    sql`${users.phoneVerificationTicketExpires} > now()`,
  );
  const claimed = await tx
    .update(users)
    .set({ phoneVerificationAttempts: sql`${users.phoneVerificationAttempts} + 1` })
    .where(and(live, sql`${users.phoneVerificationAttempts} < ${maxAttempts}`))
    .returning({ id: users.id });
  if (claimed.length) return "claimed";

  const [exists] = await tx.select({ id: users.id }).from(users).where(live).limit(1);
  return exists ? "exhausted" : "unknown";
}

export interface CreateUserInput {
  username: string;
  password: string;
  email?: string | null;
  phoneNumber?: string | null;
  pendingRegistration?: boolean;
  legalConsentVersion?: string | null;
  legalConsentTermsAcceptedAt?: Date | null;
  legalConsentDataAcceptedAt?: Date | null;
}

/**
 * Create an account.
 *
 * The school defaults are supplied HERE rather than as column defaults in the
 * schema: they are derived constants (SCHOOL_LAYOUTS[0].id and friends), and
 * copying a derived value into DDL guarantees the two drift the first time the
 * catalog is reordered. config/schoolCatalog.js stays the single source.
 *
 * `variantId` is overwritten by the caller with a value derived from the new
 * user's id — it is not a preference, it is what stops two players sharing a
 * floorplan — but it needs a non-null value at insert time.
 */
export async function create(input: CreateUserInput, tx: Tx = db()): Promise<User> {
  const id = newId();
  const [row] = await tx
    .insert(users)
    .values({
      id,
      username: input.username,
      password: input.password,
      // Blank means "no email", i.e. NULL. Stored as "" it is a real value under
      // the unique index, and every later signup with a blank email collided
      // with the first one.
      email: input.email?.trim().toLowerCase() || null,
      phoneNumber: input.phoneNumber ?? null,
      pendingRegistration: input.pendingRegistration ?? false,
      legalConsentVersion: input.legalConsentVersion ?? null,
      legalConsentTermsAcceptedAt: input.legalConsentTermsAcceptedAt ?? null,
      legalConsentDataAcceptedAt: input.legalConsentDataAcceptedAt ?? null,
      schoolStage: STARTER_STAGE,
      schoolLayoutId: DEFAULT_LAYOUT_ID,
      schoolWallpaperId: DEFAULT_WALLPAPER_ID,
      schoolFloorId: DEFAULT_FLOOR_ID,
      // Derived from the id at creation. Mongo assigned this lazily on first
      // school load (via a $exists:false guard); a NOT NULL column has no
      // "absent" state to guard on, so it is settled here once instead.
      schoolVariantId: variantForUserId(id),
    })
    .returning();

  if (!row) throw new Error("[users] create inserted no row");
  return row;
}

/**
 * Delete an abandoned signup so the same person can retry the same username
 * after a typo.
 *
 * Guarded on `pending_registration` for the reason models/User.js spells out:
 * an unverified account with a phone number might be a years-old account
 * part-way through enrolment, and deleting that would be catastrophic.
 */
export async function deletePendingRegistration(userId: string, tx: Tx = db()): Promise<number> {
  const result = await tx
    .delete(users)
    .where(and(eq(users.id, userId), eq(users.pendingRegistration, true)));
  return result.rowCount ?? 0;
}

/** Generic partial update. Callers pass only the columns they mean to change. */
export async function update(
  userId: string,
  patch: Partial<Omit<User, "id">>,
  tx: Tx = db(),
): Promise<SafeUser | null> {
  if (Object.keys(patch).length === 0) return findById(userId, tx);
  const [row] = await tx.update(users).set(patch).where(eq(users.id, userId)).returning(PUBLIC_COLUMNS);
  return row ?? null;
}

export async function setBanned(userId: string, banned: boolean, tx: Tx = db()): Promise<number> {
  const result = await tx.update(users).set({ banned }).where(eq(users.id, userId));
  return result.rowCount ?? 0;
}

export async function touchLastActive(userId: string, tx: Tx = db()): Promise<void> {
  await tx.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, userId));
}

/**
 * Raise total listening time; never lower it.
 *
 * GREATEST inside the UPDATE is what makes "only ever increase" hold under two
 * syncs racing from two tabs. The Mongo version read the stored value and then
 * wrote the new one, so the older sync could land second and roll time back.
 *
 * Floored: the column is an integer, and a client reporting 1234.5 seconds must
 * not turn a routine sync into a query error.
 *
 * @returns the stored total after the call, or null if the user is gone.
 */
export async function raiseListeningSeconds(
  userId: string,
  seconds: number,
  tx: Tx = db(),
): Promise<number | null> {
  const value = Math.max(0, Math.floor(seconds));
  const [row] = await tx
    .update(users)
    .set({ totalListeningSeconds: sql`GREATEST(${users.totalListeningSeconds}, ${value})` })
    .where(eq(users.id, userId))
    .returning({ total: users.totalListeningSeconds });
  return row?.total ?? null;
}

/**
 * Player search, for the admin roster and the "visit someone's school" feature.
 *
 * ILIKE with an escaped pattern replaces `new RegExp(escapeRegex(q), "i")`.
 * The `%` wrapping is added here rather than by the caller so a caller cannot
 * accidentally pass a bare `%` and match everyone.
 */
export async function search(
  query: string,
  options: { excludeUserId?: string; limit?: number } = {},
  tx: Tx = db(),
): Promise<SafeUser[]> {
  // Escape LIKE's own wildcards so a user searching for "50%" gets a literal
  // match rather than a prefix scan of the whole table.
  const pattern = `%${query.replace(/([\\%_])/g, "\\$1")}%`;

  const matches = or(
    ilike(users.username, pattern),
    ilike(users.nickname, pattern),
    ilike(users.email, pattern),
  );

  return tx
    .select(PUBLIC_COLUMNS)
    .from(users)
    .where(options.excludeUserId ? and(matches, ne(users.id, options.excludeUserId)) : matches)
    .limit(options.limit ?? 25);
}

/** Admin roster pagination. Returns the page and the total in one round trip. */
export async function page(
  offset: number,
  limit: number,
  tx: Tx = db(),
): Promise<{ rows: SafeUser[]; total: number }> {
  const rows = await tx
    .select({ ...PUBLIC_COLUMNS, total: sql<number>`count(*) OVER ()`.mapWith(Number) })
    .from(users)
    .orderBy(sql`${users.createdAt} DESC`)
    .offset(offset)
    .limit(limit);

  const total = rows[0]?.total ?? 0;
  return { rows: rows.map(({ total: _total, ...user }) => user), total };
}

/** Accounts holding a given SKU — support and analytics. */
export async function countWithPhone(tx: Tx = db()): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(users)
    .where(isNotNull(users.phoneNumber));
  return row?.n ?? 0;
}
