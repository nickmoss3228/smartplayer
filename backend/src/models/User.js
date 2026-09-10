// models/User.js
import mongoose from "mongoose";
import { DEFAULT_PLACEMENT } from "../config/roomLayout.js";
import {
  STARTER_STAGE,
  DEFAULT_LAYOUT_ID,
  DEFAULT_WALLPAPER_ID,
  DEFAULT_FLOOR_ID,
  DEFAULT_VARIANT_ID,
} from "../config/schoolCatalog.js";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 3,
    maxLength: 30,
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please enter a valid email",
    ],
  },
  password: {
    type: String,
    required: true,
    minLength: 6,
  },
  phoneNumber: {
    type: String,
    required: false,
    trim: true,
    unique: true,
    sparse: true,
  },
  isPhoneVerified: { type: Boolean, default: false },
  // True only between "signup created this row" and "the SMS code checked out".
  // Cleared for good on first successful verification.
  //
  // It exists to tell two very different unverified accounts apart, which
  // `isPhoneVerified: false` alone cannot do:
  //
  //   1. a signup whose SMS never arrived — an empty shell holding a username
  //      and a phone hostage, with no progress, no purchases, nothing to lose;
  //   2. an account from before phone auth existed, part-way through
  //      startPhoneVerification — years of progress, temporarily unverified.
  //
  // signup() deletes (1) so the same person can retry with the same username
  // after a typo. Doing that by "unverified and has a phone" would have
  // deleted (2) as well, since enrolment sets a phone before verifying it.
  pendingRegistration: { type: Boolean, default: false },

  // What this account agreed to at signup, and when.
  //
  // 152-ФЗ puts the burden of proving consent on the operator, so the tick has
  // to survive somewhere the operator controls — a checkbox that only ever
  // existed in the browser proves nothing later. Timestamps rather than
  // booleans for the same reason: "consented" is a question about a moment.
  //
  // `version` is the LEGAL_VERSION the frontend was showing (config/legal.ts).
  // Rewriting the documents therefore cannot retroactively claim that someone
  // agreed to the new wording — it just leaves them on the old version, which
  // is the honest answer.
  //
  // Absent on every account created before this field existed; that is
  // deliberate too, since backfilling a consent nobody gave would be worse
  // than admitting it was not recorded.
  legalConsent: {
    version: { type: String },
    termsAcceptedAt: { type: Date },
    dataConsentAcceptedAt: { type: Date },
  },
  // Admin moderation flag — checked at login and on every authenticated
  // request (middleware/auth.js) so a ban also kills already-issued sessions.
  banned: { type: Boolean, default: false },
  phoneVerificationCodeHash: { type: String, default: null },
  phoneVerificationExpires: { type: Date, default: null },
  phoneVerificationAttempts: { type: Number, default: 0 },
  phoneVerificationLastSentAt: { type: Date, default: null },
  phoneVerificationTicketHash: { type: String, default: null },
  phoneVerificationTicketExpires: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  passwordResetToken: { type: String, default: undefined },
  passwordResetExpires: { type: Date, default: undefined },
  avatar: { type: String, default: "cat" },
  nickname: { type: String, default: null, trim: true, maxLength: 30 },
  // Bumped by the heartbeat endpoint while a session is open; drives the
  // "online" dot in the multiplayer player list (see user.controller.js).
  lastActiveAt: { type: Date, default: Date.now },

  // Live sessions, one row per signed-in device, capped at MAX_DEVICES
  // (config/sessions.js). This is what makes a JWT revocable: middleware/auth.js
  // requires the token's `jti` to still appear here, so pulling a row kills that
  // token instantly even though it remains cryptographically valid.
  //
  // Embedded rather than a separate collection on purpose. authenticateToken
  // already loads this document on EVERY request, so checking a session here
  // costs zero extra queries — a Session collection would add a round-trip to
  // the hottest path in the app. Same reasoning middleware/rateLimit.js gives
  // for keeping its counters out of Mongo. Three rows keeps the doc tiny.
  //
  // _id: false — these are looked up by deviceId/jti, never by their own id,
  // and a per-row ObjectId is just bytes on every request.
  sessions: {
    type: [
      new mongoose.Schema(
        {
          // Matches the JWT's jti claim. Rotated when a known device signs in
          // again, which is what invalidates that device's previous token.
          jti: { type: String, required: true },
          // Client-generated UUID from localStorage (services/deviceId.ts),
          // sent as X-Device-Id. Trivially forgeable, and that's fine — this
          // deters password-sharing between people, it is not a defence
          // against someone deliberately attacking their own account.
          deviceId: { type: String, required: true },
          // Display only, for the "sign a device out" picker. Never matched on.
          deviceLabel: { type: String, default: null },
          // /24 or /48 only, never a full address — see ipPrefix().
          ipPrefix: { type: String, default: null },
          createdAt: { type: Date, default: Date.now },
          // Written on a throttle (LAST_SEEN_THROTTLE_MS), not per request.
          lastSeenAt: { type: Date, default: Date.now },
        },
        { _id: false }
      ),
    ],
    default: [],
  },

  // Inputs to the admin panel's sharing heuristic (sharingScore()). Kept
  // separate from `sessions` because it deliberately outlives them: the whole
  // point is to notice a pattern across logins that individually look fine.
  loginSignals: {
    // Rolling, newest-first, capped at MAX_TRACKED_NETWORKS. Prefixes only.
    recentIpPrefixes: {
      type: [
        new mongoose.Schema(
          {
            prefix: { type: String, required: true },
            firstSeenAt: { type: Date, default: Date.now },
            lastSeenAt: { type: Date, default: Date.now },
            count: { type: Number, default: 1 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    // How many times this account has hit the device cap. A legitimate user
    // trips this once when they replace a phone; someone handing the password
    // around trips it repeatedly.
    blockedLoginCount: { type: Number, default: 0 },
    lastBlockedAt: { type: Date, default: null },
  },

  // ── NEW ──
  streak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastSubmittedDate: { type: String, default: null }, // "YYYY-MM-DD"
  },
  achievements: {
    listeningTime:     { type: String, default: null },
    questionsAnswered: { type: String, default: null },
    studyStreak:       { type: String, default: null },
    storiesListened:   { type: String, default: null },
    wordsLearned:      { type: String, default: null },
  },
  totalListeningSeconds: { type: Number, default: 0 },
  // Keys (lowercased audioKey/word) of vocab words correctly identified in a VocabQuiz
  learnedWords: { type: [String], default: [] },

  // In-app currency balances. bitAward is the general/main currency (quiz
  // completion); bitWord and bitPhrase are earned by specific activities
  // (vocab quiz, phrase-repeat listening) — see config/currency.js.
  wallet: {
    bitAward:  { type: Number, default: 0 },
    bitWord:   { type: Number, default: 0 },
    bitPhrase: { type: Number, default: 0 },
  },

  // What this user has PAID FOR. Real money only — see config/priceCatalog.js.
  // Deliberately a sibling of `wallet` above and never mixed with it: bitAward
  // buys cosmetics, rubles buy stories, and nothing converts between them.
  //
  // Embedded for the same reason `sessions` is, and the case is stronger here:
  // authenticateToken already loads this document on every authenticated
  // request, so the gate on GET /api/stories/:difficulty/:storyId — the hottest
  // paid path — costs zero extra queries. A separate collection would add a
  // round-trip to store at most a dozen append-only rows per user.
  //
  // The FREE starter pack is NOT stored here. It is derived from
  // STARTER_STORIES in the price catalog, so every account that existed before
  // payments keeps its access with no backfill, and there is no window in which
  // a half-finished migration locks a real user out of free content.
  //
  // expiresAt is nullable NOW, while nothing recurring is sold. That single
  // field is what makes a subscription a later addition rather than a schema
  // migration. Re-buying the 90-day pass EXTENDS the existing row rather than
  // pushing a second one (see helpers/settlePayment.js), which is what keeps
  // this array bounded; the Payment collection is the financial history.
  //
  // _id: false — rows are looked up by sku, never by their own id.
  entitlements: {
    type: [
      new mongoose.Schema(
        {
          // A SKU from config/priceCatalog.js. An entitlement naming a SKU that
          // has since left the catalog grants nothing and must not throw —
          // config/entitlements.js is written to tolerate exactly that.
          sku: { type: String, required: true },
          grantedAt: { type: Date, default: Date.now },
          // null = perpetual. A date = access ends AT it (not through it).
          expiresAt: { type: Date, default: null },
          source: {
            type: String,
            enum: ["purchase", "admin", "promo"],
            default: "purchase",
          },
          // Which payment bought it. Load-bearing, not decorative: it is the
          // idempotency latch for the grant write and the handle a refund
          // revokes by.
          paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            default: null,
          },
        },
        { _id: false }
      ),
    ],
    default: [],
  },

  // "My Room" decorating game — items bought with bitAward, see
  // config/shopCatalog.js. apartmentTier is a breadcrumb for a future
  // bigger-apartment upgrade path; not used for anything yet.
  room: {
    apartmentTier: { type: String, default: "studio" },
    ownedItemIds: { type: [String], default: [] },
    // Free preference toggle, not a purchase — dims the scene's lighting.
    lightsOn: { type: Boolean, default: true },
    placedItems: {
      wallpaper:  { type: String, default: null },
      flooring:   { type: String, default: null },
      furniture1: { type: String, default: null }, // desk slot
      chair:      { type: String, default: null },
      furniture2: { type: String, default: null }, // plant/rug/decor slot
      poster:     { type: String, default: null },
      wardrobe:   { type: String, default: null }, // filing cabinet slot
      table:      { type: String, default: null },
      shelf:      { type: String, default: null },
      window:     { type: String, default: null },
    },
    // Free-placement "arrange mode" — where each item sits/faces, on top of
    // *which* item occupies the slot (placedItems, above). Floor items get
    // x/z + a 90°-step rotation; wall items stay flush against their wall
    // and only slide along it (along the wall's run + height). Defaults
    // match config/roomLayout.js's DEFAULT_PLACEMENT (the fixed layout the
    // office reskin shipped with) so nothing visually moves for existing
    // users until they actually drag something.
    placement: {
      furniture1: {
        x: { type: Number, default: DEFAULT_PLACEMENT.furniture1.x },
        z: { type: Number, default: DEFAULT_PLACEMENT.furniture1.z },
        rotation: { type: Number, default: DEFAULT_PLACEMENT.furniture1.rotation },
      },
      chair: {
        x: { type: Number, default: DEFAULT_PLACEMENT.chair.x },
        z: { type: Number, default: DEFAULT_PLACEMENT.chair.z },
        rotation: { type: Number, default: DEFAULT_PLACEMENT.chair.rotation },
      },
      table: {
        x: { type: Number, default: DEFAULT_PLACEMENT.table.x },
        z: { type: Number, default: DEFAULT_PLACEMENT.table.z },
        rotation: { type: Number, default: DEFAULT_PLACEMENT.table.rotation },
      },
      furniture2: {
        x: { type: Number, default: DEFAULT_PLACEMENT.furniture2.x },
        z: { type: Number, default: DEFAULT_PLACEMENT.furniture2.z },
        rotation: { type: Number, default: DEFAULT_PLACEMENT.furniture2.rotation },
      },
      wardrobe: {
        x: { type: Number, default: DEFAULT_PLACEMENT.wardrobe.x },
        z: { type: Number, default: DEFAULT_PLACEMENT.wardrobe.z },
        rotation: { type: Number, default: DEFAULT_PLACEMENT.wardrobe.rotation },
      },
      poster: {
        along: { type: Number, default: DEFAULT_PLACEMENT.poster.along },
        height: { type: Number, default: DEFAULT_PLACEMENT.poster.height },
      },
      window: {
        along: { type: Number, default: DEFAULT_PLACEMENT.window.along },
        height: { type: Number, default: DEFAULT_PLACEMENT.window.height },
      },
      shelf: {
        along: { type: Number, default: DEFAULT_PLACEMENT.shelf.along },
        height: { type: Number, default: DEFAULT_PLACEMENT.shelf.height },
      },
    },
  },

  // Character customization — sibling to `room` (same owned/equipped shape),
  // items bought with bitAward, see config/characterCatalog.js. This is now
  // the player's one identity avatar (replaces the old flat `avatar` field
  // above), rendered inside the Room scene and as a generated 2D portrait
  // icon elsewhere (Navbar, Dashboard). skinTone is free personalization
  // (identity, not a purchasable cosmetic), set the same way nickname is.
  character: {
    skinTone: { type: String, default: "#f2c48d" },
    ownedItemIds: { type: [String], default: [] },
    equipped: {
      hairstyle: { type: String, default: null },
      outfit:    { type: String, default: null },
      hat:       { type: String, default: null },
    },
  },

  // "Dream School" — the isometric campus that replaced both the
  // office-decorating `room` above and the dollhouse that briefly replaced it.
  // `room` is deliberately left in place rather than dropped: it is dead for
  // reading, but removing it would rewrite every existing document.
  //
  // The room list is the whole save. It implies the rectangles, the furniture,
  // the people and how developed the school is — none of which is stored,
  // because none of it varies except through which rooms were bought. See
  // docs/room-game-concept.md.
  //
  // Documents written by the dollhouse still carry unlockedRoomIds /
  // ownedItemIds / ownedActionIds / placed / focusedRoomId. Mongoose simply
  // stops reading them; school.controller.js strips them on first load rather
  // than migrating the collection.
  school: {
    // Every room the player has bought. THE save — the rectangles, the
    // furniture, the people and the level are all derived from this list.
    ownedRoomIds: { type: [String], default: [] },

    // 0..MAX_STAGE. Dead as a progress counter since rooms became individually
    // purchasable, and kept as the LEVEL FLOOR for players migrated off the old
    // ten-stage economy: their rooms do not always re-earn the level they paid
    // for, and a level that went down would invalidate a wallpaper they had
    // already chosen. A player who never saw that economy has 0 here, which
    // floors nothing.
    stage: { type: Number, default: STARTER_STAGE, min: 0 },

    // Free preferences. Which ones are selectable depends on the level, which
    // is why they are validated against the catalog on write, not just on read.
    layoutId:    { type: String, default: DEFAULT_LAYOUT_ID },
    wallpaperId: { type: String, default: DEFAULT_WALLPAPER_ID },
    floorId:     { type: String, default: DEFAULT_FLOOR_ID },

    // Per-room overrides of those three, keyed by room id and SPARSE: a room
    // only appears once it has been changed, and only the fields that were
    // changed appear on it. Twenty rooms times three ids, almost all equal to
    // the defaults above, would be a save that grows without saying anything.
    presets:     { type: Object, default: {} },

    // Payroll. ONE date, and that is the whole of it: weeks owed and staff
    // morale are both derived from it, the same way the level is derived from
    // the room list. Two stored numbers that have to agree with a third is a
    // bug waiting to be written. Set on first read so a new player never opens
    // the game already in arrears.
    payroll: {
      lastPaidAt: { type: Date },
    },

    // Which of the three campus shapes this player got. NOT a preference: it
    // is derived from the user id and then persisted, so two players rarely
    // share a floorplan and visiting someone shows a genuinely different
    // school. Stored rather than recomputed so it can be reassigned by hand.
    variantId:   { type: String, default: DEFAULT_VARIANT_ID },
  },
});

// Answers "who owns pack-easy?" for support and analytics without a scan.
// The Payment collection is the real ledger; this is for reading the current
// state of the world.
userSchema.index({ "entitlements.sku": 1 });

export const User = mongoose.model("User", userSchema);
