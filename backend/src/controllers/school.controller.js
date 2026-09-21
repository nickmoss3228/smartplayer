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

import { db, userDocs } from "../db/index.js";
import { spendFrom } from "../helpers/spendCurrency.js";
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
// and would otherwise compute a lower one for a migrated player. Picking fields
// explicitly keeps anything else on the save off the wire.
export function serializeSchool(school) {
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
// stand, even if their save predates them.
function knownRooms(variantId, ids) {
  const variant = knownVariant(variantId);
  const list = Array.isArray(ids) ? ids : [];
  const real = new Set(list.filter((id) => getRoomSpec(variant, id)));
  for (const id of starterRoomIds(variant)) real.add(id);
  return [...real];
}

// A level floor out of range would unlock looks that do not exist, so it is
// pinned rather than trusted.
function clampStage(value) {
  if (!Number.isInteger(value)) return STARTER_STAGE;
  return Math.min(MAX_STAGE, Math.max(STARTER_STAGE, value));
}

/**
 * Normalises a player's school on read.
 *
 * In Postgres most of what the Mongo version had to back-fill cannot be missing:
 * stage and the three look ids are NOT NULL, and the campus variant is assigned
 * from the user id when the account is created (db/repos/users.repo create).
 * Two things still start empty and are settled here, once:
 *
 *   - the payroll clock starts on first read rather than at signup, so an
 *     account created a year ago and opened today is not weeks in arrears for a
 *     school it has never seen;
 *   - an empty room list is granted the rooms its stage was already putting on
 *     screen (LEGACY_STAGE_ROOMS, a frozen literal, so the catalog can move
 *     without silently changing what a player is handed) — for a new player,
 *     just the starter classroom.
 *
 * Done under the user's row lock. Without it, two first requests racing could
 * both see an empty room list, and the late one's write of the starter rooms
 * could land on top of a room the other had just paid for.
 */
async function ensureSchool(userId) {
  return db().transaction(async (tx) => {
    const user = await userDocs.loadUser(userId, { lock: true }, tx);
    if (!user) return null;

    let changed = false;

    if (!user.school.payroll?.lastPaidAt) {
      user.school.payroll = { lastPaidAt: new Date() };
      changed = true;
    }

    if (!Array.isArray(user.school.ownedRoomIds) || user.school.ownedRoomIds.length === 0) {
      const stage = clampStage(user.school.stage);
      user.school.ownedRoomIds = LEGACY_STAGE_ROOMS[stage] ?? starterRoomIds(user.school.variantId);
      changed = true;
    }

    if (changed) await user.save(tx);
    return user;
  });
}

/**
 * Put a player's school back to where a brand-new account starts.
 *
 * A testing tool, and the reason it lives HERE rather than in
 * admin.controller.js is that it has to stay in step with ensureSchool above:
 * between them they are the only two places that state what a fresh school
 * looks like, and a field added to the save without being added to both would
 * leave a "reset" school carrying the previous player's data in that field.
 * Keep them adjacent so that is hard to miss.
 *
 * Two things are deliberately NOT cleared:
 *
 *   wallet    — currency is earned by listening, not by playing the school, so
 *               wiping it would destroy real progress in a different game and
 *               leave nothing to re-buy rooms with. Re-testing a purchase
 *               needs money in hand; the Players tab grants it separately.
 *   variantId — the campus shape is an assignment, not progress. It is
 *               normally derived from the user id, but it is stored
 *               specifically so it can be reassigned by hand, and a reset must
 *               not quietly undo that.
 *
 * Returns the reloaded user, or null if there is no such id.
 */
export async function resetSchool(userId) {
  return db().transaction(async (tx) => {
    const user = await userDocs.loadUser(userId, { lock: true }, tx);
    if (!user) return null;

    const variantId = user.school?.variantId
      ? knownVariant(user.school.variantId)
      : variantForUserId(userId);

    // lastPaidAt is set to now rather than cleared: an unset clock reads as "has
    // never paid", and weeksOwed would put the freshly reset school straight
    // into arrears — the exact thing ensureSchool sets it on first read to avoid.
    user.school = {
      ...user.school,
      ownedRoomIds: starterRoomIds(variantId),
      stage: STARTER_STAGE,
      layoutId: DEFAULT_LAYOUT_ID,
      wallpaperId: DEFAULT_WALLPAPER_ID,
      floorId: DEFAULT_FLOOR_ID,
      presets: {},
      variantId,
      payroll: { lastPaidAt: new Date() },
    };
    await user.save(tx);
    return user;
  });
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
    const user = await userDocs.loadUser(req.params.userId);
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

    if (!(await ensureSchool(userId))) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check, charge and record in ONE transaction holding the user's row.
    //
    // The Mongo version had to charge first and then record the room with a
    // conditional write, refunding by hand when two taps raced and the record
    // lost. Here the second tap waits for the first to commit, then finds the
    // room already owned and is refused before anything is charged — so there
    // is no refund path, because there is nothing to undo.
    const { status, body } = await db().transaction(async (tx) => {
      const user = await userDocs.loadUser(userId, { lock: true }, tx);
      if (!user) return { status: 404, body: { message: "User not found" } };

      const variantId = knownVariant(user.school?.variantId);
      const owned = knownRooms(variantId, user.school?.ownedRoomIds);
      const spec = getRoomSpec(variantId, roomId);
      if (!spec) return { status: 404, body: { message: "No such room" } };

      // The parent rule, checked here rather than only in the UI that greys the
      // button out: it is what keeps an owned set a connected subtree, and a
      // stranded room would open its doorway onto grass.
      const blocker = buyBlocker(variantId, owned, roomId);
      if (blocker === "owned") {
        return { status: 409, body: { message: "You already have that room" } };
      }
      if (blocker === "locked") {
        return { status: 400, body: { message: "Build the room it opens off first" } };
      }

      const wallet = await spendFrom(userId, spec.currency, spec.price, tx);
      if (!wallet) {
        return { status: 400, body: { message: "Not enough coins yet" } };
      }

      const stored = Array.isArray(user.school.ownedRoomIds) ? user.school.ownedRoomIds : [];
      user.school.ownedRoomIds = stored.includes(roomId) ? stored : [...stored, roomId];
      await user.save(tx);

      return { status: 200, body: { school: serializeSchool(user.school), wallet } };
    });

    res.status(status).json(body);
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
    if (!(await ensureSchool(userId))) {
      return res.status(404).json({ message: "User not found" });
    }

    // Same shape as buyRoom: under the row lock a second tap waits, then sees
    // nothing owed. The old conditional-on-the-old-date write and its refund
    // are no longer needed.
    const { status, body } = await db().transaction(async (tx) => {
      const user = await userDocs.loadUser(userId, { lock: true }, tx);
      if (!user) return { status: 404, body: { message: "User not found" } };

      const variantId = knownVariant(user.school?.variantId);
      const rooms = knownRooms(variantId, user.school?.ownedRoomIds);
      const level = levelFor(rooms, clampStage(user.school?.stage));
      const weeks = weeksOwed(user.school?.payroll?.lastPaidAt);

      if (weeks <= 0) {
        return { status: 400, body: { message: "Nothing is owed yet" } };
      }

      const due = payrollDue(getStage(level).teachers, rooms.length, weeks);
      const wallet = await spendFrom(userId, "bitAward", due, tx);
      if (!wallet) {
        return { status: 400, body: { message: "Not enough coins yet" } };
      }

      user.school.payroll = { lastPaidAt: new Date() };
      await user.save(tx);

      return { status: 200, body: { school: serializeSchool(user.school), wallet } };
    });

    res.status(status).json(body);
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

    if (!(await ensureSchool(userId))) {
      return res.status(404).json({ message: "User not found" });
    }

    const { status, body } = await db().transaction(async (tx) => {
      const user = await userDocs.loadUser(userId, { lock: true }, tx);
      if (!user) return { status: 404, body: { message: "User not found" } };

      const variantId = knownVariant(user.school?.variantId);
      const level = levelFor(
        knownRooms(variantId, user.school?.ownedRoomIds),
        clampStage(user.school?.stage),
      );

      // Which fields this write may touch. For the school default that is all
      // three; for one room it is whatever that KIND can actually show.
      let allowed = LOOK_FIELDS.map(([field]) => field);
      if (roomId !== undefined) {
        if (typeof roomId !== "string") {
          return { status: 400, body: { message: "No room named" } };
        }
        const spec = getRoomSpec(variantId, roomId);
        if (!spec) return { status: 404, body: { message: "No such room" } };
        if (!knownRooms(variantId, user.school?.ownedRoomIds).includes(roomId)) {
          return { status: 400, body: { message: "You have not built that room" } };
        }
        allowed = customisable(spec.kind, spec.outdoor);
      }

      const set = {};
      const clear = [];
      for (const [field, lookup] of LOOK_FIELDS) {
        const value = req.body?.[field];
        if (value === undefined) continue;
        if (!allowed.includes(field)) {
          return { status: 400, body: { message: "That room cannot change that" } };
        }
        // Only a room may be reset; the school itself always has all three.
        if (value === null) {
          if (roomId === undefined) {
            return { status: 400, body: { message: "The school always has a look" } };
          }
          clear.push(field);
          continue;
        }
        if (!lookup(value, level)) {
          return { status: 400, body: { message: "That look is not available yet" } };
        }
        set[field] = value;
      }

      if (!Object.keys(set).length && !clear.length) {
        return { status: 400, body: { message: "Nothing to change" } };
      }

      if (roomId === undefined) {
        user.school = { ...user.school, ...set };
      } else {
        // Presets stay SPARSE: a field cleared is removed, and a room left
        // with nothing overridden is removed entirely rather than stored as {}.
        const presets = { ...(user.school.presets ?? {}) };
        const preset = { ...(presets[roomId] ?? {}), ...set };
        for (const field of clear) delete preset[field];
        if (Object.keys(preset).length) presets[roomId] = preset;
        else delete presets[roomId];
        user.school = { ...user.school, presets };
      }

      await user.save(tx);
      return { status: 200, body: { school: serializeSchool(user.school) } };
    });

    res.status(status).json(body);
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
