// models/User.js
import mongoose from "mongoose";

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
    placedItems: {
      wallpaper:  { type: String, default: null },
      flooring:   { type: String, default: null },
      furniture1: { type: String, default: null }, // bed slot
      furniture2: { type: String, default: null }, // plant/rug slot
      poster:     { type: String, default: null },
      wardrobe:   { type: String, default: null },
      table:      { type: String, default: null },
      shelf:      { type: String, default: null },
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
});

export const User = mongoose.model("User", userSchema);