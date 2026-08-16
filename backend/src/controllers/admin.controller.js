import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config/env.js";
import { User } from "../models/User.js";
import { Progress } from "../models/Progress.js";
import { StoryProgress } from "../models/StoryProgress.js";
import { AdminAuditLog } from "../models/AdminAuditLog.js";
import { awardCurrency } from "../helpers/awardCurrency.js";
import { escapeRegex } from "../helpers/regex.js";
import { safeEqual } from "../helpers/safeEqual.js";

const PLAYERS_PAGE_LIMIT = 25;
const AUDIT_PAGE_LIMIT = 50;

// Admin and user tokens are signed with the SAME jwtSecret and today are kept
// apart only by `payload.role !== "admin"` — one stray claim away from a
// privilege escalation. An audience claim makes the separation explicit and
// cheap to verify. Deliberately NOT added to user tokens in the same change:
// that would invalidate every live 7-day session and force a mass re-login.
export const ADMIN_AUDIENCE = "smartplayer-admin";
export const ADMIN_ISSUER = "smartplayer";

export const adminLogin = (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Code word is required." });
  }

  // Walk EVERY configured code without an early return, so neither the number
  // of configured admins nor which one matched is inferable from response
  // timing. safeEqual is constant-time per comparison.
  let name = null;
  for (const [candidate, adminName] of config.adminCodes) {
    if (safeEqual(code, candidate)) name = adminName;
  }

  if (!name) {
    return res.status(401).json({ error: "Invalid code word." });
  }

  const token = jwt.sign(
    // `admin` is the display name from ADMIN_CODES; `sid` correlates every
    // action taken during one login session in the audit log.
    { role: "admin", admin: name, sid: crypto.randomUUID() },
    config.jwtSecret,
    { expiresIn: "12h", audience: ADMIN_AUDIENCE, issuer: ADMIN_ISSUER }
  );

  res.json({ success: true, token, admin: name });
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

// GET /api/admin/audit?page=&actor=&action=&targetId=
// A GET on purpose: the audit middleware only records mutating methods, so
// reading the log never pollutes it.
export const listAuditLog = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = AUDIT_PAGE_LIMIT;

  const filter = {};
  if (req.query.actor) filter["actor.name"] = req.query.actor;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.targetId) filter.targetId = req.query.targetId;

  const [entries, total] = await Promise.all([
    AdminAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AdminAuditLog.countDocuments(filter),
  ]);

  res.json({
    entries,
    page,
    hasMore: page * limit < total,
    // Powers the filter dropdown without a second round trip. distinct() over
    // an indexed field on a TTL-bounded collection is cheap enough here.
    actions: await AdminAuditLog.distinct("action"),
  });
};