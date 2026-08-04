// config/roomLayout.ts
//
// Mirrors backend/src/config/roomLayout.js (dimensions/keys/clamp+overlap
// math must match — same pattern as shopCatalog.js/ts). RoomScene.tsx uses
// these as the single source of truth for room dimensions instead of local
// constants, and the arrange-mode drag logic uses the same clamp/overlap
// helpers client-side (for live, no-round-trip feedback while dragging)
// that the server re-applies when a placement is actually saved.
export const ROOM_WIDTH = 400;
export const ROOM_DEPTH = 400;
export const ROOM_HEIGHT = 260;

export const FLOOR_SLOTS = ["furniture1", "chair", "table", "furniture2", "wardrobe"] as const;
export const BACK_WALL_SLOTS = ["poster", "window"] as const;
export const SIDE_WALL_SLOTS = ["shelf"] as const;
export const WALL_SLOTS = [...BACK_WALL_SLOTS, ...SIDE_WALL_SLOTS] as const;

export type FloorSlotKey = (typeof FLOOR_SLOTS)[number];
export type WallSlotKey = (typeof WALL_SLOTS)[number];
export type PlacementSlotKey = FloorSlotKey | WallSlotKey;

export type Rotation = 0 | 90 | 180 | 270;

export interface FloorPlacement {
  x: number;
  z: number;
  rotation: Rotation;
}

export interface WallPlacement {
  along: number;
  height: number;
}

export interface RoomPlacement {
  furniture1: FloorPlacement;
  chair: FloorPlacement;
  table: FloorPlacement;
  furniture2: FloorPlacement;
  wardrobe: FloorPlacement;
  poster: WallPlacement;
  window: WallPlacement;
  shelf: WallPlacement;
}

export function isFloorSlot(slot: string): slot is FloorSlotKey {
  return (FLOOR_SLOTS as readonly string[]).includes(slot);
}

export function isWallSlot(slot: string): slot is WallSlotKey {
  return (WALL_SLOTS as readonly string[]).includes(slot);
}

// Floor: [width (x), depth (z)]. Wall: [width along the wall, height].
// Deliberate simplification: one footprint per SLOT (sized to the largest
// item in that slot), not per individual item.
export const FOOTPRINTS: Record<PlacementSlotKey, [number, number]> = {
  furniture1: [104, 50],
  chair: [44, 44],
  table: [64, 40],
  furniture2: [96, 66],
  wardrobe: [50, 40],
  poster: [64, 50],
  window: [80, 60],
  shelf: [100, 16],
};

// Matches the layout the office reskin shipped with.
export const DEFAULT_PLACEMENT: RoomPlacement = {
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

function footprintFor(slot: FloorSlotKey, rotation: Rotation): [number, number] {
  const [w, d] = FOOTPRINTS[slot];
  return rotation === 90 || rotation === 270 ? [d, w] : [w, d];
}

export function nextRotation(rotation: Rotation): Rotation {
  return ((rotation + 90) % 360) as Rotation;
}

export function clampFloorPlacement(
  slot: FloorSlotKey,
  x: number,
  z: number,
  rotation: Rotation,
): FloorPlacement {
  const [w, d] = footprintFor(slot, rotation);
  const halfX = ROOM_WIDTH / 2 - WALL_INSET - w / 2;
  const halfZ = ROOM_DEPTH / 2 - WALL_INSET - d / 2;
  return {
    x: Math.min(halfX, Math.max(-halfX, x)),
    z: Math.min(halfZ, Math.max(-halfZ, z)),
    rotation,
  };
}

export function clampWallPlacement(slot: WallSlotKey, along: number, height: number): WallPlacement {
  const wallSpan = (BACK_WALL_SLOTS as readonly string[]).includes(slot) ? ROOM_WIDTH : ROOM_DEPTH;
  const [w, h] = FOOTPRINTS[slot];
  const halfAlong = wallSpan / 2 - WALL_INSET - w / 2;
  return {
    along: Math.min(halfAlong, Math.max(-halfAlong, along)),
    height: Math.min(MAX_WALL_HEIGHT - h / 2, Math.max(MIN_WALL_HEIGHT + h / 2, height)),
  };
}

function floorBox(slot: FloorSlotKey, placement: FloorPlacement) {
  const [w, d] = footprintFor(slot, placement.rotation);
  return {
    minX: placement.x - w / 2, maxX: placement.x + w / 2,
    minZ: placement.z - d / 2, maxZ: placement.z + d / 2,
  };
}

function wallBox(slot: WallSlotKey, placement: WallPlacement) {
  const [w, h] = FOOTPRINTS[slot];
  return {
    minA: placement.along - w / 2, maxA: placement.along + w / 2,
    minH: placement.height - h / 2, maxH: placement.height + h / 2,
  };
}

export function floorOverlaps(
  slot: FloorSlotKey,
  placement: FloorPlacement,
  occupiedSiblings: { slot: FloorSlotKey; placement: FloorPlacement }[],
): boolean {
  const box = floorBox(slot, placement);
  return occupiedSiblings.some(({ slot: otherSlot, placement: otherPlacement }) => {
    if (otherSlot === slot) return false;
    const otherBox = floorBox(otherSlot, otherPlacement);
    return box.minX < otherBox.maxX && box.maxX > otherBox.minX
        && box.minZ < otherBox.maxZ && box.maxZ > otherBox.minZ;
  });
}

export function wallOverlaps(
  slot: WallSlotKey,
  placement: WallPlacement,
  occupiedSiblings: { slot: WallSlotKey; placement: WallPlacement }[],
): boolean {
  const box = wallBox(slot, placement);
  return occupiedSiblings.some(({ slot: otherSlot, placement: otherPlacement }) => {
    if (otherSlot === slot) return false;
    const otherBox = wallBox(otherSlot, otherPlacement);
    return box.minA < otherBox.maxA && box.maxA > otherBox.minA
        && box.minH < otherBox.maxH && box.maxH > otherBox.minH;
  });
}

// Which wall group a wall slot belongs to (for overlap checks against its
// wall-mates only, not the whole room).
export function wallGroupFor(slot: WallSlotKey): readonly WallSlotKey[] {
  return (BACK_WALL_SLOTS as readonly string[]).includes(slot)
    ? (BACK_WALL_SLOTS as readonly WallSlotKey[])
    : (SIDE_WALL_SLOTS as readonly WallSlotKey[]);
}
