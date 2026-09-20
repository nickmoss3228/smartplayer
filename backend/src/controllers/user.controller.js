// controllers/user.controller.js
import { userDocs, users as usersRepo } from "../db/index.js";
import { ownedStoryKeys } from "../config/entitlements.js";
import { CURRENCY } from "../config/priceCatalog.js";
import { getCatalog } from "../helpers/catalogStore.js";
import { isPurchasable } from "../config/basketPricing.js";
import { config } from "../config/env.js";

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_RESULTS_LIMIT = 20;

export async function getProfile(req, res) {
  try {
    const user = await userDocs.loadUser(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      username: user.username,
      email: user.email,
      nickname: user.nickname ?? user.username,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateProfile(req, res) {
  try {
    const { nickname } = req.body;
    const updates = {};

    if (nickname !== undefined) {
      if (typeof nickname !== "string")
        return res
          .status(400)
          .json({ message: "Nickname must be between 1 and 30 characters" });
      const trimmed = nickname.trim();
      if (trimmed.length < 1 || trimmed.length > 30)
        return res
          .status(400)
          .json({ message: "Nickname must be between 1 and 30 characters" });
      updates.nickname = trimmed;
    }

    const user = await usersRepo.update(req.user._id, updates);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      username: user.username,
      email: user.email ?? undefined,
      nickname: user.nickname ?? user.username,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /user/heartbeat — called periodically by the frontend while a
// session is open, so other players see this user as "online" (see
// searchPlayers below). A bumped timestamp is the simplest presence signal.
export async function heartbeat(req, res) {
  try {
    await usersRepo.touchLastActive(req.user._id);
    res.json({ ok: true });
  } catch (error) {
    console.error("Heartbeat error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /user/search?q=... — find a specific player by username/nickname or
// exact email, rather than exposing a full browsable roster (no directory of
// every signed-up user — you have to already know who you're looking for).
// An email match must be exact (case-insensitive) so a partial guess can't
// be used to enumerate other users' addresses; username/nickname allow a
// partial, case-insensitive match since those are already shown to other
// players once found. The matching rule itself lives in searchUserDocs.
export async function searchPlayers(req, res) {
  try {
    // `?q=a&q=b` arrives as an array, and `?q[x]=1` as an object.
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < SEARCH_MIN_LENGTH) return res.json({ players: [] });

    const users = await userDocs.searchUserDocs(q, {
      excludeId: req.user._id,
      limit: SEARCH_RESULTS_LIMIT,
    });

    const now = Date.now();
    res.json({
      players: users.map((user) => ({
        id: user._id,
        username: user.username,
        nickname: user.nickname ?? user.username,
        character: user.character,
        online: now - new Date(user.lastActiveAt).getTime() < ONLINE_THRESHOLD_MS,
      })),
    });
  } catch (error) {
    console.error("Search players error:", error);
    res.status(500).json({ message: "Server error" });
  }
}


// ── GET /user/entitlements ─────────────────────────────────────────────────
// What this account owns, already resolved. The client does NOT re-implement
// config/entitlements.js — it is told the answer and does a Set lookup. One
// copy of the rule, on the side that enforces it.
export async function getEntitlements(req, res) {
  try {
    const rows = req.user.entitlements ?? [];
    const now = Date.now();
    const catalog = await getCatalog();

    res.json({
      // The raw rows, for anything that wants to show when a purchase was made.
      entitlements: rows.map((row) => ({
        sku: row.sku,
        grantedAt: row.grantedAt,
        expiresAt: row.expiresAt ?? null,
        source: row.source,
      })),
      // The resolved answer — every paid story this account owns, with sets and
      // levels already expanded. This is what the UI actually gates on.
      ownedStories: ownedStoryKeys(rows, now, catalog),
      currency: CURRENCY,
      // Which SKUs the server will actually price right now. MUST go through
      // isPurchasable(): reading `p.purchasable` alone ignores the
      // PURCHASABLE_SKUS environment override, so staging reported one
      // sellable SKU while /api/payments/config reported thirteen — and the
      // paywall modal showed "coming soon" on packs it would happily sell.
      purchasableSkus: catalog.products
        .filter((p) => isPurchasable(p.sku, config.payments.purchasableSkus, catalog))
        .map((p) => p.sku),
    });
  } catch (error) {
    console.error("Get entitlements error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
