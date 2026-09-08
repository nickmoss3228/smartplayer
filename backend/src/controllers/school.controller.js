// controllers/school.controller.js
//
// "Dream School" — one growing isometric campus. See
// docs/room-game-concept.md.
//
// The save is a SET OF ROOMS. Everything else on screen — the rectangles, the
// furniture, the people, which wallpapers are selectable — is derived from it.
// There is still no item shop, no per-slot placement, and no price in any
// request body: a purchase names a room id and nothing else, and the server
// looks up what that room costs at the moment the request lands. A client
// cannot name a price, a currency or a discount, because it never sends one.

import { User } from "../models/User.js";
import { spendFrom, grantFrom } from "../helpers/spendCurrency.js";
import {
  SCHOOL_STAGES,
  SCHOOL_LAYOUTS,
  SCHOOL_WALLPAPERS,
  SCHOOL_FLOORS,
  SCHOOL_VARIANTS,
  STARTER_STAGE,
  MAX_STAGE,
  DEFAULT_LAYOUT_ID,
  DEFAULT_WALLPAPER_ID,
  DEFAULT_FLOOR_ID,
  DEFAULT_VARIANT_ID,
  LEGACY_STAGE_ROOMS,
  buyBlocker,
  getRoomSpec,
  getLayout,
  getWallpaper,
  getFloor,
  customisable,
  levelFor,
  moraleFor,
  payrollDue,
  weeksOwed,
  getStage,
  LOOK_FIELDS,
  starterRoomIds,
  variantForUserId,
} from "../config/schoolCatalog.js";

// What the client actually gets.
//
// `levelFloor` is the player's old ten-stage index, and it goes over the wire
// because the client derives the level with the same levelFor the server does
// and would otherwise compute a lower one for a migrated player. Documents
// written by the previous dollhouse still carry unlockedRoomIds / ownedItemIds
// / placed / focusedRoomId alongside these; picking fields explicitly is what
// keeps that debris off the wire without a migration over the collection.
function serializeSchool(school) {
  return {
    ownedRoomIds: knownRooms(school?.variantId, school?.ownedRoomIds),
    levelFloor: clampStage(school?.stage),
    layoutId: school?.layoutId ?? DEFAULT_LAYOUT_ID,
    wallpaperId: school?.wallpaperId ?? DEFAULT_WALLPAPER_ID,
    floorId: school?.floorId ?? DEFAULT_FLOOR_ID,
    presets: knownPresets(school?.variantId, school?.presets),
    variantId: knownVariant(school?.variantId),
    payroll: serializePayroll(school),
  };
}

// What the client needs to draw the advisor and the Pay button. All derived,
// which is why it is computed on the way out rather than stored: the client
// runs the same three functions on the same date and gets the same answers.
function serializePayroll(school) {
  const variantId = knownVariant(school?.variantId);
  const rooms = knownRooms(variantId, school?.ownedRoomIds);
  const level = levelFor(rooms, clampStage(school?.stage));
  const weeks = weeksOwed(school?.payroll?.lastPaidAt);
  return {
    lastPaidAt: school?.payroll?.lastPaidAt ?? null,
    weeksOwed: weeks,
    morale: moraleFor(weeks),
    due: payrollDue(getStage(level).teachers, rooms.length, weeks),
  };
}

// A preset for a room the catalog no longer has, or naming a look that does not
// exist, would be applied to nothing and never cleared — the player would see a
// room they cannot reset. Both are dropped on the way out rather than trusted.
function knownPresets(variantId, presets) {
  const variant = knownVariant(variantId);
  const out = {};
  for (const [roomId, preset] of Object.entries(presets ?? {})) {
    const spec = getRoomSpec(variant, roomId);
    if (!spec || !preset || typeof preset !== "object") continue;
    const allowed = customisable(spec.kind, spec.outdoor);
    const kept = {};
    for (const [field, lookup] of LOOK_FIELDS) {
      const id = preset[field];
      // Level 9 rather than the player's level: a look they had unlocked and
      // then somehow fell below should still render, and the write path is
      // where the unlock rule belongs.
      if (allowed.includes(field) && typeof id === "string" && lookup(id, MAX_STAGE)) {
        kept[field] = id;
      }
    }
    if (Object.keys(kept).length) out[roomId] = kept;
  }
  return out;
}

// An unknown variant id (a hand edit, or a floorplan removed from the catalog)
// would render as nothing at all, so it is pinned to a real one rather than
// trusted.
function knownVariant(id) {
  return SCHOOL_VARIANTS.some((v) => v.id === id) ? id : DEFAULT_VARIANT_ID;
}

// A room id the catalog no longer has would be counted toward the level and
// then never drawn, so it is dropped on the way out rather than trusted. The
// starter rooms are unioned in because a player must always have somewhere to
// stand, even if their document predates them.
function knownRooms(variantId, ids) {
  const variant = knownVariant(variantId);
  const list = Array.isArray(ids) ? ids : [];
  const real = new Set(list.filter((id) => getRoomSpec(variant, id)));
  for (const id of starterRoomIds(variant)) real.add(id);
  return [...real];
}

// A level floor out of range would unlock looks that do not exist, so it is
// pinned rather than trusted. This also covers documents from before the field
// existed, where `stage` is undefined.
function clampStage(value) {
  if (!Number.isInteger(value)) return STARTER_STAGE;
  return Math.min(MAX_STAGE, Math.max(STARTER_STAGE, value));
}

/**
 * Normalises a player's school on read, lazily, in up to three conditional
 * writes. Anyone who played the dollhouse has a `school` subtree of the wrong
 * shape, anyone older has none at all, and anyone who played the ten-stage
 * version has a stage index but no rooms.
 *
 * These write to the DOCUMENT rather than checking the hydrated model, and that
 * distinction is the whole point. Mongoose applies schema defaults on
 * hydration, so a user who has never stored `school.stage` still reads back as
 * stage 0 — the missing field is invisible from here, but extremely visible to
 * MongoDB, where a filter on {"school.stage": 0} does NOT match a document that
 * lacks the field. That mismatch made the old upgrade endpoint's concurrency
 * guard fail for every player on their very first upgrade: charged, then
 * refunded, then 409. A conditional $set costs one round-trip and closes it.
 *
 * The order is forced. The room migration needs a variantId to look rooms up
 * in, and the variantId is itself assigned lazily by the write above it, so it
 * cannot be folded into the same update and cannot run before it.
 */
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
  // The payroll clock starts on first read rather than at signup, so an account
  // created a year ago and opened today is not eight weeks in arrears for a
  // school it has never seen.
  await User.updateOne(
    { _id: userId, "school.payroll.lastPaidAt": { $exists: false } },
    { $set: { "school.payroll.lastPaidAt": new Date() } },
  );

  const user = await User.findById(userId).select("school wallet");
  if (!user) return null;
  if (Array.isArray(user.school?.ownedRoomIds) && user.school.ownedRoomIds.length) {
    return user;
  }

  // The one-off migration off the ten-stage economy: grant exactly the rooms
  // the player's old stage was already putting on screen. LEGACY_STAGE_ROOMS is
  // a frozen literal rather than a call into the live catalog, so the catalog
  // can move without silently changing what a migrating player is handed.
  //
  // `school.stage` is deliberately left in place, and keeps being read, as the
  // level floor: a migrated player's rooms do not always re-earn the level they
  // paid for, and a level that went down would invalidate a wallpaper they had
  // already chosen.
  const stage = clampStage(user.school?.stage);
  const granted = LEGACY_STAGE_ROOMS[stage] ?? starterRoomIds(user.school?.variantId);
  const migrated = await User.findOneAndUpdate(
    { _id: userId, "school.ownedRoomIds": { $in: [null, []] } },
    { $set: { "school.ownedRoomIds": granted } },
    { new: true, select: "school wallet" },
  );
  return migrated ?? User.findById(userId).select("school wallet");
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

// POST /progress/school/rooms   { roomId }   [one currency, named by the room]
//
// The whole economy. The body names a room and nothing else; the price, the
// currency and whether the room may be bought at all are all read from the
// catalog here.
export async function buyRoom(req, res) {
  try {
    const userId = req.user._id;
    const roomId = typeof req.body?.roomId === "string" ? req.body.roomId : null;
    if (!roomId) return res.status(400).json({ message: "No room named" });

    const user = await ensureSchool(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const variantId = knownVariant(user.school?.variantId);
    const owned = knownRooms(variantId, user.school?.ownedRoomIds);
    const spec = getRoomSpec(variantId, roomId);
    if (!spec) return res.status(404).json({ message: "No such room" });

    // The parent rule, checked here rather than only in the UI that greys the
    // button out: it is what keeps an owned set a connected subtree, and a
    // stranded room would open its doorway onto grass.
    const blocker = buyBlocker(variantId, owned, roomId);
    if (blocker === "owned") {
      return res.status(409).json({ message: "You already have that room" });
    }
    if (blocker === "locked") {
      return res.status(400).json({ message: "Build the room it opens off first" });
    }

    const wallet = await spendFrom(userId, spec.currency, spec.price);
    if (!wallet) {
      return res.status(400).json({ message: "Not enough coins yet" });
    }

    // Conditional on the room not already being there: two taps racing each
    // other have both been charged by spendFrom, but only one may record the
    // room. The loser's write matches nothing and it is refunded below rather
    // than paying twice for one room. $addToSet alone would not do — it is
    // idempotent, so it would report success for both.
    const updated = await User.findOneAndUpdate(
      { _id: userId, "school.ownedRoomIds": { $ne: roomId } },
      { $addToSet: { "school.ownedRoomIds": roomId } },
      { new: true, select: "school" },
    );

    if (!updated) {
      const refunded = await grantFrom(userId, spec.currency, spec.price);
      return res.status(409).json({
        message: "You already have that room",
        wallet: refunded ?? wallet,
      });
    }

    res.json({ school: serializeSchool(updated.school), wallet });
  } catch (error) {
    console.error("buyRoom error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /progress/school/payroll   (no body)   [bitAward]
//
// Pays every week owed, at the rate the catalog says right now. No body, for
// the same reason the room purchase has none: the client never names a price.
//
// Nothing happens if you do not call this. Morale falls, the school gets
// quieter, and that is the entire consequence — no room closes and nothing is
// taken away. See the payroll section of the catalog.
export async function paySchoolPayroll(req, res) {
  try {
    const userId = req.user._id;
    const user = await ensureSchool(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const variantId = knownVariant(user.school?.variantId);
    const rooms = knownRooms(variantId, user.school?.ownedRoomIds);
    const level = levelFor(rooms, clampStage(user.school?.stage));
    const paidAt = user.school?.payroll?.lastPaidAt;
    const weeks = weeksOwed(paidAt);

    if (weeks <= 0) {
      return res.status(400).json({ message: "Nothing is owed yet" });
    }

    const due = payrollDue(getStage(level).teachers, rooms.length, weeks);
    const wallet = await spendFrom(userId, "bitAward", due);
    if (!wallet) {
      return res.status(400).json({ message: "Not enough coins yet" });
    }

    // Conditional on the clock not having moved. Two taps racing each other
    // have both been charged, and only one may reset the date; the loser is
    // refunded rather than paying the same wages twice.
    //
    // Filtered on the OLD date rather than on weeks owed, because "owes three
    // weeks" is true for a whole week and would let the second tap through.
    const updated = await User.findOneAndUpdate(
      { _id: userId, "school.payroll.lastPaidAt": paidAt },
      { $set: { "school.payroll.lastPaidAt": new Date() } },
      { new: true, select: "school" },
    );

    if (!updated) {
      const refunded = await grantFrom(userId, "bitAward", due);
      return res.status(409).json({
        message: "Payroll has already gone out",
        wallet: refunded ?? wallet,
      });
    }

    res.json({ school: serializeSchool(updated.school), wallet });
  } catch (error) {
    console.error("paySchoolPayroll error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /progress/school/look   { roomId?, layoutId?, wallpaperId?, floorId? }
//
// Free, so there is no wallet in the response — but not unvalidated. A look is
// only selectable once its level has been reached, and that check lives here
// rather than in the UI that filters the swatch list.
//
// With a `roomId` it writes that room's override; without one it writes the
// school's default, which every room that has not overridden it falls through
// to. An explicit null clears a field back to the default, and that is the only
// way back — a preset you could set and not unset is a trap.
export async function setSchoolLook(req, res) {
  try {
    const userId = req.user._id;
    const { roomId } = req.body ?? {};

    const user = await ensureSchool(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const variantId = knownVariant(user.school?.variantId);
    const level = levelFor(
      knownRooms(variantId, user.school?.ownedRoomIds),
      clampStage(user.school?.stage),
    );

    // Which fields this write may touch. For the school default that is all
    // three; for one room it is whatever that KIND can actually show.
    let allowed = LOOK_FIELDS.map(([field]) => field);
    let prefix = "school.";
    if (roomId !== undefined) {
      if (typeof roomId !== "string") {
        return res.status(400).json({ message: "No room named" });
      }
      const spec = getRoomSpec(variantId, roomId);
      if (!spec) return res.status(404).json({ message: "No such room" });
      if (!knownRooms(variantId, user.school?.ownedRoomIds).includes(roomId)) {
        return res.status(400).json({ message: "You have not built that room" });
      }
      allowed = customisable(spec.kind, spec.outdoor);
      prefix = `school.presets.${roomId}.`;
    }

    const set = {};
    const unset = {};
    for (const [field, lookup] of LOOK_FIELDS) {
      const value = req.body?.[field];
      if (value === undefined) continue;
      if (!allowed.includes(field)) {
        return res.status(400).json({ message: "That room cannot change that" });
      }
      // Only a room may be reset; the school itself always has all three.
      if (value === null) {
        if (roomId === undefined) {
          return res.status(400).json({ message: "The school always has a look" });
        }
        unset[`${prefix}${field}`] = "";
        continue;
      }
      if (!lookup(value, level)) {
        return res.status(400).json({ message: "That look is not available yet" });
      }
      set[`${prefix}${field}`] = value;
    }

    if (!Object.keys(set).length && !Object.keys(unset).length) {
      return res.status(400).json({ message: "Nothing to change" });
    }

    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;

    const updated = await User.findByIdAndUpdate(userId, update, {
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
// Lets the hand-maintained frontend mirror be checked against the server, and
// lets a future client drop its copy entirely. These are the numbers actually
// charged, and — unlike before rooms became purchasable — the geometry too,
// because a build view has to draw a room the player does not own yet.
export async function getSchoolCatalog(_req, res) {
  res.json({
    stages: SCHOOL_STAGES,
    variants: SCHOOL_VARIANTS,
    layouts: SCHOOL_LAYOUTS,
    wallpapers: SCHOOL_WALLPAPERS,
    floors: SCHOOL_FLOORS,
  });
}
