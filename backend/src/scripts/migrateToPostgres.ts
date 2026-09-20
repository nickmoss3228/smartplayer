// scripts/migrateToPostgres.ts
//
// Copy from MongoDB into PostgreSQL. STORY CONTENT ONLY unless told otherwise.
//
//   npx tsx src/scripts/migrateToPostgres.ts                # dry run, content only (default)
//   npx tsx src/scripts/migrateToPostgres.ts --commit       # write content
//   npx tsx src/scripts/migrateToPostgres.ts --verify       # compare, write nothing
//   npx tsx src/scripts/migrateToPostgres.ts --all ...      # also users, progress, payments, audit, feedback
//
// Why content only: the app had not launched when this was written, and the
// decision was that everyone re-registers. Story content — above all the
// hand-placed time markers, which can only be authored against a waveform — is
// the one thing that cannot be regenerated. The rest is kept behind --all
// because it works and is tested, not because it is expected to be run.
//
// A full pre-migration backup of every database exists; see
// scripts/backupMongo.ts. This script is not the backup.
//
// ── Dry run is the DEFAULT here, unlike the other scripts in this directory ──
//
// backfillPartMarkers.js and friends take `--dry-run` as an opt-in. This one
// inverts that on purpose: it is the single most consequential script in the
// repo, and the failure mode of a mistyped flag is "production data landed in
// the wrong database". Making the writing direction the one you have to ask
// for costs one word and removes that whole category of accident.
//
// ── Properties ─────────────────────────────────────────────────────────────
//
// RAW COLLECTIONS, NOT MODELS. Documents carry fields their Mongoose schemas
// never declared, and a model would silently drop them.
//
// IDS ARE REMAPPED DETERMINISTICALLY. Postgres keys are uuids; every Mongo _id
// becomes derivedId("mongo", <collection>, <hex>). The same _id always maps to
// the same uuid, so references between collections still line up and a second
// run rewrites the same rows instead of inserting duplicates. Stories also
// keep their original hex in story.legacy_mongo_id, for tracing back to the
// backup.
//
// IDEMPOTENT. Every write is ON CONFLICT DO UPDATE, so a run that dies halfway
// can simply be run again. No TRUNCATE anywhere: this script must never be the
// reason data disappears.

import mongoose from "mongoose";

import { closeDb, db, isConfigured } from "../db/client.js";
import { parseLevelKey } from "../db/repos/progress.repo.js";
import {
  adminAuditLog,
  feedback,
  partMarkers,
  payment,
  paymentItem,
  progress,
  progressLevelResult,
  story,
  storyPart,
  storyPartMarker,
  storyPartQuiz,
  storyPartVocab,
  storyProgress,
  storyVisibility,
  userEntitlement,
  userLearnedWord,
  userSession,
  users,
} from "../db/schema.js";
import { derivedId, newId } from "../db/ids.js";

// ── Flags ───────────────────────────────────────────────────────────────────

const argv = new Set(process.argv.slice(2));
const COMMIT = argv.has("--commit");
const VERIFY_ONLY = argv.has("--verify");
const FORCE = argv.has("--force");
/** Also migrate accounts, progress, payments, audit log and feedback. */
const ALL = argv.has("--all");

/** Rows per INSERT. Large enough to be fast, small enough to keep parameters
 *  under Postgres's 65535-per-statement ceiling on a 50-column table. */
const BATCH = 500;

// ── Small helpers ───────────────────────────────────────────────────────────

const HEX_24 = /^[0-9a-f]{24}$/;

function toHex(value: unknown): string {
  return String(
    value && typeof value === "object" && "toHexString" in value
      ? (value as { toHexString: () => string }).toHexString()
      : value,
  );
}

/**
 * The uuid a document's _id becomes. `collection` is the MONGO collection name
 * the _id belongs to, so a user's id and a payment's id can never map to the
 * same uuid even if their hex happened to match.
 *
 * Aborts on a malformed _id rather than inventing one: every reference to that
 * document would silently point at nothing.
 */
function mongoId(collection: string, value: unknown): string {
  const hex = toHex(value);
  if (!HEX_24.test(hex)) {
    throw new Error(`[etl] ${collection}: _id "${hex}" is not an ObjectId — refusing to guess`);
  }
  return derivedId("mongo", collection, hex);
}

/** An optional reference to a document in `collection`, mapped the same way. */
function mongoRef(collection: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const hex = toHex(value);
  return HEX_24.test(hex) ? derivedId("mongo", collection, hex) : null;
}

function asDate(value: unknown, fallback: Date | null = null): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function asInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function asNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asStr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStrOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStrArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function asIntArray(value: unknown): number[] {
  return Array.isArray(value) ? value.map((v) => asInt(v)).filter(Number.isFinite) : [];
}

/** Constrain a value to a known set, falling back when the data disagrees. */
function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function nullableOneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const TIERS = ["bronze", "silver", "gold", "platinum", "crown"] as const;

/** "YYYY-MM-DD" straight through; anything else becomes null. */
function asDateString(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

type Doc = Record<string, unknown>;

function sub(doc: Doc, key: string): Doc {
  const value = doc[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Doc) : {};
}

function arr(doc: Doc, key: string): Doc[] {
  const value = doc[key];
  return Array.isArray(value) ? (value.filter((v) => v && typeof v === "object") as Doc[]) : [];
}

// ── Progress reporting ──────────────────────────────────────────────────────

const tally: Record<string, number> = {};

function count(table: string, n: number): void {
  tally[table] = (tally[table] ?? 0) + n;
}

async function insertBatched<T extends Record<string, unknown>>(
  table: Parameters<ReturnType<typeof db>["insert"]>[0],
  rows: T[],
  conflict: { target: unknown[]; set?: Record<string, unknown> },
  label: string,
): Promise<void> {
  if (rows.length === 0) return;
  count(label, rows.length);
  if (!COMMIT) return;

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const query = db()
      .insert(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .values(chunk as any);

    await (conflict.set
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query.onConflictDoUpdate({ target: conflict.target as any, set: conflict.set as any })
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query.onConflictDoNothing({ target: conflict.target as any })
    ).execute();
  }
}

// ── users ───────────────────────────────────────────────────────────────────

/**
 * Copy users, their sessions and their learned words.
 *
 * RETURNS the entitlement rows rather than writing them: user_entitlement
 * .payment_id references payment(id), and payments cannot be copied until
 * their users exist. The data is genuinely cyclic between the two tables, so
 * one of the three has to be a separate pass — see migrateEntitlements.
 */
async function migrateUsers(
  mongo: mongoose.mongo.Db,
  defaults: SchoolDefaults,
): Promise<(typeof userEntitlement.$inferInsert)[]> {
  const docs = (await mongo.collection("users").find({}).toArray()) as unknown as Doc[];

  const userRows: (typeof users.$inferInsert)[] = [];
  const sessionRows: (typeof userSession.$inferInsert)[] = [];
  const entitlementRows: (typeof userEntitlement.$inferInsert)[] = [];
  const learnedRows: (typeof userLearnedWord.$inferInsert)[] = [];

  for (const doc of docs) {
    const id = mongoId("users", doc._id);
    const wallet = sub(doc, "wallet");
    const streak = sub(doc, "streak");
    const ach = sub(doc, "achievements");
    const consent = sub(doc, "legalConsent");
    const character = sub(doc, "character");
    const equipped = sub(character, "equipped");
    const school = sub(doc, "school");
    const signals = sub(doc, "loginSignals");

    userRows.push({
      id,
      username: asStr(doc.username),
      // Mongo distinguishes an explicit null from a missing field; both mean
      // "no email" here, and both must become SQL NULL so the unique index
      // does not collide them.
      email: asStrOrNull(doc.email)?.toLowerCase() ?? null,
      password: asStr(doc.password),
      phoneNumber: asStrOrNull(doc.phoneNumber),
      isPhoneVerified: Boolean(doc.isPhoneVerified),
      pendingRegistration: Boolean(doc.pendingRegistration),
      banned: Boolean(doc.banned),

      legalConsentVersion: asStrOrNull(consent.version),
      legalConsentTermsAcceptedAt: asDate(consent.termsAcceptedAt),
      legalConsentDataAcceptedAt: asDate(consent.dataConsentAcceptedAt),

      phoneVerificationCodeHash: asStrOrNull(doc.phoneVerificationCodeHash),
      phoneVerificationExpires: asDate(doc.phoneVerificationExpires),
      phoneVerificationAttempts: asInt(doc.phoneVerificationAttempts),
      phoneVerificationLastSentAt: asDate(doc.phoneVerificationLastSentAt),
      phoneVerificationTicketHash: asStrOrNull(doc.phoneVerificationTicketHash),
      phoneVerificationTicketExpires: asDate(doc.phoneVerificationTicketExpires),

      passwordResetToken: asStrOrNull(doc.passwordResetToken),
      passwordResetExpires: asDate(doc.passwordResetExpires),

      createdAt: asDate(doc.createdAt, new Date())!,
      lastActiveAt: asDate(doc.lastActiveAt, new Date())!,

      avatar: asStr(doc.avatar, "cat"),
      nickname: asStrOrNull(doc.nickname),
      totalListeningSeconds: asInt(doc.totalListeningSeconds),

      // Clamped at zero: the schema's CHECK would reject a negative balance,
      // and a negative balance in the source is corruption we should not carry
      // forward silently. --verify compares sums, so any clamping shows up.
      bitAward: Math.max(0, asInt(wallet.bitAward)),
      bitWord: Math.max(0, asInt(wallet.bitWord)),
      bitPhrase: Math.max(0, asInt(wallet.bitPhrase)),

      streakCurrent: asInt(streak.current),
      streakLongest: asInt(streak.longest),
      streakLastSubmittedDate: asDateString(streak.lastSubmittedDate),

      achievementListeningTime: nullableOneOf(ach.listeningTime, TIERS),
      achievementQuestionsAnswered: nullableOneOf(ach.questionsAnswered, TIERS),
      achievementStudyStreak: nullableOneOf(ach.studyStreak, TIERS),
      achievementStoriesListened: nullableOneOf(ach.storiesListened, TIERS),
      achievementWordsLearned: nullableOneOf(ach.wordsLearned, TIERS),

      characterSkinTone: asStr(character.skinTone, "#f2c48d"),
      characterOwnedItemIds: asStrArray(character.ownedItemIds),
      characterEquippedHairstyle: asStrOrNull(equipped.hairstyle),
      characterEquippedOutfit: asStrOrNull(equipped.outfit),
      characterEquippedHat: asStrOrNull(equipped.hat),

      schoolOwnedRoomIds: asStrArray(school.ownedRoomIds),
      schoolStage: Math.max(0, asInt(school.stage)),
      // A document written before these fields existed has none of them.
      // Mongoose papered over that with defaults at read time; the columns are
      // NOT NULL, so the fallback has to happen here instead.
      schoolLayoutId: asStr(school.layoutId, defaults.layoutId),
      schoolWallpaperId: asStr(school.wallpaperId, defaults.wallpaperId),
      schoolFloorId: asStr(school.floorId, defaults.floorId),
      schoolVariantId: asStr(school.variantId, defaults.variantId),

      blockedLoginCount: asInt(signals.blockedLoginCount),
      lastBlockedAt: asDate(signals.lastBlockedAt),
      recentIpPrefixes: arr(signals, "recentIpPrefixes").map((row) => ({
        prefix: asStr(row.prefix),
        firstSeenAt: (asDate(row.firstSeenAt) ?? new Date()).toISOString(),
        lastSeenAt: (asDate(row.lastSeenAt) ?? new Date()).toISOString(),
        count: asInt(row.count, 1),
      })),
    });

    // ── sessions[] -> user_session ──
    // Subdocuments had `_id: false`, so there is no id to preserve; these are
    // minted. Nothing outside the document ever referenced them.
    for (const row of arr(doc, "sessions")) {
      const jti = asStrOrNull(row.jti);
      const deviceId = asStrOrNull(row.deviceId);
      if (!jti || !deviceId) continue; // both are required by the schema
      sessionRows.push({
        id: newId(),
        userId: id,
        jti,
        deviceId,
        deviceLabel: asStrOrNull(row.deviceLabel),
        ipPrefix: asStrOrNull(row.ipPrefix),
        createdAt: asDate(row.createdAt, new Date())!,
        lastSeenAt: asDate(row.lastSeenAt, new Date())!,
      });
    }

    // ── entitlements[] -> user_entitlement ──
    // Deduplicated by sku on the way in: UNIQUE (user_id, sku) is a NEW
    // constraint, and Mongo could in principle hold two rows for one sku.
    // Last one wins, matching what accessFor() effectively did on read.
    const bySku = new Map<string, Doc>();
    for (const row of arr(doc, "entitlements")) {
      const sku = asStrOrNull(row.sku);
      if (sku) bySku.set(sku, row);
    }
    for (const [sku, row] of bySku) {
      entitlementRows.push({
        id: newId(),
        userId: id,
        sku,
        grantedAt: asDate(row.grantedAt, new Date())!,
        expiresAt: asDate(row.expiresAt),
        source: oneOf(row.source, ["purchase", "admin", "promo"] as const, "purchase"),
        paymentId: mongoRef("payments", row.paymentId),
      });
    }

    // ── learnedWords[] -> user_learned_word ──
    for (const word of new Set(asStrArray(doc.learnedWords).map((w) => w.toLowerCase()))) {
      if (word) learnedRows.push({ userId: id, word });
    }
  }

  await insertBatched(users, userRows, { target: [users.id], set: passthrough(userRows[0]) }, "users");
  await insertBatched(userSession, sessionRows, { target: [userSession.jti] }, "user_session");
  await insertBatched(
    userLearnedWord,
    learnedRows,
    { target: [userLearnedWord.userId, userLearnedWord.word] },
    "user_learned_word",
  );

  return entitlementRows;
}

/**
 * The third pass, run after payments exist.
 *
 * An entitlement naming a payment that is not in the ledger would fail the
 * foreign key. That is a real integrity problem worth surfacing rather than
 * hiding, but it must not abort a migration over a single orphan: the
 * entitlement is what the customer can actually USE, and the payment id on it
 * is provenance. So an unresolvable reference is nulled and reported, and the
 * access survives.
 */
async function migrateEntitlements(
  rows: (typeof userEntitlement.$inferInsert)[],
): Promise<void> {
  const referenced = [...new Set(rows.map((r) => r.paymentId).filter((v): v is string => Boolean(v)))];

  const known = new Set<string>();
  if (referenced.length && COMMIT) {
    const found = await db()
      .select({ id: payment.id })
      .from(payment)
      .where(inArray(payment.id, referenced));
    for (const row of found) known.add(row.id);
  }

  let orphaned = 0;
  const resolved = rows.map((row) => {
    if (!row.paymentId) return row;
    if (!COMMIT || known.has(row.paymentId)) return row;
    orphaned += 1;
    console.warn(
      `[etl] entitlement ${row.sku} for user ${row.userId} references payment ` +
        `${row.paymentId}, which is not in the ledger — keeping the entitlement, dropping the link`,
    );
    return { ...row, paymentId: null };
  });

  if (orphaned > 0) {
    console.warn(`[etl] ${orphaned} entitlement(s) had an unresolvable payment reference.`);
  }

  await insertBatched(
    userEntitlement,
    resolved,
    { target: [userEntitlement.userId, userEntitlement.sku] },
    "user_entitlement",
  );
}

/** Build an ON CONFLICT DO UPDATE set that rewrites every column but the id. */
function passthrough(sample: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!sample) return {};
  const set: Record<string, unknown> = {};
  for (const key of Object.keys(sample)) {
    if (key === "id") continue;
    set[key] = excluded(key);
  }
  return set;
}

// Drizzle exposes the EXCLUDED pseudo-table only through raw SQL.
import { inArray, sql } from "drizzle-orm";
function excluded(column: string) {
  // The column names here come from our own schema objects, never from data.
  return sql.raw(`excluded."${toSnake(column)}"`);
}
function toSnake(name: string): string {
  return name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

// ── the rest ────────────────────────────────────────────────────────────────

async function migratePayments(mongo: mongoose.mongo.Db): Promise<void> {
  const docs = (await mongo.collection("payments").find({}).toArray()) as unknown as Doc[];

  const paymentRows: (typeof payment.$inferInsert)[] = [];
  const itemRows: (typeof paymentItem.$inferInsert)[] = [];

  for (const doc of docs) {
    const id = mongoId("payments", doc._id);
    const userId = mongoRef("users", doc.userId);
    if (!userId) {
      throw new Error(`[etl] payment ${id} has no usable userId — refusing to orphan a ledger row`);
    }

    paymentRows.push({
      id,
      userId,
      provider: asStr(doc.provider, "fake"),
      providerPaymentId: asStrOrNull(doc.providerPaymentId),
      idempotenceKey: asStrOrNull(doc.idempotenceKey),
      status: oneOf(
        doc.status,
        ["pending", "succeeded", "canceled", "failed", "refunded"] as const,
        "pending",
      ),
      amountMinor: asInt(doc.amountMinor),
      currency: asStr(doc.currency, "RUB"),
      confirmationUrl: asStrOrNull(doc.confirmationUrl),
      cancellationReason: asStrOrNull(doc.cancellationReason),
      paidAt: asDate(doc.paidAt),
      grantedAt: asDate(doc.grantedAt),
      grantAppliedAt: asDate(doc.grantAppliedAt),
      raw: doc.raw ?? null,
      createdAt: asDate(doc.createdAt, new Date())!,
      updatedAt: asDate(doc.updatedAt, new Date())!,
    });

    arr(doc, "items").forEach((item, ordinal) => {
      itemRows.push({
        id: newId(),
        paymentId: id,
        ordinal,
        sku: asStr(item.sku),
        amountMinor: asInt(item.amountMinor),
        durationDays: item.durationDays === null || item.durationDays === undefined
          ? null
          : asInt(item.durationDays),
      });
    });
  }

  await insertBatched(payment, paymentRows, { target: [payment.id], set: passthrough(paymentRows[0]) }, "payment");
  await insertBatched(paymentItem, itemRows, { target: [paymentItem.paymentId, paymentItem.ordinal] }, "payment_item");
}

async function migrateProgress(mongo: mongoose.mongo.Db): Promise<void> {
  const docs = (await mongo.collection("progresses").find({}).toArray()) as unknown as Doc[];

  const progressRows: (typeof progress.$inferInsert)[] = [];
  const resultRows: (typeof progressLevelResult.$inferInsert)[] = [];
  let unparsedKeys = 0;

  for (const doc of docs) {
    const id = mongoId("progresses", doc._id);
    const userId = mongoRef("users", doc.userId);
    if (!userId) continue; // orphaned progress is not worth failing the run over

    progressRows.push({
      id,
      userId,
      difficulty: oneOf(doc.difficulty, DIFFICULTIES, "easy"),
      completedLevels: asIntArray(doc.completedLevels),
      currentLevel: asInt(doc.currentLevel, 1),
      createdAt: asDate(doc.createdAt, new Date())!,
      updatedAt: asDate(doc.updatedAt, new Date())!,
    });

    // levelResults: a Map keyed `${storyId}:${partNumber}`. The BSON driver
    // hands it back as a plain object.
    const results = sub(doc, "levelResults");
    for (const [key, value] of Object.entries(results)) {
      const parsed = parseLevelKey(key);
      if (!parsed) {
        unparsedKeys += 1;
        console.warn(`[etl] progress ${id}: cannot parse levelResults key "${key}" — skipped`);
        continue;
      }
      const result = (value && typeof value === "object" ? value : {}) as Doc;
      resultRows.push({
        progressId: id,
        storyId: parsed.storyId,
        partNumber: parsed.partNumber,
        completed: Boolean(result.completed),
        correctAnswers: asInt(result.correctAnswers),
        totalQuestions: asInt(result.totalQuestions),
        completedAt: asDate(result.completedAt),
      });
    }
  }

  if (unparsedKeys > 0) {
    console.warn(`[etl] ${unparsedKeys} levelResults key(s) could not be parsed. Investigate before committing.`);
  }

  await insertBatched(progress, progressRows, { target: [progress.id], set: passthrough(progressRows[0]) }, "progress");
  await insertBatched(
    progressLevelResult,
    resultRows,
    {
      target: [progressLevelResult.progressId, progressLevelResult.storyId, progressLevelResult.partNumber],
    },
    "progress_level_result",
  );
}

async function migrateStoryProgress(mongo: mongoose.mongo.Db): Promise<void> {
  const docs = (await mongo.collection("storyprogresses").find({}).toArray()) as unknown as Doc[];
  const rows: (typeof storyProgress.$inferInsert)[] = [];

  for (const doc of docs) {
    const userId = mongoRef("users", doc.userId);
    if (!userId) continue;
    rows.push({
      id: mongoId("storyprogresses", doc._id),
      userId,
      difficulty: oneOf(doc.difficulty, DIFFICULTIES, "easy"),
      storyId: asStr(doc.storyId),
      completedParts: asIntArray(doc.completedParts),
      currentPart: asInt(doc.currentPart, 1),
      createdAt: asDate(doc.createdAt, new Date())!,
      updatedAt: asDate(doc.updatedAt, new Date())!,
    });
  }

  await insertBatched(storyProgress, rows, { target: [storyProgress.id], set: passthrough(rows[0]) }, "story_progress");
}

async function migrateStories(mongo: mongoose.mongo.Db): Promise<void> {
  const docs = (await mongo.collection("stories").find({}).toArray()) as unknown as Doc[];

  const storyRows: (typeof story.$inferInsert)[] = [];
  const partRows: (typeof storyPart.$inferInsert)[] = [];
  const vocabRows: (typeof storyPartVocab.$inferInsert)[] = [];
  const quizRows: (typeof storyPartQuiz.$inferInsert)[] = [];
  const markerRows: (typeof storyPartMarker.$inferInsert)[] = [];

  for (const doc of docs) {
    const id = mongoId("stories", doc._id);
    const localized = sub(doc, "localized");
    const title = sub(localized, "title");
    const description = sub(localized, "description");

    storyRows.push({
      id,
      difficulty: oneOf(doc.difficulty, DIFFICULTIES, "easy"),
      storyId: asStr(doc.storyId),
      storyName: asStr(doc.storyName),
      description: asStr(doc.description),
      titleEn: asStr(title.en),
      titleRu: asStr(title.ru),
      descriptionEn: asStr(description.en),
      descriptionRu: asStr(description.ru),
      characterIcon: asStr(doc.characterIcon, "📖"),
      // The CHECK is 1..20. A story outside that is data we should look at
      // rather than silently clamp, so let the constraint reject it.
      totalParts: asInt(doc.totalParts, 1),
      category: nullableOneOf(doc.category, ["general", "news"] as const),
      coverUrl: asStrOrNull(doc.coverUrl),
      published: Boolean(doc.published),
      legacyMongoId: toHex(doc._id),
      createdAt: asDate(doc.createdAt, new Date())!,
      updatedAt: asDate(doc.updatedAt, new Date())!,
    });

    for (const part of arr(doc, "parts")) {
      // DERIVED, not minted: story_part is the only table here whose id is
      // referenced by other rows but has no counterpart id in Mongo. See
      // derivedId() for why a random one breaks a second run.
      const partPk = derivedId("story_part", id, asInt(part.partNumber));
      partRows.push({
        id: partPk,
        storyPk: id,
        partNumber: asInt(part.partNumber),
        title: asStr(part.title),
        audioUrl: asStrOrNull(part.audioUrl),
        helpAudio: asStrArray(part.helpAudio),
        comicUrl: asStrOrNull(part.comicUrl),
      });

      const pushVocab = (entries: Doc[], kind: "vocabulary" | "phrasal") => {
        entries.forEach((entry, ordinal) => {
          vocabRows.push({
            id: derivedId("story_part_vocab", partPk, kind, ordinal),
            partPk,
            kind,
            ordinal,
            word: asStr(entry.word),
            definition: asStr(entry.definition),
            audioKey: asStr(entry.audioKey),
            audioUrl: asStrOrNull(entry.audioUrl),
          });
        });
      };
      pushVocab(arr(part, "vocabulary"), "vocabulary");
      pushVocab(arr(part, "phrasalVerbs"), "phrasal");

      arr(part, "quiz").forEach((q, ordinal) => {
        const audio = sub(q, "audio");
        quizRows.push({
          id: derivedId("story_part_quiz", partPk, ordinal),
          partPk,
          ordinal,
          question: asStr(q.question),
          options: asStrArray(q.options),
          correctAnswer: asInt(q.correctAnswer),
          referenceTime: asNum(q.referenceTime),
          audioFast: asStrOrNull(audio.fast),
          audioSlow: asStrOrNull(audio.slow),
        });
      });

      arr(part, "timeMarkers").forEach((m, ordinal) => {
        markerRows.push({
          id: derivedId("story_part_marker", partPk, ordinal),
          partPk,
          ordinal,
          time: asNum(m.time),
          label: asStr(m.label),
          color: asStr(m.color, "red"),
        });
      });
    }
  }

  await insertBatched(story, storyRows, { target: [story.id], set: passthrough(storyRows[0]) }, "story");
  await insertBatched(storyPart, partRows, { target: [storyPart.storyPk, storyPart.partNumber] }, "story_part");
  await insertBatched(storyPartVocab, vocabRows, { target: [storyPartVocab.partPk, storyPartVocab.kind, storyPartVocab.ordinal] }, "story_part_vocab");
  await insertBatched(storyPartQuiz, quizRows, { target: [storyPartQuiz.partPk, storyPartQuiz.ordinal] }, "story_part_quiz");
  await insertBatched(storyPartMarker, markerRows, { target: [storyPartMarker.partPk, storyPartMarker.ordinal] }, "story_part_marker");
}

/** The two identity-keyed story side tables. Content, so always migrated. */
async function migrateContentSideTables(mongo: mongoose.mongo.Db): Promise<void> {
  const markerDocs = (await mongo.collection("partmarkers").find({}).toArray()) as unknown as Doc[];
  const markerRows = markerDocs.map((doc) => ({
    difficulty: oneOf(doc.difficulty, DIFFICULTIES, "easy"),
    storyId: asStr(doc.storyId),
    partNumber: asInt(doc.partNumber),
    timeMarkers: arr(doc, "timeMarkers").map((m) => ({
      time: asNum(m.time),
      label: asStr(m.label),
      color: asStr(m.color, "red"),
    })),
    updatedAt: asDate(doc.updatedAt, new Date())!,
  }));
  await insertBatched(
    partMarkers,
    markerRows,
    { target: [partMarkers.difficulty, partMarkers.storyId, partMarkers.partNumber] },
    "part_markers",
  );

  const visDocs = (await mongo.collection("storyvisibilities").find({}).toArray()) as unknown as Doc[];
  const visRows = visDocs.map((doc) => ({
    difficulty: oneOf(doc.difficulty, DIFFICULTIES, "easy"),
    storyId: asStr(doc.storyId),
    hidden: Boolean(doc.hidden),
    updatedAt: asDate(doc.updatedAt, new Date())!,
  }));
  await insertBatched(
    storyVisibility,
    visRows,
    { target: [storyVisibility.difficulty, storyVisibility.storyId] },
    "story_visibility",
  );
}

/** Admin audit log and feedback. Only with --all. */
async function migrateAuditAndFeedback(mongo: mongoose.mongo.Db): Promise<void> {
  const auditDocs =(await mongo.collection("adminauditlogs").find({}).toArray()) as unknown as Doc[];
  const auditRows = auditDocs.map((doc) => {
    const actor = sub(doc, "actor");
    return {
      id: mongoId("adminauditlogs", doc._id),
      actorName: asStr(actor.name, "unknown"),
      actorSessionId: asStrOrNull(actor.sessionId),
      actorTokenIssuedAt: asDate(actor.tokenIssuedAt),
      ip: asStrOrNull(doc.ip),
      userAgent: asStrOrNull(doc.userAgent),
      action: asStr(doc.action, "unknown"),
      method: oneOf(doc.method, ["POST", "PUT", "PATCH", "DELETE"] as const, "POST"),
      path: asStr(doc.path),
      targetType: asStrOrNull(doc.targetType),
      targetId: asStrOrNull(doc.targetId),
      statusCode: asInt(doc.statusCode, 200),
      outcome: oneOf(doc.outcome, ["success", "client_error", "server_error"] as const, "success"),
      durationMs: doc.durationMs === null || doc.durationMs === undefined ? null : asInt(doc.durationMs),
      summary: doc.summary ?? null,
      createdAt: asDate(doc.createdAt, new Date())!,
    };
  });
  await insertBatched(adminAuditLog, auditRows, { target: [adminAuditLog.id] }, "admin_audit_log");

  const feedbackDocs = (await mongo.collection("feedbacks").find({}).toArray()) as unknown as Doc[];
  const feedbackRows = feedbackDocs.map((doc) => ({
    id: mongoId("feedbacks", doc._id),
    name: asStr(doc.name, "anonymous"),
    message: asStr(doc.message),
    createdAt: asDate(doc.createdAt, new Date())!,
  }));
  await insertBatched(feedback, feedbackRows, { target: [feedback.id] }, "feedback");
}

// ── verification ────────────────────────────────────────────────────────────

/**
 * Compare the two databases.
 *
 * Content checks always run, and the marker counts are the ones that matter:
 * hand-placed markers are the one piece of story content nobody can
 * regenerate. With --all, the wallet and settled-payment SUMS are added — a
 * disagreement there is a financial discrepancy, not a rounding difference.
 * Those are skipped rather than reported, without --all: two zeros "matching"
 * on empty tables would be a pass that means nothing.
 */
async function verify(mongo: mongoose.mongo.Db): Promise<boolean> {
  const checks: { label: string; mongo: number; pg: number; critical: boolean }[] = [];

  const pairs: [string, string, boolean][] = [
    ["stories", "story", true],
    ["partmarkers", "part_markers", true],
    ["storyvisibilities", "story_visibility", true],
  ];
  if (ALL) {
    pairs.push(
      ["users", "users", true],
      ["progresses", "progress", false],
      ["storyprogresses", "story_progress", false],
      ["payments", "payment", true],
      ["adminauditlogs", "admin_audit_log", false],
      ["feedbacks", "feedback", false],
    );
  }

  for (const [collection, table, critical] of pairs) {
    const mongoCount = await mongo.collection(collection).countDocuments();
    const result = await db().execute<{ n: string }>(sql.raw(`SELECT count(*) AS n FROM "${table}"`));
    checks.push({ label: `${collection} -> ${table}`, mongo: mongoCount, pg: Number(result.rows[0]?.n ?? 0), critical });
  }

  // Nested content, counted element by element.
  const [nested] = (await mongo
    .collection("stories")
    .aggregate([
      { $unwind: { path: "$parts", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: null,
          parts: { $sum: 1 },
          markers: { $sum: { $size: { $ifNull: ["$parts.timeMarkers", []] } } },
          vocab: {
            $sum: {
              $add: [
                { $size: { $ifNull: ["$parts.vocabulary", []] } },
                { $size: { $ifNull: ["$parts.phrasalVerbs", []] } },
              ],
            },
          },
          quiz: { $sum: { $size: { $ifNull: ["$parts.quiz", []] } } },
        },
      },
    ])
    .toArray()) as unknown as { parts: number; markers: number; vocab: number; quiz: number }[];

  const pgNested = await db().execute<{ parts: string; markers: string; vocab: string; quiz: string }>(
    sql.raw(
      `SELECT (SELECT count(*) FROM story_part) parts, (SELECT count(*) FROM story_part_marker) markers,
              (SELECT count(*) FROM story_part_vocab) vocab, (SELECT count(*) FROM story_part_quiz) quiz`,
    ),
  );
  const pn = pgNested.rows[0];
  checks.push({ label: "story parts", mongo: nested?.parts ?? 0, pg: Number(pn?.parts ?? 0), critical: true });
  checks.push({ label: "time markers (in stories)", mongo: nested?.markers ?? 0, pg: Number(pn?.markers ?? 0), critical: true });
  checks.push({ label: "vocab + phrasal entries", mongo: nested?.vocab ?? 0, pg: Number(pn?.vocab ?? 0), critical: true });
  checks.push({ label: "quiz questions", mongo: nested?.quiz ?? 0, pg: Number(pn?.quiz ?? 0), critical: true });

  if (!ALL) return report(checks);

  // Wallet totals.
  const [walletAgg] = (await mongo
    .collection("users")
    .aggregate([
      {
        $group: {
          _id: null,
          bitAward: { $sum: "$wallet.bitAward" },
          bitWord: { $sum: "$wallet.bitWord" },
          bitPhrase: { $sum: "$wallet.bitPhrase" },
        },
      },
    ])
    .toArray()) as unknown as { bitAward: number; bitWord: number; bitPhrase: number }[];

  const pgWallet = await db().execute<{ a: string; w: string; p: string }>(
    sql.raw(
      `SELECT COALESCE(SUM(bit_award),0) a, COALESCE(SUM(bit_word),0) w, COALESCE(SUM(bit_phrase),0) p FROM users`,
    ),
  );
  const pw = pgWallet.rows[0];
  checks.push({ label: "SUM(bitAward)", mongo: walletAgg?.bitAward ?? 0, pg: Number(pw?.a ?? 0), critical: true });
  checks.push({ label: "SUM(bitWord)", mongo: walletAgg?.bitWord ?? 0, pg: Number(pw?.w ?? 0), critical: true });
  checks.push({ label: "SUM(bitPhrase)", mongo: walletAgg?.bitPhrase ?? 0, pg: Number(pw?.p ?? 0), critical: true });

  // Settled money.
  const [paidAgg] = (await mongo
    .collection("payments")
    .aggregate([{ $match: { status: "succeeded" } }, { $group: { _id: null, n: { $sum: 1 }, total: { $sum: "$amountMinor" } } }])
    .toArray()) as unknown as { n: number; total: number }[];

  const pgPaid = await db().execute<{ n: string; total: string }>(
    sql.raw(`SELECT count(*) n, COALESCE(SUM(amount_minor),0) total FROM payment WHERE status = 'succeeded'`),
  );
  const pp = pgPaid.rows[0];
  checks.push({ label: "succeeded payments", mongo: paidAgg?.n ?? 0, pg: Number(pp?.n ?? 0), critical: true });
  checks.push({ label: "SUM(succeeded amountMinor)", mongo: paidAgg?.total ?? 0, pg: Number(pp?.total ?? 0), critical: true });

  return report(checks);
}

function report(checks: { label: string; mongo: number; pg: number; critical: boolean }[]): boolean {
  console.log("\n── verification ──────────────────────────────────────────────");
  let failed = false;
  for (const check of checks) {
    const ok = check.mongo === check.pg;
    if (!ok && check.critical) failed = true;
    const mark = ok ? "  ok  " : check.critical ? " FAIL " : " warn ";
    console.log(`[${mark}] ${check.label.padEnd(34)} mongo=${check.mongo}  pg=${check.pg}`);
  }
  console.log("──────────────────────────────────────────────────────────────");
  return !failed;
}

// ── entry point ─────────────────────────────────────────────────────────────

interface SchoolDefaults {
  layoutId: string;
  wallpaperId: string;
  floorId: string;
  variantId: string;
}

async function main(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("[etl] MONGODB_URI is not set.");
  if (!isConfigured()) throw new Error("[etl] DATABASE_URL is not set.");

  // Safety refusal, mirroring seedDevFromProd.js. Writing to a database whose
  // name you did not expect is the accident this whole script must not enable.
  const target = new URL(process.env.DATABASE_URL!).pathname.replace(/^\//, "");
  if (COMMIT && !FORCE && !/dev|staging|smartplayer/i.test(target)) {
    throw new Error(
      `[etl] target database "${target}" does not look like a smartplayer database.\n` +
        `      Re-run with --force if this really is the intended target.`,
    );
  }

  const catalog = await import("../config/schoolCatalog.js");
  const defaults: SchoolDefaults = {
    layoutId: catalog.DEFAULT_LAYOUT_ID,
    wallpaperId: catalog.DEFAULT_WALLPAPER_ID,
    floorId: catalog.DEFAULT_FLOOR_ID,
    variantId: catalog.DEFAULT_VARIANT_ID,
  };

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15_000 });
  const mongo = mongoose.connection.db;
  if (!mongo) throw new Error("[etl] mongoose connected but exposed no database handle");

  console.log(`[etl] source: mongo/${mongo.databaseName}`);
  console.log(`[etl] target: postgres/${target}`);
  console.log(`[etl] mode:   ${VERIFY_ONLY ? "VERIFY ONLY" : COMMIT ? "COMMIT (writing)" : "DRY RUN (no writes)"}`);
  console.log(`[etl] scope:  ${ALL ? "EVERYTHING (--all)" : "story content only"}\n`);

  try {
    if (!VERIFY_ONLY) {
      await migrateStories(mongo);
      await migrateContentSideTables(mongo);

      if (ALL) {
        // Order matters, and it is a genuine three-step cycle:
        //   users        <- payment.user_id references it
        //   payments     <- user_entitlement.payment_id references it
        //   entitlements  - so these can only land once payments exist
        const entitlementRows = await migrateUsers(mongo, defaults);
        await migratePayments(mongo);
        await migrateEntitlements(entitlementRows);
        await migrateProgress(mongo);
        await migrateStoryProgress(mongo);
        await migrateAuditAndFeedback(mongo);
      }

      console.log("\n── rows " + (COMMIT ? "written" : "that WOULD be written") + " ──");
      for (const [table, n] of Object.entries(tally).sort()) {
        console.log(`  ${table.padEnd(24)} ${n}`);
      }
    }

    if (VERIFY_ONLY || COMMIT) {
      const ok = await verify(mongo);
      if (!ok) {
        console.error("\n[etl] CRITICAL CHECKS FAILED. Do not cut over.");
        process.exitCode = 1;
      }
    }

    if (!COMMIT && !VERIFY_ONLY) {
      console.log("\n[etl] Dry run only. Nothing was written. Re-run with --commit to apply.");
    }
  } finally {
    await mongoose.disconnect();
    await closeDb();
  }
}

await main().catch((error) => {
  console.error("[etl] FAILED:", error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
