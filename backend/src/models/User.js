// models/User.js
import mongoose from "mongoose";
import { DEFAULT_PLACEMENT } from "../config/roomLayout.js";
import { STARTER_ROOM_IDS } from "../config/schoolCatalog.js";

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
    required: true,
    unique: true,
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
  isEmailVerified: { type: Boolean, default: false },
  // Admin moderation flag — checked at login and on every authenticated
  // request (middleware/auth.js) so a ban also kills already-issued sessions.
  banned: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  passwordResetToken: { type: String, default: undefined },
  passwordResetExpires: { type: Date, default: undefined },
  avatar: { type: String, default: "cat" },
  nickname: { type: String, default: null, trim: true, maxLength: 30 },
  // Bumped by the heartbeat endpoint while a session is open; drives the
  // "online" dot in the multiplayer player list (see user.controller.js).
  lastActiveAt: { type: Date, default: Date.now },

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
// "Dream School" — the game that replaced the office-decorating `room`
  // above. `room` is deliberately left in place rather than dropped: it is
  // dead for reading, but removing it would rewrite every existing document
  // and throw away purchase history we may still want to refund against.
  // Nothing in the app reads `room` any more.
  school: {
    // Seeded from the catalog so the dollhouse is never empty on first visit.
    unlockedRoomIds: { type: [String], default: () => [...STARTER_ROOM_IDS] },
    ownedItemIds:    { type: [String], default: [] },
    ownedActionIds:  { type: [String], default: [] },

    // "<roomId>:<slot>" -> itemId. A Map rather than a nested schema on
    // purpose: adding a room to schoolCatalog.js then needs no schema change
    // and no migration, which the old room.placedItems shape did not allow.
    placed: { type: Map, of: String, default: () => new Map() },

    // Which cell the dollhouse opens on, and therefore where the avatar
    // stands. A preference, not a purchase.
    focusedRoomId: { type: String, default: STARTER_ROOM_IDS[0] ?? "classroom" },
  },
});

export const User = mongoose.model("User", userSchema);