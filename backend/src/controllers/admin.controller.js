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
import { sharingScore } from "../config/sessions.js";
import { getProduct, PASS_DURATION_DAYS } from "../config/priceCatalog.js";
import { resolveAccess, ownedStoryKeys } from "../config/entitlements.js";

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

// POST /api/admin/grant-entitlement   { userId | email, sku, days? }
//
// The manual side of the paywall: comps, promotions, a school licence, and
// putting right a payment that went wrong. Deliberately built BEFORE any
// provider exists — this is what makes entitlements useful on their own, and
// it is the endpoint support will reach for first when someone says "I paid
// and got nothing".
//
// Audited for free: middleware/auditLog.js records every mutating admin route.
export const grantEntitlement = async (req, res) => {
  const { userId, email, sku, days } = req.body;

  if (!userId && !email) {
    return res.status(400).json({ error: "userId or email is required." });
  }

  const product = getProduct(sku);
  if (!product) {
    return res.status(400).json({ error: `Unknown SKU "${sku}".` });
  }

  // NOTE: `purchasable` is deliberately NOT checked. It governs what a
  // CUSTOMER may buy, and an admin granting a not-yet-sellable pack to a
  // reviewer or a tester is exactly the use this endpoint exists for.

  const user = userId
    ? await User.findById(userId).select("_id entitlements")
    : await User.findOne({ email: email.toLowerCase().trim() }).select("_id entitlements");
  if (!user) {
    return res.status(404).json({ error: "No matching user." });
  }

  // A dated SKU defaults to its catalog duration; `days` overrides it so a
  // support case can hand out a week rather than a full quarter.
  const duration = days === undefined ? product.durationDays : Number(days);
  const dated = duration !== null && duration !== undefined && Number.isFinite(duration);

  const existing = (user.entitlements ?? []).find((row) => row.sku === sku);
  const now = Date.now();

  if (dated) {
    // Extend rather than append, matching what a repeat purchase does: two
    // overlapping rows for one SKU are a reconciliation problem nobody wants,
    // and extending from max(now, current expiry) means granting time to a
    // live pass adds to it instead of cutting it short.
    const from = existing?.expiresAt ? Math.max(now, +new Date(existing.expiresAt)) : now;
    const expiresAt = new Date(from + duration * 24 * 60 * 60 * 1000);

    if (existing) {
      await User.updateOne(
        { _id: user._id, "entitlements.sku": sku },
        { $set: { "entitlements.$.expiresAt": expiresAt, "entitlements.$.source": "admin" } },
      );
    } else {
      await User.updateOne(
        { _id: user._id },
        { $push: { entitlements: { sku, expiresAt, source: "admin", grantedAt: new Date() } } },
      );
    }
  } else if (!existing) {
    // Perpetual and already held — nothing to do, and re-pushing would
    // duplicate the row.
    await User.updateOne(
      { _id: user._id },
      { $push: { entitlements: { sku, expiresAt: null, source: "admin", grantedAt: new Date() } } },
    );
  }

  const fresh = await User.findById(user._id).select("entitlements");
  const { allAccess, allAccessExpiresAt } = resolveAccess(fresh.entitlements);
  res.json({
    success: true,
    entitlements: fresh.entitlements,
    ownedStories: ownedStoryKeys(fresh.entitlements),
    hasAllAccess: allAccess,
    allAccessExpiresAt,
    // Echoed so a caller who omitted `days` can see what the catalog default was.
    grantedDays: dated ? duration : null,
    passDurationDays: PASS_DURATION_DAYS,
  });
};

// DELETE /api/admin/entitlement   { userId | email, sku }
// Revokes one SKU. Used for refunds and for undoing a mis-typed grant.
export const revokeEntitlement = async (req, res) => {
  const { userId, email, sku } = req.body;

  if (!userId && !email) {
    return res.status(400).json({ error: "userId or email is required." });
  }
  if (!sku) return res.status(400).json({ error: "sku is required." });

  const user = userId
    ? await User.findById(userId).select("_id")
    : await User.findOne({ email: email.toLowerCase().trim() }).select("_id");
  if (!user) return res.status(404).json({ error: "No matching user." });

  const result = await User.updateOne(
    { _id: user._id },
    { $pull: { entitlements: { sku } } },
  );

  const fresh = await User.findById(user._id).select("entitlements");
  res.json({
    success: true,
    // 0 means the user never had it — worth surfacing rather than reporting a
    // cheerful success for a no-op.
    removed: result.modifiedCount,
    entitlements: fresh.entitlements,
  });
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
      .select(
        "username email nickname avatar banned wallet createdAt lastActiveAt sessions loginSignals"
      )
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
      // A heuristic, never a verdict — read the weighting note on
      // sharingScore() in config/sessions.js before acting on it. Nothing here
      // bans anyone; it exists to rank which accounts are worth a human look.
      // Raw IPs are deliberately not exposed: only /24-or-/48 prefixes are
      // stored at all, and even those stay server-side.
      sharing: sharingScore(user),
    })),
    page,
    hasMore: page * limit < total,
  });
};

// POST /api/admin/players/:userId/logout-all — revoke every session on an
// account. The companion to the ban button: useful on its own when a password
// has clearly been passed around but the account is worth keeping, and useful
// alongside a ban to end sessions the moment they are cut off rather than on
// their next request.
export const logoutAllPlayerSessions = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { $set: { sessions: [] } },
    { new: true, select: "username email" }
  );
  if (!user) return res.status(404).json({ error: "No user with that id." });

  res.json({ success: true, user });
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