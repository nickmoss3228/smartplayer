// controllers/school.controller.js
//
// "Dream School" — the game that replaced the office-decorating Room. Three
// currencies, three kinds of purchase, one rule that matters: the client sends
// only an id, never a price. Everything costs whatever schoolCatalog.js says
// it costs at the moment the request lands.
//
// Reads are cheap and idempotent; writes all follow the same shape —
// look up in the catalog, reject if already owned, spend atomically, then
// record. Spending before recording matters: spendFrom's conditional update is
// what makes two racing purchases unable to overdraw the same balance.

import { User } from "../models/User.js";
import { spendFrom } from "../helpers/spendCurrency.js";
import {
  SCHOOL_ROOMS,
  SCHOOL_SLOTS,
  getSchoolRoom,
  getSchoolItem,
  getSchoolAction,
  STARTER_ROOM_IDS,
} from "../config/schoolCatalog.js";

// Mongoose Maps do not survive res.json() as plain objects, and the frontend
// wants a flat "<roomId>:<slot>" -> itemId record. Normalizing here keeps that
// conversion in one place rather than at five call sites.
function serializeSchool(school) {
  if (!school) return null;
  const placed = {};
  const raw = school.placed;
  if (raw instanceof Map) {
    for (const [k, v] of raw.entries()) placed[k] = v;
  } else if (raw && typeof raw === "object") {
    Object.assign(placed, raw);
  }
  return {
    unlockedRoomIds: school.unlockedRoomIds ?? [...STARTER_ROOM_IDS],
    ownedItemIds: school.ownedItemIds ?? [],
    ownedActionIds: school.ownedActionIds ?? [],
    placed,
    focusedRoomId: school.focusedRoomId ?? STARTER_ROOM_IDS[0],
  };
}

// Documents created before the school existed have no `school` subtree at all.
// Rather than run a migration over the whole collection, fill it in lazily the
// first time a player opens the game — the shape is entirely derivable from
// the catalog, so there is nothing to preserve.
async function ensureSchool(userId) {
  const user = await User.findById(userId).select("school wallet");
  if (!user) return null;
  if (!user.school || !user.school.unlockedRoomIds?.length) {
    user.school = {
      unlockedRoomIds: [...STARTER_ROOM_IDS],
      ownedItemIds: [],
      ownedActionIds: [],
      placed: new Map(),
      focusedRoomId: STARTER_ROOM_IDS[0],
    };
    await user.save();
  }
  return user;
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
// Read-only snapshot for visiting someone else's school. Deliberately omits
// the wallet: what another player can afford is none of your business, and the
// old room-visit endpoint set that precedent.
export async function getPlayerSchool(req, res) {
  try {
    const user = await User.findById(req.params.userId).select("school nickname");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      school: serializeSchool(user.school) ?? {
        unlockedRoomIds: [...STARTER_ROOM_IDS],
        ownedItemIds: [],
        ownedActionIds: [],
        placed: {},
        focusedRoomId: STARTER_ROOM_IDS[0],
      },
      nickname: user.nickname ?? null,
    });
  } catch (error) {
    console.error("getPlayerSchool error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /progress/school/unlock-room  { roomId }   [bitAward]
export async function unlockRoom(req, res) {
  try {
    const userId = req.user._id;
    const { roomId } = req.body;

    const room = getSchoolRoom(roomId);
    if (!room) return res.status(400).json({ message: "Unknown room" });

    const user = await ensureSchool(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.school.unlockedRoomIds.includes(roomId)) {
      return res.status(400).json({ message: "Room already unlocked" });
    }

    // A zero-price room (the starter Classroom) must not go through spendFrom:
    // it rejects non-positive amounts, so a free unlock would read as declined.
    let wallet = user.wallet;
    if (room.unlockPriceBitAward > 0) {
      wallet = await spendFrom(userId, "bitAward", room.unlockPriceBitAward);
      if (!wallet) {
        return res.status(400).json({ message: "Not enough BitAward" });
      }
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { "school.unlockedRoomIds": roomId },
        // Opening the new room immediately is the payoff for saving up.
        $set: { "school.focusedRoomId": roomId },
      },
      { new: true, select: "school" },
    );

    res.json({ school: serializeSchool(updated.school), wallet });
  } catch (error) {
    console.error("unlockRoom error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /progress/school/buy-item  { itemId }   [bitWord]
export async function buyItem(req, res) {
  try {
    const userId = req.user._id;
    const { itemId } = req.body;

    const item = getSchoolItem(itemId);
    if (!item) return res.status(400).json({ message: "Unknown item" });

    const user = await ensureSchool(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    // Furniture for a room you have not unlocked would be invisible and
    // unrefundable — reject rather than silently take the money.
    if (!user.school.unlockedRoomIds.includes(item.roomId)) {
      return res.status(400).json({ message: "Room is still locked" });
    }
    if (user.school.ownedItemIds.includes(itemId)) {
      return res.status(400).json({ message: "Item already owned" });
    }

    const wallet = await spendFrom(userId, "bitWord", item.priceBitWord);
    if (!wallet) return res.status(400).json({ message: "Not enough BitWord" });

    const updated = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { "school.ownedItemIds": itemId },
        // Buying places it straight away; nobody buys furniture to leave it in
        // a bag. Switching back to a previous item is what placeItem is for.
        $set: { [`school.placed.${item.roomId}:${item.slot}`]: itemId },
      },
      { new: true, select: "school" },
    );

    res.json({ school: serializeSchool(updated.school), wallet });
  } catch (error) {
    console.error("buyItem error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /progress/school/place-item  { itemId }
// Re-selects an already-owned item into its slot. No currency involved — this
// is how a player switches back to something they bought earlier.
export async function placeItem(req, res) {
  try {
    const userId = req.user._id;
    const { itemId } = req.body;

    const item = getSchoolItem(itemId);
    if (!item) return res.status(400).json({ message: "Unknown item" });

    const user = await ensureSchool(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.school.ownedItemIds.includes(itemId)) {
      return res.status(400).json({ message: "Item not owned" });
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { [`school.placed.${item.roomId}:${item.slot}`]: itemId } },
      { new: true, select: "school" },
    );

    res.json({ school: serializeSchool(updated.school) });
  } catch (error) {
    console.error("placeItem error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /progress/school/buy-action  { actionId }   [bitPhrase]
export async function buyAction(req, res) {
  try {
    const userId = req.user._id;
    const { actionId } = req.body;

    const action = getSchoolAction(actionId);
    if (!action) return res.status(400).json({ message: "Unknown action" });

    const user = await ensureSchool(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.school.unlockedRoomIds.includes(action.roomId)) {
      return res.status(400).json({ message: "Room is still locked" });
    }
    if (user.school.ownedActionIds.includes(actionId)) {
      return res.status(400).json({ message: "Action already owned" });
    }

    const wallet = await spendFrom(userId, "bitPhrase", action.priceBitPhrase);
    if (!wallet) return res.status(400).json({ message: "Not enough BitPhrase" });

    const updated = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { "school.ownedActionIds": actionId } },
      { new: true, select: "school" },
    );

    res.json({ school: serializeSchool(updated.school), wallet });
  } catch (error) {
    console.error("buyAction error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /progress/school/focus  { roomId }
// Which cell the dollhouse opens on. A free preference, like the old lights
// toggle — but it must still be a room the player has actually unlocked.
export async function focusRoom(req, res) {
  try {
    const userId = req.user._id;
    const { roomId } = req.body;

    if (!getSchoolRoom(roomId)) {
      return res.status(400).json({ message: "Unknown room" });
    }

    const user = await ensureSchool(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.school.unlockedRoomIds.includes(roomId)) {
      return res.status(400).json({ message: "Room is still locked" });
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { "school.focusedRoomId": roomId } },
      { new: true, select: "school" },
    );

    res.json({ school: serializeSchool(updated.school) });
  } catch (error) {
    console.error("focusRoom error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /progress/school/catalog
// Serves the catalog so the frontend mirror can be sanity-checked against the
// server, and so a future client can drop its copy entirely. Prices here are
// the ones actually charged.
export async function getSchoolCatalog(_req, res) {
  res.json({ rooms: SCHOOL_ROOMS, slots: SCHOOL_SLOTS });
}
