// modules/school/lampLayout.ts
//
// Where the lamps go, and how "on" they are. Pure — the drawing is in
// NightLights.tsx and Building.tsx.
//
// At night the school used to be lit by the moon alone, which is right for the
// grounds and wrong for the rooms: a building full of lessons at 8pm, lit a
// dim blue, just looks sad. So the rooms get light of their own — lamps
// hanging over each room, a warm glow that actually lights the floor, the walls
// and the people, and a neon strip along the top of each wall in the room's
// own colour.

import { RoomKind, SchoolRoomRect } from "../../config/schoolCatalog";

/**
 * How far the lights are on, 0 to 1, by the school clock. They come on at
 * seven in the evening — when the windows light up — and go off at seven in
 * the morning, easing in and out over a school half-hour rather than snapping.
 */
export function nightness(hours: number): number {
  const h = ((hours % 24) + 24) % 24;
  const ease = (t: number) => t * t * (3 - 2 * t);
  if (h >= 7 && h < 19) return 0;
  if (h >= 19 && h < 19.6) return ease((h - 19) / 0.6);
  if (h >= 6.4 && h < 7) return ease((7 - h) / 0.6);
  return 1;
}

/** Each room's neon colour. Outdoor rooms have none: they have lampposts. */
export const NEON: Partial<Record<RoomKind, string>> = {
  classroom: "#56d6ff",
  library: "#ffb14a",
  corridor: "#7d8bff",
  lab: "#3dffb8",
  hall: "#ff5fd2",
  lobby: "#ffd35a",
  cafeteria: "#ff6b8e",
  gym: "#62ff7c",
  staff: "#c28bff",
  office: "#ffe08a",
  music: "#b56bff",
};

export interface Pendant {
  x: number;
  z: number;
  roomId: string;
}

/**
 * Lamps hanging over a room: one per six metres or so along its long side,
 * down the middle, never more than three. Hung high, above anybody's head and
 * above every piece of furniture in the school.
 */
export function pendantsFor(rooms: SchoolRoomRect[]): Pendant[] {
  const out: Pendant[] = [];
  for (const r of rooms) {
    if (r.outdoor) continue;
    const alongX = r.w >= r.d;
    const long = alongX ? r.w : r.d;
    const n = Math.max(1, Math.min(3, Math.round(long / 6)));
    for (let i = 0; i < n; i++) {
      const along = (long * (i + 0.5)) / n;
      out.push({
        x: alongX ? r.x + along : r.x + r.w / 2,
        z: alongX ? r.z + r.d / 2 : r.z + along,
        roomId: r.id,
      });
    }
  }
  return out;
}

export interface RoomLight {
  x: number;
  z: number;
  /** How far it reaches. */
  range: number;
}

/**
 * One real light per room, over its middle — the lamps above are what you
 * see, this is what lights the floor and the people. Capped, because every
 * light is paid for in every pixel: the biggest rooms get one first, and a
 * small room past the cap is still lit by its neighbours' spill.
 */
export function roomLights(rooms: SchoolRoomRect[], max = 16): RoomLight[] {
  return rooms
    .filter((r) => !r.outdoor)
    .sort((a, b) => b.w * b.d - a.w * a.d || a.id.localeCompare(b.id))
    .slice(0, max)
    .map((r) => ({
      x: r.x + r.w / 2,
      z: r.z + r.d / 2,
      range: Math.max(6, Math.hypot(r.w, r.d) * 0.75),
    }));
}

/** Where a lamppost's pool of light falls. */
export const POOL_RADIUS = 2.4;
