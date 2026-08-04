// config/roomLayout.js
//
// Server-authoritative bounds/footprints for the "arrange mode" free
// placement feature — mirrors src/config/roomLayout.ts (dimensions/keys
// must match, same pattern as shopCatalog.js/ts). Used to validate/clamp
// PATCH /progress/room/placement requests so a client can't push furniture
// out of the room or stacked on top of another piece.
//
// Deliberate simplification: footprints are per-SLOT, not per individual
// item — sized to comfortably fit the largest item in that slot, so the
// placement "box" is slightly generous for smaller items rather than
// needing a footprint entry for all ~25 catalog items.
export const ROOM_WIDTH = 400;
export const ROOM_DEPTH = 400;
export const ROOM_HEIGHT = 260;

export const FLOOR_SLOTS = ["furniture1", "chair", "table", "furniture2", "wardrobe"];
export const BACK_WALL_SLOTS = ["poster", "window"];
export const SIDE_WALL_SLOTS = ["shelf"];
export const WALL_SLOTS = [...BACK_WALL_SLOTS, ...SIDE_WALL_SLOTS];

// Floor: [width (x), depth (z)]. Wall: [width along the wall, height].
export const FOOTPRINTS = {
  furniture1: [104, 50],
  chair: [44, 44],
  table: [64, 40],
  furniture2: [96, 66],
  wardrobe: [50, 40],
  poster: [64, 50],
  window: [80, 60],
  shelf: [100, 16],
};

// Matches the layout the office reskin shipped with — nothing visually
// moves for existing users until they actually drag something.
export const DEFAULT_PLACEMENT = {
  furniture1: { x: 70, z: -155, rotation: 0 },
  chair: { x: 70, z: -100, rotation: 0 },
  table: { x: -160, z: 150, rotation: 0 },
  furniture2: { x: -160, z: 95, rotation: 0 },
  wardrobe: { x: 170, z: -160, rotation: 0 },
  poster: { along: -80, height: 170 },
  window: { along: 70, height: 175 },
  shelf: { along: 60, height: 190 },
};

const WALL_INSET = 10;
const MIN_WALL_HEIGHT = 35;
const MAX_WALL_HEIGHT = 235;

function footprintFor(slot, rotation) {
  const [w, d] = FOOTPRINTS[slot];
  return rotation === 90 || rotation === 270 ? [d, w] : [w, d];
}

export function clampFloorPlacement(slot, x, z, rotation) {
  const rot = [0, 90, 180, 270].includes(rotation) ? rotation : 0;
  const [w, d] = footprintFor(slot, rot);
  const halfX = ROOM_WIDTH / 2 - WALL_INSET - w / 2;
  const halfZ = ROOM_DEPTH / 2 - WALL_INSET - d / 2;
  return {
    x: Math.min(halfX, Math.max(-halfX, x)),
    z: Math.min(halfZ, Math.max(-halfZ, z)),
    rotation: rot,
  };
}

export function clampWallPlacement(slot, along, height) {
  const wallSpan = BACK_WALL_SLOTS.includes(slot) ? ROOM_WIDTH : ROOM_DEPTH;
  const [w, h] = FOOTPRINTS[slot];
  const halfAlong = wallSpan / 2 - WALL_INSET - w / 2;
  return {
    along: Math.min(halfAlong, Math.max(-halfAlong, along)),
    height: Math.min(MAX_WALL_HEIGHT - h / 2, Math.max(MIN_WALL_HEIGHT + h / 2, height)),
  };
}

function floorBox(slot, placement) {
  const [w, d] = footprintFor(slot, placement.rotation);
  return {
    minX: placement.x - w / 2, maxX: placement.x + w / 2,
    minZ: placement.z - d / 2, maxZ: placement.z + d / 2,
  };
}

function wallBox(slot, placement) {
  const [w, h] = FOOTPRINTS[slot];
  return {
    minA: placement.along - w / 2, maxA: placement.along + w / 2,
    minH: placement.height - h / 2, maxH: placement.height + h / 2,
  };
}

// occupiedSiblings: [{ slot, placement }] — pre-filtered by the caller to
// slots that currently have an item equipped (placedItems[slot] is set).
export function floorOverlaps(slot, placement, occupiedSiblings) {
  const box = floorBox(slot, placement);
  return occupiedSiblings.some(({ slot: otherSlot, placement: otherPlacement }) => {
    if (otherSlot === slot) return false;
    const otherBox = floorBox(otherSlot, otherPlacement);
    return box.minX < otherBox.maxX && box.maxX > otherBox.minX
        && box.minZ < otherBox.maxZ && box.maxZ > otherBox.minZ;
  });
}

export function wallOverlaps(slot, placement, occupiedSiblings) {
  const box = wallBox(slot, placement);
  return occupiedSiblings.some(({ slot: otherSlot, placement: otherPlacement }) => {
    if (otherSlot === slot) return false;
    const otherBox = wallBox(otherSlot, otherPlacement);
    return box.minA < otherBox.maxA && box.maxA > otherBox.minA
        && box.minH < otherBox.maxH && box.maxH > otherBox.minH;
  });
}
