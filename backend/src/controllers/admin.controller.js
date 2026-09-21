import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config/env.js";
import {
  audit,
  entitlements as entitlementsRepo,
  isId,
  progress as progressRepo,
  sessions as sessionsRepo,
  userDocs,
  users as usersRepo,
} from "../db/index.js";
import { awardCurrency } from "../helpers/awardCurrency.js";
import { safeEqual } from "../helpers/safeEqual.js";
import { sharingScore } from "../config/sessions.js";
import { getCatalog } from "../helpers/catalogStore.js";
import { ownedStoryKeys } from "../config/entitlements.js";
import { resetSchool, serializeSchool } from "./school.controller.js";

const PLAYERS_PAGE_LIMIT = 25;
const AUDIT_PAGE_LIMIT = 50;

// Admin and user tokens are signed with the SAME jwtSecret and today are kept
// apart only by `payload.role !== "admin"` — one stray claim away from a
// privilege escalation. An audience claim makes the separation explicit and
// cheap to verify. Deliberately NOT added to user tokens in the same change:
// that would invalidate every live 7-day session and force a mass re-login.
export const ADMIN_AUDIENCE = "smartplayer-admin";
export const ADMIN_ISSUER = "smartplayer";

/** The target of a support action: by id (Players tab) or by email (the standalone forms). */
function findTarget({ userId, email }) {
  return userId
    ? userDocs.loadUser(userId)
    : userDocs.loadUserBy("email", typeof email === "string" ? email : "");
}

/** Entitlement rows as the admin UI has always received them. */
const entitlementJson = (row) => ({
  sku: row.sku,
  grantedAt: row.grantedAt,
  expiresAt: row.expiresAt ?? null,
  source: row.source,
  paymentId: row.paymentId ?? null,
});

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
  // Grants only. Mongo would happily $inc a balance below zero; the wallet
  // columns now carry CHECK (>= 0), so a deduction would either be refused by
  // the database or silently clamp. Refusing it here says so plainly.
  if (amounts.bitAward < 0 || amounts.bitWord < 0 || amounts.bitPhrase < 0) {
    return res.status(400).json({ error: "Amounts must be positive — this tool grants, it does not deduct." });
  }

  const user = await findTarget({ userId, email });
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

  const product = (await getCatalog()).getProduct(sku);
  if (!product) {
    return res.status(400).json({ error: `Unknown SKU "${sku}".` });
  }

  // NOTE: `purchasable` is deliberately NOT checked. It governs what a
  // CUSTOMER may buy, and an admin granting a not-yet-sellable pack to a
  // reviewer or a tester is exactly the use this endpoint exists for.

  const user = await findTarget({ userId, email });
  if (!user) {
    return res.status(404).json({ error: "No matching user." });
  }

  // Every catalog SKU is perpetual; `days` turns a grant into a trial, so
  // support can hand out a week of a set rather than the set itself.
  //
  // Validated BEFORE deciding whether the grant is dated. `Number("abc")` is
  // NaN, which is not finite, so a mistyped trial length used to fall through
  // to the perpetual branch — a one-week comp silently became a permanent one.
  const daysGiven = days !== undefined && days !== null && days !== "";
  if (daysGiven && !(Number.isInteger(Number(days)) && Number(days) > 0)) {
    return res.status(400).json({ error: "days must be a positive whole number." });
  }
  const duration = daysGiven ? Number(days) : product.durationDays;
  const dated = duration !== null && duration !== undefined;

  const existing = (user.entitlements ?? []).find((row) => row.sku === sku);

  if (dated) {
    // Extend rather than append, matching what a repeat purchase does. The
    // arithmetic — from max(now, current expiry) — happens inside the write,
    // so granting time to a live pass adds to it instead of cutting it short.
    // The existing row's paymentId is carried, not cleared: extending a paid
    // entitlement must not erase which payment bought it.
    await entitlementsRepo.grantOrExtend(user._id, sku, duration, existing?.paymentId ?? null, "admin");
  } else if (!existing) {
    // Perpetual and already held — nothing to do.
    await entitlementsRepo.grantPerpetual(user._id, sku, null, "admin");
  }

  const fresh = (await entitlementsRepo.listFor(user._id)).map(entitlementJson);
  res.json({
    success: true,
    entitlements: fresh,
    ownedStories: ownedStoryKeys(fresh),
    grantedDays: dated ? duration : null,
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

  const user = await findTarget({ userId, email });
  if (!user) return res.status(404).json({ error: "No matching user." });

  const removed = await entitlementsRepo.revoke(user._id, sku);

  const fresh = (await entitlementsRepo.listFor(user._id)).map(entitlementJson);
  res.json({
    success: true,
    // 0 means the user never had it — worth surfacing rather than reporting a
    // cheerful success for a no-op.
    removed,
    entitlements: fresh,
  });
};

// GET /api/admin/players?q=&page=
// Full user roster for moderation — unlike the privacy-conscious public
// search (/api/user/search), admins can browse everyone, not just look up a
// known identifier.
export const listPlayers = async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = PLAYERS_PAGE_LIMIT;

  const { docs: users, total } = await userDocs.pageUserDocs(q, (page - 1) * limit, limit);

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
  const user = await userDocs.loadUser(req.params.userId);
  if (!user) return res.status(404).json({ error: "No user with that id." });

  await sessionsRepo.removeAll(user._id);

  res.json({ success: true, user: { _id: user._id, username: user.username, email: user.email } });
};

// PATCH /api/admin/players/:userId/ban  { banned: boolean }
export const setPlayerBanned = async (req, res) => {
  const { banned } = req.body;
  if (typeof banned !== "boolean") {
    return res.status(400).json({ error: "banned must be a boolean." });
  }

  const user = isId(req.params.userId)
    ? await usersRepo.update(req.params.userId, { banned })
    : null;
  if (!user) return res.status(404).json({ error: "No user with that id." });

  res.json({
    success: true,
    user: { _id: user.id, username: user.username, email: user.email ?? undefined, banned: user.banned },
  });
};

// GET /api/admin/players/:userId/progress — a consolidated read-only view for
// the "review progress" action, fanning out across the per-concern tables
// instead of introducing a new aggregate.
export const getPlayerProgress = async (req, res) => {
  const user = await userDocs.loadUser(req.params.userId, { learnedWords: true });
  if (!user) return res.status(404).json({ error: "No user with that id." });

  const [levelProgress, storyProgress] = await Promise.all([
    progressRepo.allFor(user._id),
    progressRepo.allStoryProgressFor(user._id),
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

// POST /api/admin/players/:userId/reset-school
//
// Wipe one player's Dream School back to its starting state so the game can be
// played through again from the top. Built for testing: the school is bought
// one room at a time and there is no in-game way to un-buy anything, so
// without this the only way to see an early room again is a fresh account.
//
// Admin-gated and audited like every other mutation here. The wallet is left
// alone on purpose — see resetSchool in school.controller.js for why, and for
// what else it deliberately preserves.
export const resetPlayerSchool = async (req, res) => {
  const { userId } = req.params;

  const user = await resetSchool(userId);
  if (!user) return res.status(404).json({ error: "No user with that id." });

  // Echoed back in the same shape the game itself reads, so the caller can see
  // what the player will now load rather than assuming the write did what it
  // said.
  res.json({ success: true, school: serializeSchool(user.school) });
};

// Audit rows in the shape the audit tab has always read: `_id`, and `actor`
// as a nested object rather than the table's flat columns.
const auditEntryJson = (row) => ({
  _id: row.id,
  actor: { name: row.actorName, sessionId: row.actorSessionId, tokenIssuedAt: row.actorTokenIssuedAt },
  ip: row.ip,
  userAgent: row.userAgent,
  action: row.action,
  method: row.method,
  path: row.path,
  targetType: row.targetType,
  targetId: row.targetId,
  statusCode: row.statusCode,
  outcome: row.outcome,
  durationMs: row.durationMs,
  summary: row.summary,
  createdAt: row.createdAt,
});

// Query-string values can arrive as arrays (?actor=a&actor=b). Only a single
// string is a filter; anything else is ignored rather than sent to the query.
const stringParam = (value) => (typeof value === "string" && value ? value : undefined);

// GET /api/admin/audit?page=&actor=&action=&targetId=
// A GET on purpose: the audit middleware only records mutating methods, so
// reading the log never pollutes it.
export const listAuditLog = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = AUDIT_PAGE_LIMIT;

  const [{ rows, total }, actions] = await Promise.all([
    audit.page(
      {
        actorName: stringParam(req.query.actor),
        action: stringParam(req.query.action),
        targetId: stringParam(req.query.targetId),
      },
      (page - 1) * limit,
      limit,
    ),
    // Powers the filter dropdown without a second round trip from the client.
    audit.distinctActions(),
  ]);

  res.json({
    entries: rows.map(auditEntryJson),
    page,
    hasMore: page * limit < total,
    actions,
  });
};
