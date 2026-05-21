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
  emailVerificationToken: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  passwordResetToken: { type: String, default: undefined },
  passwordResetExpires: { type: Date, default: undefined },
  avatar: { type: String, default: "cat" },
  nickname: { type: String, default: null, trim: true, maxLength: 30 },

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
  },
  totalListeningSeconds: { type: Number, default: 0 },
});

export const User = mongoose.model("User", userSchema);