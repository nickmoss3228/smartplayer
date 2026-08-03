import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { User } from "../models/User.js";
import { Progress } from "../models/Progress.js";
import { StoryProgress } from "../models/StoryProgress.js";
import { awardCurrency } from "../helpers/awardCurrency.js";
import { escapeRegex } from "../helpers/regex.js";

const PLAYERS_PAGE_LIMIT = 25;

export const adminLogin = (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Code word is required." });
  }

  if (code !== config.adminCode) {
    return res.status(401).json({ error: "Invalid code word." });
  }

  const token = jwt.sign({ role: "admin" }, config.jwtSecret, {
    expiresIn: "12h",
  });

  res.json({ success: true, token });
};

// POST /api/admin/grant-currency  { userId? | email?, bitAward?, bitWord?, bitPhrase? }
// Dev/support tool — manually top up a user's wallet. Admin-gated only (same
// code-word JWT as the feedback panel), not exposed to regular users. Accepts
// either a userId (used by the Players tab's per-row action) or an email
// (the original standalone form) to identify the target.
export const grantCurrency = async (req, res) => {
  const { userId, email, bitAward = 0, bitWord = 0, bitPhrase = 0 } = req.body;

  if (!userId && !email) {
    return res.status(400).json({ error: "userId or email is required." });
  }
  const amounts = {
    bitAward: Number(bitAward) || 0,
    bitWord: Number(bitWord) || 0,
    bitPhrase: Number(bitPhrase) || 0,
  };
  if (!amounts.bitAward && !amounts.bitWord && !amounts.bitPhrase) {
    return res.status(400).json({ error: "At least one currency amount is required." });
  }

  const user = userId
    ? await User.findById(userId).select("_id")
    : await User.findOne({ email: email.toLowerCase().trim() }).select("_id");
  if (!user) {
    return res.status(404).json({ error: "No matching user." });
  }

  const wallet = await awardCurrency(user._id, amounts);
  res.json({ success: true, wallet });
};

// GET /api/admin/players?q=&page=
// Full user roster for moderation — unlike the privacy-conscious public
// search (/api/user/search), admins can browse everyone, not just look up a
// known identifier.
export const listPlayers = async (req, res) => {
  const q = (req.query.q ?? "").trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = PLAYERS_PAGE_LIMIT;

  const filter = q
    ? {
        $or: [
          { username: new RegExp(escapeRegex(q), "i") },
          { email: new RegExp(escapeRegex(q), "i") },
          { nickname: new RegExp(escapeRegex(q), "i") },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("username email nickname avatar banned wallet createdAt lastActiveAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    players: users.map((user) => ({
      id: user._id,
      username: user.username,
      email: user.email,
      nickname: user.nickname ?? user.username,
      avatar: user.avatar ?? "cat",
      banned: user.banned,
      wallet: user.wallet,
      createdAt: user.createdAt,
      lastActiveAt: user.lastActiveAt,
    })),
    page,
    hasMore: page * limit < total,
  });
};

// PATCH /api/admin/players/:userId/ban  { banned: boolean }
export const setPlayerBanned = async (req, res) => {
  const { banned } = req.body;
  if (typeof banned !== "boolean") {
    return res.status(400).json({ error: "banned must be a boolean." });
  }

  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { banned },
    { new: true, select: "username email banned" }
  );
  if (!user) return res.status(404).json({ error: "No user with that id." });

  res.json({ success: true, user });
};

// GET /api/admin/players/:userId/progress — a consolidated read-only view for
// the "review progress" action, fanning out across the existing per-concern
// models instead of introducing a new aggregate schema.
export const getPlayerProgress = async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select(
    "username email nickname wallet streak achievements totalListeningSeconds learnedWords room"
  );
  if (!user) return res.status(404).json({ error: "No user with that id." });

  const [levelProgress, storyProgress] = await Promise.all([
    Progress.find({ userId }).select("difficulty completedLevels currentLevel"),
    StoryProgress.find({ userId }).select("difficulty storyId completedParts currentPart"),
  ]);

  res.json({
    username: user.username,
    email: user.email,
    nickname: user.nickname ?? user.username,
    wallet: user.wallet,
    streak: user.streak,
    achievements: user.achievements,
    totalListeningSeconds: user.totalListeningSeconds,
    learnedWordsCount: user.learnedWords.length,
    apartmentTier: user.room?.apartmentTier ?? "studio",
    levelProgress: levelProgress.map((p) => ({
      difficulty: p.difficulty,
      completedLevels: p.completedLevels,
      currentLevel: p.currentLevel,
    })),
    storyProgress: storyProgress.map((p) => ({
      difficulty: p.difficulty,
      storyId: p.storyId,
      completedParts: p.completedParts,
      currentPart: p.currentPart,
    })),
  });
};