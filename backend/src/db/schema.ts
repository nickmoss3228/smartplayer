// db/schema.ts
//
// The Postgres schema, and the source of truth for it — `drizzle-kit generate`
// derives the SQL migrations from this file, so nothing here is documentation
// of a schema that lives elsewhere. Change this, generate, review the SQL.
//
// ── How the document model was translated ──────────────────────────────────
//
// Three rules, applied consistently:
//
//   1. A nested object with a FIXED set of keys becomes flat columns with a
//      prefix (`wallet.bitAward` -> `bit_award`). The keys are known at compile
//      time, so a jsonb blob would only hide them from constraints and indexes.
//
//   2. An array of subdocuments becomes a CHILD TABLE whenever anything ever
//      addresses one element (sessions by jti, entitlements by sku).
//
//   3. A structure only ever read and written WHOLE stays jsonb
//      (`part_markers.time_markers`, `recent_ip_prefixes`). Exploding those
//      into rows buys constraints nobody would use and costs a join per read.
//
// The User document's own comments argue for embedding sessions and
// entitlements because "authenticateToken already loads this document on every
// request, so checking a session here costs zero extra queries". That argument
// survives the move intact: a LEFT JOIN is still one round trip. What it does
// not survive is the positional-`$` update — see repos/sessions.repo.ts.

import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ── Shared column helpers ───────────────────────────────────────────────────

/**
 * Every primary key in this schema. Minted app-side by db/ids.ts, not by a
 * column default — see that file for why.
 */
const id = () => uuid();

/** A foreign key pointing at one of those. */
const fk = (name: string) => uuid(name);

/**
 * timestamptz everywhere, never bare `timestamp`.
 *
 * Mongo stores dates as UTC instants. A Postgres `timestamp` has no zone and
 * would silently reinterpret those as local time on any server whose TZ is not
 * UTC — the VM's is not guaranteed to be. `mode: "date"` keeps the driver
 * handing back JS Date objects, which is what every caller already expects.
 */
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Mirrors TIER_ORDER in config/achievements.js. */
const TIERS = ["bronze", "silver", "gold", "platinum", "crown"] as const;

const quoted = (values: readonly string[]) => values.map((v) => `'${v}'`).join(", ");

/** `CHECK (col IS NULL OR col IN (...))` — a Mongoose enum on a nullable field. */
const oneOf = (column: string, values: readonly string[]) =>
  sql.raw(`${column} IS NULL OR ${column} IN (${quoted(values)})`);

/** `CHECK (col IN (...))` — a Mongoose enum on a required field. */
const oneOfRequired = (column: string, values: readonly string[]) =>
  sql.raw(`${column} IN (${quoted(values)})`);

// ── users ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: id().primaryKey(),

    username: text().notNull(),
    // Nullable, and unique. Mongo needed `sparse: true` to allow many docs
    // without an email; Postgres already treats NULLs as distinct in a unique
    // index, so the sparse half of that index simply disappears.
    email: text(),
    password: text().notNull(),
    phoneNumber: text("phone_number"),

    isPhoneVerified: boolean("is_phone_verified").notNull().default(false),
    pendingRegistration: boolean("pending_registration").notNull().default(false),
    banned: boolean().notNull().default(false),

    // ── 152-ФЗ consent ──
    // All three nullable, and that is the design. An account created before
    // this was recorded has NULL here, which is the honest answer; a default
    // would be a claim that somebody consented.
    legalConsentVersion: text("legal_consent_version"),
    legalConsentTermsAcceptedAt: ts("legal_consent_terms_accepted_at"),
    legalConsentDataAcceptedAt: ts("legal_consent_data_accepted_at"),

    // ── phone verification (short-lived, cleared on success) ──
    phoneVerificationCodeHash: text("phone_verification_code_hash"),
    phoneVerificationExpires: ts("phone_verification_expires"),
    phoneVerificationAttempts: integer("phone_verification_attempts").notNull().default(0),
    phoneVerificationLastSentAt: ts("phone_verification_last_sent_at"),
    phoneVerificationTicketHash: text("phone_verification_ticket_hash"),
    phoneVerificationTicketExpires: ts("phone_verification_ticket_expires"),

    passwordResetToken: text("password_reset_token"),
    passwordResetExpires: ts("password_reset_expires"),

    createdAt: ts("created_at").notNull().defaultNow(),
    lastActiveAt: ts("last_active_at").notNull().defaultNow(),

    // Superseded by the character_* columns below but still read in places.
    avatar: text().notNull().default("cat"),
    nickname: text(),

    totalListeningSeconds: integer("total_listening_seconds").notNull().default(0),

    // ── wallet ──
    // Three columns rather than a (currency, amount) child table: the set is
    // closed, named in config/currency.js, and every read wants all three.
    //
    // The CHECKs are NEW. Mongo had nothing stopping a balance going negative;
    // the conditional-decrement in spendCurrency.js was the only guard, and a
    // guard living entirely in application code is one deploy from being wrong.
    bitAward: integer("bit_award").notNull().default(0),
    bitWord: integer("bit_word").notNull().default(0),
    bitPhrase: integer("bit_phrase").notNull().default(0),

    // ── streak ──
    streakCurrent: integer("streak_current").notNull().default(0),
    streakLongest: integer("streak_longest").notNull().default(0),
    // Was a "YYYY-MM-DD" string in Mongo. A real `date`: the streak logic does
    // date arithmetic, and doing that on strings works only by the accident of
    // ISO-8601 sorting lexicographically.
    streakLastSubmittedDate: date("streak_last_submitted_date"),

    // ── achievements ──
    // Five nullable tier columns. NULL means "not earned", as `default: null`
    // did. Constrained below to the five tiers in config/achievements.js.
    achievementListeningTime: text("achievement_listening_time"),
    achievementQuestionsAnswered: text("achievement_questions_answered"),
    achievementStudyStreak: text("achievement_study_streak"),
    achievementStoriesListened: text("achievement_stories_listened"),
    achievementWordsLearned: text("achievement_words_learned"),

    // ── character ──
    characterSkinTone: text("character_skin_tone").notNull().default("#f2c48d"),
    characterOwnedItemIds: text("character_owned_item_ids").array().notNull().default([]),
    characterEquippedHairstyle: text("character_equipped_hairstyle"),
    characterEquippedOutfit: text("character_equipped_outfit"),
    characterEquippedHat: text("character_equipped_hat"),

    // ── school (the live save) ──
    // text[] rather than a child table: a set of catalog slugs read whole on
    // every load and never joined — schoolCatalog.js is a code constant, not
    // a table.
    schoolOwnedRoomIds: text("school_owned_room_ids").array().notNull().default([]),
    schoolStage: integer("school_stage").notNull().default(0),
    // No DB defaults on these four: the values come from SCHOOL_LAYOUTS[0] and
    // friends in config/schoolCatalog.js, and copying a derived constant into
    // DDL means the two drift the first time the catalog is reordered. The repo
    // supplies them on insert; a miss is a loud NOT NULL violation rather than
    // a quietly wrong wallpaper.
    schoolLayoutId: text("school_layout_id").notNull(),
    schoolWallpaperId: text("school_wallpaper_id").notNull(),
    schoolFloorId: text("school_floor_id").notNull(),
    schoolVariantId: text("school_variant_id").notNull(),
    // Per-room overrides of the three look ids, keyed by room id and SPARSE: a
    // room appears only once changed, carrying only the fields changed. jsonb
    // because it is read and written whole and its keys are catalog room ids.
    schoolPresets: jsonb("school_presets")
      .$type<Record<string, Record<string, string>>>()
      .notNull()
      .default({}),
    // The payroll clock. NULL is meaningful — "never opened the school" — and
    // school.controller.js sets it on first read so a new player is not born in
    // arrears. Do not give it a default.
    schoolPayrollLastPaidAt: ts("school_payroll_last_paid_at"),

    // The retired office-decorator save (`room`), still read and written by the
    // /progress/room/* endpoints. Whole-object jsonb, as in Mongo. NULL means
    // "never touched", and the user loader fills in the same defaults Mongoose
    // applied on read (config/roomLayout.js DEFAULT_PLACEMENT).
    room: jsonb("room").$type<Record<string, unknown>>(),

    // ── login signals (inputs to the admin sharing heuristic) ──
    blockedLoginCount: integer("blocked_login_count").notNull().default(0),
    lastBlockedAt: ts("last_blocked_at"),
    // jsonb, not a child table: capped at MAX_TRACKED_NETWORKS, rewritten
    // wholesale by recordNetwork(), never queried by element.
    recentIpPrefixes: jsonb("recent_ip_prefixes")
      .$type<{ prefix: string; firstSeenAt: string; lastSeenAt: string; count: number }[]>()
      .notNull()
      .default([]),
  },
  (t) => [
    uniqueIndex("users_username_key").on(t.username),
    uniqueIndex("users_email_key").on(t.email),
    uniqueIndex("users_phone_number_key").on(t.phoneNumber),

    check("users_bit_award_non_negative", sql`${t.bitAward} >= 0`),
    check("users_bit_word_non_negative", sql`${t.bitWord} >= 0`),
    check("users_bit_phrase_non_negative", sql`${t.bitPhrase} >= 0`),
    check("users_school_stage_non_negative", sql`${t.schoolStage} >= 0`),

    check("users_ach_listening_time_tier", oneOf("achievement_listening_time", TIERS)),
    check("users_ach_questions_answered_tier", oneOf("achievement_questions_answered", TIERS)),
    check("users_ach_study_streak_tier", oneOf("achievement_study_streak", TIERS)),
    check("users_ach_stories_listened_tier", oneOf("achievement_stories_listened", TIERS)),
    check("users_ach_words_learned_tier", oneOf("achievement_words_learned", TIERS)),
  ],
);

// ── user_session ────────────────────────────────────────────────────────────
//
// Was `User.sessions[]`, capped at MAX_DEVICES. As a child table the 3-device
// cap becomes an ordinary DELETE of the least-recently-seen row instead of
// rebuilding and reassigning a whole array — which sessionStore.js has a long
// comment about getting wrong (an in-place subdocument edit that fails to mark
// the path dirty silently signs the user out).

export const userSession = pgTable(
  "user_session",
  {
    id: id().primaryKey(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Matches the JWT's jti claim. Globally unique, not merely per user: this
    // is what authenticateToken looks a token up by.
    jti: text().notNull(),
    // Client-generated, from localStorage. Forgeable by design — this deters
    // password sharing, it is not a defence against the account's own owner.
    deviceId: text("device_id").notNull(),
    deviceLabel: text("device_label"),
    // /24 or /48 only, never a full address.
    ipPrefix: text("ip_prefix"),

    createdAt: ts("created_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("user_session_jti_key").on(t.jti),
    // Signing in again on a known device reuses its slot rather than burning a
    // second one. In Mongo that was find-then-mutate in application code; here
    // it is simply an upsert target.
    uniqueIndex("user_session_user_device_key").on(t.userId, t.deviceId),
    // Serves the device-cap eviction: oldest-seen row for this user.
    index("user_session_user_last_seen_idx").on(t.userId, t.lastSeenAt),
  ],
);

// ── user_entitlement ────────────────────────────────────────────────────────
//
// Was `User.entitlements[]`. UNIQUE (user_id, sku) is the important part:
// "re-buying a dated pass EXTENDS the existing row rather than pushing a second
// one" is stated as an invariant in models/User.js and enforced today by three
// separately-guarded conditional writes in settlePayment.js. Here the database
// enforces it and those collapse into one ON CONFLICT.

export const userEntitlement = pgTable(
  "user_entitlement",
  {
    id: id().primaryKey(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // A SKU from config/priceCatalog.js — deliberately NOT constrained to the
    // current catalog. models/User.js requires that an entitlement naming a
    // withdrawn SKU grants nothing and does not throw; a CHECK or FK here would
    // turn that into a failed write instead.
    sku: text().notNull(),

    grantedAt: ts("granted_at").notNull().defaultNow(),
    // NULL = perpetual. A date = access ends AT it, not through it.
    expiresAt: ts("expires_at"),
    source: text().notNull().default("purchase"),

    // Which payment bought it: load-bearing, not decorative — it is both the
    // idempotency latch for the grant and the handle a refund revokes by.
    //
    // ON DELETE SET NULL, never CASCADE: deleting a ledger row must not
    // silently revoke access somebody paid for. Losing the provenance of an
    // entitlement is recoverable from the payment table; losing the
    // entitlement is a support ticket from a paying customer.
    //
    // Forward reference to a table declared further down this file. The thunk
    // is what makes that legal — it is not evaluated until the schema is built.
    paymentId: fk("payment_id").references((): AnyPgColumn => payment.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    uniqueIndex("user_entitlement_user_sku_key").on(t.userId, t.sku),
    // Answers "who owns pack-easy?" without a scan, as Mongo's
    // { "entitlements.sku": 1 } multikey index did.
    index("user_entitlement_sku_idx").on(t.sku),
    index("user_entitlement_payment_idx").on(t.paymentId),
    check("user_entitlement_source_valid", oneOfRequired("source", ["purchase", "admin", "promo"])),
  ],
);

// ── user_learned_word ───────────────────────────────────────────────────────
//
// Was `User.learnedWords: [String]`, an unbounded array mutated with $addToSet.
//
// A child table here is not tidiness, it is a correctness fix.
// progress.controller.js currently snapshots the array, diffs it in JS to find
// which words are new, then $addToSets — and mints BitWord from that diff. Two
// submissions racing can both see the same word as new and both pay for it.
// `INSERT ... ON CONFLICT DO NOTHING RETURNING word` returns exactly the rows
// it actually inserted, so the diff and the write stop being two separate steps.

export const userLearnedWord = pgTable(
  "user_learned_word",
  {
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Lowercased audioKey. Matches story_part_vocab.audio_key, but no FK: the
    // bundled stories live in the frontend bundle and have no rows here at all
    // (config/vocabKeys.js is the server's snapshot of them).
    word: text().notNull(),
    learnedAt: ts("learned_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.word] })],
);

// ── progress ────────────────────────────────────────────────────────────────

export const progress = pgTable(
  "progress",
  {
    id: id().primaryKey(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    difficulty: text().notNull(),

    completedLevels: integer("completed_levels").array().notNull().default([]),
    currentLevel: integer("current_level").notNull().default(1),

    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("progress_user_difficulty_key").on(t.userId, t.difficulty),
    check("progress_difficulty_valid", oneOfRequired("difficulty", DIFFICULTIES)),
  ],
);

// ── progress_level_result ───────────────────────────────────────────────────
//
// Was `Progress.levelResults`, a Mongo Map whose KEYS encoded a composite:
// `${storyId}:${partNumber}`. That is a two-column primary key wearing a string
// as a disguise, and this table takes the disguise off.
//
// Splitting the old keys is safe on the LAST colon — story slugs contain
// hyphens (news-roland-garros, leo-additional) but never colons.

export const progressLevelResult = pgTable(
  "progress_level_result",
  {
    progressId: fk("progress_id")
      .notNull()
      .references(() => progress.id, { onDelete: "cascade" }),
    storyId: text("story_id").notNull(),
    partNumber: integer("part_number").notNull(),

    completed: boolean().notNull().default(false),
    correctAnswers: integer("correct_answers").notNull().default(0),
    totalQuestions: integer("total_questions").notNull().default(0),
    completedAt: ts("completed_at"),
  },
  (t) => [primaryKey({ columns: [t.progressId, t.storyId, t.partNumber] })],
);

// ── story_progress ──────────────────────────────────────────────────────────
//
// Ported as-is, overlap with `progress` and all. Collapsing the two is a real
// improvement and explicitly NOT part of this migration: doing it here would
// mean a post-cutover bug could be either the storage swap or the model change,
// and telling those apart afterwards is expensive.

export const storyProgress = pgTable(
  "story_progress",
  {
    id: id().primaryKey(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    difficulty: text().notNull(),
    // A slug, and deliberately NOT a foreign key to story: it may name one of
    // the built-in stories, which live in the frontend bundle and have no row.
    storyId: text("story_id").notNull(),

    completedParts: integer("completed_parts").array().notNull().default([]),
    currentPart: integer("current_part").notNull().default(1),

    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("story_progress_user_difficulty_story_key").on(t.userId, t.difficulty, t.storyId),
    check("story_progress_difficulty_valid", oneOfRequired("difficulty", DIFFICULTIES)),
  ],
);

// ── story ───────────────────────────────────────────────────────────────────
//
// DB-backed stories authored in the admin Story Builder. The built-in ones
// (leo, maya, daniel, the news set) are static config and have no row here —
// helpers/storyLookup.js merges the two sources at read time.

export const story = pgTable(
  "story",
  {
    id: id().primaryKey(),

    difficulty: text().notNull(),
    storyId: text("story_id").notNull(),

    // Admin-facing identifier, shown in the Story Builder lists.
    storyName: text("story_name").notNull(),
    description: text().notNull().default(""),

    // What STUDENTS see, per locale. Empty string means "fall back to
    // story_name/description", which is what keeps stories imported before
    // these columns existed rendering unchanged.
    titleEn: text("title_en").notNull().default(""),
    titleRu: text("title_ru").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),
    descriptionRu: text("description_ru").notNull().default(""),

    characterIcon: text("character_icon").notNull().default("📖"),
    totalParts: integer("total_parts").notNull(),

    // NULL is a real third state — "no opinion, use the static entry's
    // category" — not a missing value. Do not make this NOT NULL.
    category: text(),
    coverUrl: text("cover_url"),
    published: boolean().notNull().default(false),

    // ── Catalog ──────────────────────────────────────────────────────────
    //
    // These columns are why this table exists twice over: it holds the story's
    // CONTENT, and it is also the catalog the paywall prices against. A story
    // that is not a row here is refused (accessFor in config/entitlements.js),
    // so /admin is the only place a story becomes visible or purchasable.
    //
    // Which side of the DB/static split this story's parts come from.
    // 'builtin' means the row is a catalog entry ONLY — the audio, comics and
    // quizzes still load from src/assets and config/quizData.js. Publishing
    // leo/maya/daniel as 'db' would drop all their comic pages, which is the
    // whole reason this is a column rather than an inference from `published`.
    contentSource: text("content_source").notNull().default("db"),

    // Set grouping: "leo", "maya", "daniel". A set SKU sells every general
    // story sharing this value, so an empty string opts a story out of bundles.
    character: text().notNull().default(""),

    // Does it cost money? `false` is the ONLY way a story is free — the
    // catalog never gives content away by omission.
    paid: boolean().notNull().default(true),
    // Sellable NOW. False is the safety catch on a story whose audio does not
    // exist yet: it can be listed and previewed but not bought.
    ready: boolean().notNull().default(true),

    // Per-story overrides. NULL means "derive it" — the price from
    // parts × TRACK_PRICE_MINOR, the allowance from freeAllowanceFor(parts) —
    // which is what almost every row should carry.
    priceMinor: integer("price_minor"),
    freeParts: integer("free_parts"),
    previewSeconds: integer("preview_seconds"),

    // The Mongo _id this story was copied from, when it was. Provenance only —
    // nothing joins on it — so a migrated story can be traced back to its
    // document in the pre-migration backup.
    legacyMongoId: text("legacy_mongo_id"),

    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("story_difficulty_story_id_key").on(t.difficulty, t.storyId),
    index("story_published_idx").on(t.published),
    check("story_difficulty_valid", oneOfRequired("difficulty", DIFFICULTIES)),
    check("story_category_valid", oneOf("category", ["general", "news"])),
    check("story_total_parts_range", sql`${t.totalParts} BETWEEN 1 AND 20`),
    check("story_content_source_valid", oneOfRequired("content_source", ["db", "builtin"])),
    // Money is integer kopecks and never negative; a free story states it with
    // `paid`, not with a 0 price.
    check("story_price_minor_range", sql`${t.priceMinor} IS NULL OR ${t.priceMinor} >= 0`),
    check(
      "story_free_parts_range",
      sql`${t.freeParts} IS NULL OR (${t.freeParts} >= 0 AND ${t.freeParts} <= ${t.totalParts})`,
    ),
    check(
      "story_preview_seconds_range",
      sql`${t.previewSeconds} IS NULL OR ${t.previewSeconds} > 0`,
    ),
  ],
);

export const storyPart = pgTable(
  "story_part",
  {
    id: id().primaryKey(),
    storyPk: fk("story_pk")
      .notNull()
      .references(() => story.id, { onDelete: "cascade" }),

    partNumber: integer("part_number").notNull(),
    // Shown as the track name. Without it the adapter had to invent
    // `${storyName} — ${n}`, which renamed every track on publish.
    title: text().notNull().default(""),
    audioUrl: text("audio_url"),
    // Per-marker help clips.
    helpAudio: text("help_audio").array().notNull().default([]),
    comicUrl: text("comic_url"),
  },
  (t) => [uniqueIndex("story_part_story_number_key").on(t.storyPk, t.partNumber)],
);

// One table for `vocabulary[]` and `phrasalVerbs[]`, discriminated by `kind`.
// They shared a Mongoose sub-schema and differ only in which list they sat in.
export const storyPartVocab = pgTable(
  "story_part_vocab",
  {
    id: id().primaryKey(),
    partPk: fk("part_pk")
      .notNull()
      .references(() => storyPart.id, { onDelete: "cascade" }),

    kind: text().notNull(),
    // Preserves the order the author arranged them in; a bare set would
    // reshuffle the deck on every read.
    ordinal: integer().notNull(),

    // Russian text shown to the student.
    word: text().notNull(),
    definition: text().notNull().default(""),
    // English filename stem, and also the progress key joined against
    // user_learned_word.word.
    audioKey: text("audio_key").notNull(),
    audioUrl: text("audio_url"),
  },
  (t) => [
    uniqueIndex("story_part_vocab_part_kind_ordinal_key").on(t.partPk, t.kind, t.ordinal),
    // Serves the anti-fraud vocab catalogue, which used to be
    // Story.distinct("parts.vocabulary.audioKey") over a doubly-nested array.
    index("story_part_vocab_audio_key_idx").on(t.kind, t.audioKey),
    check("story_part_vocab_kind_valid", oneOfRequired("kind", ["vocabulary", "phrasal"])),
  ],
);

export const storyPartQuiz = pgTable(
  "story_part_quiz",
  {
    id: id().primaryKey(),
    partPk: fk("part_pk")
      .notNull()
      .references(() => storyPart.id, { onDelete: "cascade" }),

    ordinal: integer().notNull(),
    question: text().notNull(),
    options: text().array().notNull(),
    correctAnswer: integer("correct_answer").notNull(),
    referenceTime: doublePrecision("reference_time").notNull().default(0),

    audioFast: text("audio_fast"),
    audioSlow: text("audio_slow"),
  },
  (t) => [
    uniqueIndex("story_part_quiz_part_ordinal_key").on(t.partPk, t.ordinal),
    // Both were Mongoose `validate` functions, which only ran on documents
    // saved through Mongoose. As CHECKs they also hold for the ETL and for
    // anything anyone runs by hand in psql.
    check("story_part_quiz_four_options", sql`cardinality(${t.options}) = 4`),
    check("story_part_quiz_answer_range", sql`${t.correctAnswer} BETWEEN 0 AND 3`),
  ],
);

export const storyPartMarker = pgTable(
  "story_part_marker",
  {
    id: id().primaryKey(),
    partPk: fk("part_pk")
      .notNull()
      .references(() => storyPart.id, { onDelete: "cascade" }),

    ordinal: integer().notNull(),
    time: doublePrecision().notNull(),
    label: text().notNull().default(""),
    color: text().notNull().default("red"),
  },
  (t) => [uniqueIndex("story_part_marker_part_ordinal_key").on(t.partPk, t.ordinal)],
);

// ── part_markers ────────────────────────────────────────────────────────────
//
// The durable copy of time markers, and the one table where the ABSENCE of a
// foreign key is the entire point.
//
// Markers are the only story content that can only be authored in the app — you
// need the waveform to place them — and the normal way to fix a stale story is
// delete-then-reimport. Keyed by (difficulty, story_id, part_number) rather
// than by a story row, these survive that. A well-meaning
// `REFERENCES story(...) ON DELETE CASCADE` here destroys exactly the property
// the table exists for. Do not add one.
//
// time_markers stays jsonb: written and read whole, never queried by element.

export const partMarkers = pgTable(
  "part_markers",
  {
    difficulty: text().notNull(),
    storyId: text("story_id").notNull(),
    partNumber: integer("part_number").notNull(),

    timeMarkers: jsonb("time_markers")
      .$type<{ time: number; label?: string; color?: string }[]>()
      .notNull()
      .default([]),

    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.difficulty, t.storyId, t.partNumber] }),
    check("part_markers_difficulty_valid", oneOfRequired("difficulty", DIFFICULTIES)),
  ],
);

// ── story_visibility ────────────────────────────────────────────────────────
//
// "Do not show this story to students", for ANY story — including built-in ones
// that have no story row. Same no-foreign-key reasoning as part_markers, for a
// different reason: you must be able to hide a story you have never imported.
// An absent row means visible, so losing this table makes everything visible
// rather than making the app look empty.

export const storyVisibility = pgTable(
  "story_visibility",
  {
    difficulty: text().notNull(),
    storyId: text("story_id").notNull(),
    hidden: boolean().notNull().default(false),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.difficulty, t.storyId] }),
    check("story_visibility_difficulty_valid", oneOfRequired("difficulty", DIFFICULTIES)),
  ],
);

// ── payment ─────────────────────────────────────────────────────────────────
//
// The financial ledger: one row per attempt to take money, kept forever.

export const payment = pgTable(
  "payment",
  {
    // Sent to the acquirer as the idempotence key before the provider is
    // called, which is why ids are minted app-side (db/ids.ts).
    id: id().primaryKey(),
    // RESTRICT, not CASCADE: deleting a user must not silently delete the
    // record of money they paid. If an account really has to go, the ledger
    // rows are anonymised deliberately, not swept away as a side effect.
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    provider: text().notNull().default("fake"),
    providerPaymentId: text("provider_payment_id"),
    // Deterministic (the payment's own id), so a retried create cannot produce
    // two payments on the provider's side.
    idempotenceKey: text("idempotence_key"),

    status: text().notNull().default("pending"),
    amountMinor: integer("amount_minor").notNull(),
    currency: text().notNull().default("RUB"),

    confirmationUrl: text("confirmation_url"),
    cancellationReason: text("cancellation_reason"),

    // When the acquirer says the money moved. Distinct from granted_at, which
    // is when WE acted on it; the gap is the webhook latency.
    paidAt: ts("paid_at"),
    // THE idempotency latch, not a display timestamp. Set exactly once, by a
    // conditional UPDATE ... WHERE granted_at IS NULL.
    grantedAt: ts("granted_at"),
    // When the entitlement rows actually landed. Mongo needed this separately
    // from granted_at because the latch and the grant were two writes and a
    // crash could fall between them. Once settlement runs in one transaction
    // the two are set together and this column is redundant; it is kept so the
    // controller port can mirror models/Payment.js exactly and simplify after.
    grantAppliedAt: ts("grant_applied_at"),

    // Last payload the provider gave us, verbatim, for arguing with them later.
    raw: jsonb(),

    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    // PARTIAL unique. The row is created BEFORE the provider is called, so
    // provider_payment_id is briefly NULL and several NULLs must coexist — but
    // once set it must collide, because a replayed webhook colliding here is
    // the last line of defence against granting the same purchase twice.
    // Mongo needed a partialFilterExpression for this; Postgres does it
    // natively (and treats NULLs as distinct in a unique index anyway).
    uniqueIndex("payment_provider_payment_id_key")
      .on(t.providerPaymentId)
      .where(sql`${t.providerPaymentId} IS NOT NULL`),
    // The reconciliation job's query: pending, and old enough to chase.
    index("payment_status_created_idx").on(t.status, t.createdAt),
    // "Show me this user's orders", for the account page and for support.
    index("payment_user_created_idx").on(t.userId, t.createdAt.desc()),
    check(
      "payment_status_valid",
      oneOfRequired("status", ["pending", "succeeded", "canceled", "failed", "refunded"]),
    ),
  ],
);

export const paymentItem = pgTable(
  "payment_item",
  {
    id: id().primaryKey(),
    paymentId: fk("payment_id")
      .notNull()
      .references(() => payment.id, { onDelete: "cascade" }),

    ordinal: integer().notNull(),
    sku: text().notNull(),
    // PRICED SNAPSHOT, taken at order time and never recomputed. A later price
    // change must not rewrite what somebody actually paid, and support needs
    // the historical number to answer a dispute.
    amountMinor: integer("amount_minor").notNull(),
    durationDays: integer("duration_days"),
  },
  (t) => [uniqueIndex("payment_item_payment_ordinal_key").on(t.paymentId, t.ordinal)],
);

// ── admin_audit_log ─────────────────────────────────────────────────────────
//
// Append-only record of every mutating admin action.
//
// RETENTION: Mongo expired these with a TTL index. Postgres has no such thing,
// so the equivalent is a pg_cron job — see db/migrations/manual/. That is a
// scheduled DELETE, which means it is a thing that can silently stop running,
// unlike a TTL index. Check it whenever this table looks larger than it should.

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: id().primaryKey(),

    // Identifies which code word was used, not a verified person.
    actorName: text("actor_name").notNull(),
    actorSessionId: text("actor_session_id"),
    actorTokenIssuedAt: ts("actor_token_issued_at"),

    ip: text(),
    userAgent: text("user_agent"),

    // Stable dotted label from the route table in middleware/auditLog.js,
    // e.g. "player.setBanned".
    action: text().notNull(),
    method: text().notNull(),
    path: text().notNull(),

    targetType: text("target_type"),
    // text, NOT a uuid column: this may hold an email address or a story slug
    // rather than an id. A uuid type would reject those rows outright.
    targetId: text("target_id"),

    statusCode: integer("status_code").notNull(),
    outcome: text().notNull(),
    durationMs: integer("duration_ms"),

    // Redacted, size-capped summary of the request. Arbitrary shape by design.
    summary: jsonb(),

    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    // Serves both the retention sweep and the default newest-first list view;
    // a btree index reads in either direction.
    index("admin_audit_log_created_idx").on(t.createdAt),
    index("admin_audit_log_actor_created_idx").on(t.actorName, t.createdAt.desc()),
    index("admin_audit_log_target_created_idx").on(t.targetType, t.targetId, t.createdAt.desc()),
    index("admin_audit_log_action_created_idx").on(t.action, t.createdAt.desc()),
    check("admin_audit_log_method_valid", oneOfRequired("method", ["POST", "PUT", "PATCH", "DELETE"])),
    check(
      "admin_audit_log_outcome_valid",
      oneOfRequired("outcome", ["success", "client_error", "server_error"]),
    ),
  ],
);

// ── feedback ────────────────────────────────────────────────────────────────
//
// Anonymous and publicly writable. The index is NEW: models/Feedback.js
// declares none, and the admin tab's unpaginated find().sort({createdAt:-1})
// hits Mongo's 32 MB in-memory sort ceiling somewhere past ~32k rows and then
// fails permanently. An index on the sort column retires that failure mode.
// Pagination is still worth adding, separately.

export const feedback = pgTable(
  "feedback",
  {
    id: id().primaryKey(),
    name: text().notNull(),
    message: text().notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("feedback_created_idx").on(t.createdAt.desc())],
);

// ── fake_payment ────────────────────────────────────────────────────────────
//
// The fake acquirer's OWN records — not part of our ledger. See
// models/FakePayment.js: the separation is the thing being tested, so this
// table deliberately has no foreign key to `payment`. The fake knows our order
// id only as an opaque string, exactly as a real acquirer would.

export const fakePayment = pgTable(
  "fake_payment",
  {
    // "fake_<uuid>", assigned by the driver: the acquirer's own id, which it
    // hands us as provider_payment_id. text, not uuid, because of the prefix.
    id: text().primaryKey(),
    orderId: text("order_id").notNull(),

    amountMinor: integer("amount_minor").notNull(),
    currency: text().notNull().default("RUB"),
    // The acquirer's own dialect — uppercase, and PAID rather than succeeded —
    // so the driver's translation layer is exercised on every run.
    status: text().notNull().default("PENDING"),

    // Captured at create time, so a later config change cannot retarget
    // callbacks for payments already in flight.
    callbackUrl: text("callback_url").notNull(),

    simDelayMs: integer("sim_delay_ms").notNull().default(2000),
    simDeliver: text("sim_deliver").notNull().default("once"),
    simAmount: text("sim_amount").notNull().default("correct"),

    // Every delivery attempt. jsonb: appended and displayed whole, never
    // queried by element.
    deliveries: jsonb()
      .$type<{ at: string; attempt: number; code: number | null; error: string | null }[]>()
      .notNull()
      .default([]),
    delivered: boolean().notNull().default(false),

    paidAt: ts("paid_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("fake_payment_order_idx").on(t.orderId),
    // Boot recovery's query: decided, but never successfully delivered.
    index("fake_payment_delivered_status_idx").on(t.delivered, t.status),
    check(
      "fake_payment_status_valid",
      oneOfRequired("status", ["NEW", "PENDING", "PAID", "FAILED", "CANCELED"]),
    ),
    check("fake_payment_sim_deliver_valid", oneOfRequired("sim_deliver", ["once", "twice", "never"])),
    check("fake_payment_sim_amount_valid", oneOfRequired("sim_amount", ["correct", "wrong"])),
  ],
);

// ── inferred row types ──────────────────────────────────────────────────────
//
// Exported so repos and their callers share one definition of a row. These are
// derived from the tables above — never hand-write a parallel interface.

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSession = typeof userSession.$inferSelect;
export type NewUserSession = typeof userSession.$inferInsert;
export type UserEntitlement = typeof userEntitlement.$inferSelect;
export type Progress = typeof progress.$inferSelect;
export type ProgressLevelResult = typeof progressLevelResult.$inferSelect;
export type StoryProgress = typeof storyProgress.$inferSelect;
export type Story = typeof story.$inferSelect;
export type StoryPart = typeof storyPart.$inferSelect;
export type Payment = typeof payment.$inferSelect;
export type NewPayment = typeof payment.$inferInsert;
export type PaymentItem = typeof paymentItem.$inferSelect;
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type FakePayment = typeof fakePayment.$inferSelect;
