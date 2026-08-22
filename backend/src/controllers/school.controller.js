// controllers/school.controller.js
//
// "Dream School" — one growing isometric campus. See
// docs/room-game-concept.md.
//
// The surface is deliberately tiny: read your school, press the one button,
// change how it looks. There is no shop, no item ids, no per-slot placement,
// and the upgrade request carries no body at all — it charges whatever the
// catalog says the NEXT stage costs at the moment the request lands. A client
// cannot name a price, a stage, or a discount, because it never sends one.

import { User } from "../models/User.js";
import { spendMany } from "../helpers/spendCurrency.js";
import {
  SCHOOL_STAGES,
  SCHOOL_LAYOUTS,
  SCHOOL_WALLPAPERS,
  SCHOOL_FLOORS,
  STARTER_STAGE,
  MAX_STAGE,
  DEFAULT_LAYOUT_ID,
  DEFAULT_WALLPAPER_ID,
  DEFAULT_FLOOR_ID,
  DEFAULT_VARIANT_ID,
  SCHOOL_VARIANTS,
  variantForUserId,
  getNextStage,
  getLayout,
  getWallpaper,
  getFloor,
} from "../config/schoolCatalog.js";

// The four fields the client actually gets. Documents written by the previous
// dollhouse still carry unlockedRoomIds / ownedItemIds / placed / focusedRoomId
// alongside these; picking fields explicitly is what keeps that debris off the
// wire without a migration over the collection.
function serializeSchool(school) {
  return {
    stage: clampStage(school?.stage),
    layoutId: school?.layoutId ?? DEFAULT_LAYOUT_ID,
    wallpaperId: school?.wallpaperId ?? DEFAULT_WALLPAPER_ID,
    floorId: school?.floorId ?? DEFAULT_FLOOR_ID,
    variantId: knownVariant(school?.variantId),
  };
}

// An unknown variant id (a hand edit, or a floorplan removed from the catalog)
// would render as nothing at all, so it is pinned to a real one rather than
// trusted.
function knownVariant(id) {
  return SCHOOL_VARIANTS.some((v) => v.id === id) ? id : DEFAULT_VARIANT_ID;
}

// A stage index out of range would render as an empty campus, so it is pinned
// rather than trusted. This also covers documents from before the field
// existed, where `stage` is undefined.
function clampStage(value) {
  if (!Number.isInteger(value)) return STARTER_STAGE;
  return Math.min(MAX_STAGE, Math.max(STARTER_STAGE, value));
}

// Anyone who played the dollhouse has a `school` subtree of the wrong shape,
// and anyone older has none at all. Both are normalised lazily on first read —
// the new shape is entirely derivable from the catalog, so there is nothing to
// preserve and no reason to run a migration.
//
// This writes to the DOCUMENT rather than checking the hydrated model, and that
// distinction is the whole point. Mongoose applies schema defaults on
// hydration, so a user who has never stored `school.stage` still reads back as
// stage 0 — the missing field is invisible from here, but extremely visible to
// MongoDB, where a filter on {"school.stage": 0} does NOT match a document that
// lacks the field. That mismatch made upgradeSchool's concurrency guard fail
// for every player on their very first upgrade: charged, then refunded, then
// 409. A conditional $set costs one round-trip and closes it for good.
async function ensureSchool(userId) {
  await User.updateOne(
    { _id: userId, "school.stage": { $exists: false } },
    {
      $set: {
        "school.stage": STARTER_STAGE,
        "school.layoutId": DEFAULT_LAYOUT_ID,
        "school.wallpaperId": DEFAULT_WALLPAPER_ID,
        "school.floorId": DEFAULT_FLOOR_ID,
      },
    },
  );
  // Assigned once, from the id, so it is stable without a migration and the
  // same on every device. A separate conditional write from the one above
  // because a player who already had a school still needs a variant.
  await User.updateOne(
    { _id: userId, "school.variantId": { $exists: false } },
    { $set: { "school.variantId": variantForUserId(userId) } },
  );

  return User.findById(userId).select("school wallet");
}

// GET /progress/school
export async function getSchool(req, res) {
  try {
    const user = await ensureSchool(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ school: serializeSchool(user.school), wallet: user.wallet });
  } catch (error) {
    console.error("getSchool error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /progress/school/:userId
// Read-only snapshot for visiting. No wallet: what another player can afford is
// none of your business, and the old room-visit endpoint set that precedent.
export async function getPlayerSchool(req, res) {
  try {
    const user = await User.findById(req.params.userId).select("school nickname");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      school: serializeSchool(user.school),
      nickname: user.nickname ?? null,
    });
  } catch (error) {
    console.error("getPlayerSchool error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /progress/school/upgrade   (no body)   [bitAward + bitWord + bitPhrase]
//
// The whole economy. Charging all three currencies together is what makes
// spendMany's single conditional update matter: a player short on BitPhrase
// alone must not lose their BitAward finding that out.
export async function upgradeSchool(req, res) {
  try {
    const userId = req.user._id;

    const user = await ensureSchool(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const current = clampStage(user.school.stage);
    const next = getNextStage(current);
    if (!next) {
      return res.status(400).json({ message: "The school is fully built" });
    }

    const wallet = await spendMany(userId, next.cost);
    if (!wallet) {
      return res.status(400).json({ message: "Not enough coins yet" });
    }

    // Conditional on the stage not having moved: two upgrade requests racing
    // each other have both already been charged by spendMany, but only one
    // may advance the stage. The loser's write is a no-op and it is refunded
    // below rather than silently paying twice for one stage.
    // ensureSchool has guaranteed the field exists, but the guard tolerates it
    // being absent at the starter stage anyway: this is the one filter in the
    // codebase whose failure costs the player coins, so it does not get to
    // depend on another function having run first.
    const stageGuard =
      current === STARTER_STAGE
        ? { $or: [{ "school.stage": current }, { "school.stage": { $exists: false } }] }
        : { "school.stage": current };

    const updated = await User.findOneAndUpdate(
      { _id: userId, ...stageGuard },
      { $set: { "school.stage": next.index } },
      { new: true, select: "school" },
    );

    if (!updated) {
      const refunded = await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            "wallet.bitAward": next.cost.bitAward,
            "wallet.bitWord": next.cost.bitWord,
            "wallet.bitPhrase": next.cost.bitPhrase,
          },
        },
        { new: true, select: "wallet" },
      );
      return res.status(409).json({
        message: "That upgrade already happened",
        wallet: refunded?.wallet ?? wallet,
      });
    }

    res.json({ school: serializeSchool(updated.school), wallet });
  } catch (error) {
    console.error("upgradeSchool error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /progress/school/look   { layoutId?, wallpaperId?, floorId? }
//
// Free, so there is no wallet in the response — but not unvalidated: a look is
// only selectable once its stage has been reached, and that check lives here
// rather than in the UI that filters the swatch list.
export async function setSchoolLook(req, res) {
  try {
    const userId = req.user._id;
    const { layoutId, wallpaperId, floorId } = req.body ?? {};

    const user = await ensureSchool(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const stage = clampStage(user.school.stage);

    const update = {};
    if (layoutId !== undefined) {
      if (!getLayout(layoutId, stage)) {
        return res.status(400).json({ message: "That layout is not available yet" });
      }
      update["school.layoutId"] = layoutId;
    }
    if (wallpaperId !== undefined) {
      if (!getWallpaper(wallpaperId, stage)) {
        return res.status(400).json({ message: "That wallpaper is not available yet" });
      }
      update["school.wallpaperId"] = wallpaperId;
    }
    if (floorId !== undefined) {
      if (!getFloor(floorId, stage)) {
        return res.status(400).json({ message: "That floor is not available yet" });
      }
      update["school.floorId"] = floorId;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nothing to change" });
    }

    const updated = await User.findByIdAndUpdate(userId, { $set: update }, {
      new: true,
      select: "school",
    });

    res.json({ school: serializeSchool(updated.school) });
  } catch (error) {
    console.error("setSchoolLook error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /progress/school/catalog
// Lets the generated frontend mirror be checked against the server, and lets a
// future client drop its copy entirely. These are the numbers actually charged.
export async function getSchoolCatalog(_req, res) {
  res.json({
    stages: SCHOOL_STAGES,
    layouts: SCHOOL_LAYOUTS,
    wallpapers: SCHOOL_WALLPAPERS,
    floors: SCHOOL_FLOORS,
  });
}
