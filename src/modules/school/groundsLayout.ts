// modules/school/groundsLayout.ts
//
// The land the school stands on. Until now the campus floated in an empty sky,
// which made a one-room school look lost and a finished one look like a model
// somebody forgot to put down. So the school gets a plot: a square of land
// sized for the FINISHED campus, with a fence round it, a street along the
// front, neighbours' houses along the back, and the space the school will never
// use turned into a pitch, a playground, a car park and trees.
//
// Worked out from the finished campus, never from the rooms owned today: the
// plot does not move or change as the school grows, and nothing on it — not a
// goalpost, not a tree — ever stands where a room will one day be built. At one
// room the plot is mostly lawn waiting to be built on; at twenty it is full.
//
// The only thing that follows the rooms owned today is the way in: the path
// from the street to whichever door is the front door right now (see
// `frontDoor` in props.ts), and the students walking up it in the morning.
//
// Pure — no three.js — so it can be tested.

import { SchoolRoomRect, getVariant, planBounds, starterRoomIds } from "../../config/schoolCatalog";
import { PatrolPerson, SchoolPlan, Spot, buildPlan, frontDoor, spaceOut } from "./props";

/** The top of the land: a hair under the rooms' base slabs, which then read
 *  as the low plinth the school is built on. Grounds.tsx draws the land here,
 *  and whoever stands on it (Playtime.tsx) stands here. */
export const GROUND_Y = -0.04;

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export type FeatureKind = "pitch" | "playground" | "carPark";

export interface GroundFeature {
  kind: FeatureKind;
  rect: Rect;
  /** The long side runs along x. */
  alongX: boolean;
}

export interface GroundItem {
  x: number;
  z: number;
  kind: "tree" | "bush";
}

export interface House {
  x: number;
  z: number;
  w: number;
  d: number;
  /** Which way its front faces: toward the school. */
  ry: number;
  wall: string;
  roof: string;
}

export interface GroundsPlan {
  /** The whole plot, edge to edge. */
  tile: Rect;
  /** The school's own grounds: the fence runs round this. */
  fence: Rect;
  /** The pavement and the road, bands running along the front (south) edge. */
  pavement: { z0: number; z1: number };
  road: { z0: number; z1: number };
  features: GroundFeature[];
  items: GroundItem[];
  houses: House[];
  lamps: { x: number; z: number }[];
  /** Every x the way in can ever reach the pavement at. Kept clear. */
  entrances: number[];
  /** Where cars get from the car park to the road: a gap in the fence, a
   *  dropped kerb, asphalt across the pavement. One per car park. */
  driveways: Driveway[];
}

export interface Driveway {
  /** Centre line, across the pavement. */
  x: number;
  width: number;
  /** From the car park's front edge… */
  z0: number;
  /** …to the edge of the road. */
  z1: number;
}

/** Margins from the finished campus to the fence. The front has to hold the
 *  path and a little lawn; the east side, which the camera looks along, gets
 *  the most room: it is where the pitch goes on a campus with no gap of its
 *  own big enough, and where a pitch shows off best anyway. */
const MARGIN = { north: 5, west: 5, east: 16, south: 6 };
/** Beyond the fence at the back and the side: the neighbours. */
const NEIGHBOURS = 8;
const PAVEMENT = 2.2;
const ROAD = 5;
const VERGE = 0.6;
/** Kept free round every room the finished campus will have. */
const CLEARANCE = 2;
/** Half-width of the strip kept clear up to every possible way in. */
const LANE_HALF = 2;
/** A driveway is wide enough for one car each way, near enough. */
const DRIVEWAY = 3.6;

const hash = (x: number, z: number) => {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

const HOUSE_WALLS = ["#e8d9c0", "#d9c2b0", "#cfd8dc", "#e6d3a8", "#c9d6c1", "#e0c9c9"];
const HOUSE_ROOFS = ["#8e3f2c", "#5d6673", "#7a5a3e", "#4c5461"];

/**
 * Every place the front door can ever be, for a campus: the forecourt's gate,
 * and each door along the chain of rooms that leads to it — `frontDoor` puts
 * the door on whichever of those is the edge of the school at the time — plus
 * the starter classroom's south wall, for a school of one room.
 */
export function entranceCandidates(variantId: string): { x: number; z: number; side: string }[] {
  const all = buildPlan(getVariant(variantId).rooms.map((r) => r.id), variantId);
  const out: { x: number; z: number; side: string }[] = [];
  const court = all.rooms.find((r) => r.id === "forecourt");
  if (court) out.push({ x: court.x + court.w / 2, z: court.z + court.d, side: "south" });
  let child = "forecourt";
  for (let guard = 0; guard < 32; guard++) {
    const node = all.doors[child];
    if (!node?.parent) break;
    const parent = all.rooms.find((r) => r.id === node.parent);
    if (parent) {
      const side =
        Math.abs(node.z - (parent.z + parent.d)) < 0.01 ? "south"
        : Math.abs(node.z - parent.z) < 0.01 ? "north"
        : Math.abs(node.x - parent.x) < 0.01 ? "west"
        : "east";
      out.push({ x: node.x, z: node.z, side });
    }
    child = node.parent;
  }
  // With nothing but the first classroom, the door is in the middle of its
  // south wall — and the classroom is smaller then than it grows to be.
  for (const owned of [starterRoomIds(variantId), all.owned]) {
    const fd = frontDoor(buildPlan(owned, variantId));
    if (fd) out.push({ x: fd.x, z: fd.z, side: fd.side });
  }
  return out;
}

/** The biggest free rectangle in a grid of blocked cells: the classic
 *  histogram sweep, row by row. */
function largestFree(free: boolean[][]): { i0: number; j0: number; w: number; d: number } | null {
  const rows = free.length;
  const cols = rows ? free[0].length : 0;
  const height = new Array(cols).fill(0);
  let best: { i0: number; j0: number; w: number; d: number } | null = null;
  let bestArea = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) height[i] = free[j][i] ? height[i] + 1 : 0;
    const stack: number[] = [];
    for (let i = 0; i <= cols; i++) {
      const h = i < cols ? height[i] : 0;
      while (stack.length && height[stack[stack.length - 1]] >= h) {
        const top = stack.pop()!;
        const left = stack.length ? stack[stack.length - 1] + 1 : 0;
        const w = i - left;
        const d = height[top];
        // Squarish beats long and thin: a 30×2 strip is no use to anybody.
        const usable = Math.min(w, d) >= 5 ? w * d : 0;
        if (usable > bestArea) {
          bestArea = usable;
          best = { i0: left, j0: j - d + 1, w, d };
        }
      }
      stack.push(i);
    }
  }
  return best;
}

export function groundsPlan(variantId: string): GroundsPlan {
  const all = buildPlan(getVariant(variantId).rooms.map((r) => r.id), variantId);
  const b = planBounds(all.rooms);
  const fence: Rect = {
    x0: b.minX - MARGIN.west,
    z0: b.minZ - MARGIN.north,
    x1: b.maxX + MARGIN.east,
    z1: b.maxZ + MARGIN.south,
  };
  const pavement = { z0: fence.z1, z1: fence.z1 + PAVEMENT };
  const road = { z0: pavement.z1, z1: pavement.z1 + ROAD };
  const tile: Rect = {
    x0: fence.x0 - NEIGHBOURS,
    z0: fence.z0 - NEIGHBOURS,
    x1: fence.x1 + 1,
    z1: road.z1 + VERGE,
  };

  const doors = entranceCandidates(variantId);
  const entrances = [...new Set(doors.map((d) => d.x))];

  // A metre grid over the inside of the fence. Blocked: every room of the
  // finished campus plus clearance, and a lane from every possible way in
  // straight down to the pavement.
  const cols = fence.x1 - fence.x0;
  const rows = fence.z1 - fence.z0;
  const free: boolean[][] = [];
  const blocked = (x: number, z: number) =>
    all.rooms.some(
      (r) => x > r.x - CLEARANCE && x < r.x + r.w + CLEARANCE && z > r.z - CLEARANCE && z < r.z + r.d + CLEARANCE,
    ) || doors.some((d) => Math.abs(x - d.x) < LANE_HALF + 0.5 && z > d.z - 1);
  for (let j = 0; j < rows; j++) {
    const row: boolean[] = [];
    for (let i = 0; i < cols; i++) row.push(!blocked(fence.x0 + i + 0.5, fence.z0 + j + 0.5));
    free.push(row);
  }
  const take = (i0: number, j0: number, w: number, d: number, pad: number) => {
    for (let j = Math.max(0, j0 - pad); j < Math.min(rows, j0 + d + pad); j++) {
      for (let i = Math.max(0, i0 - pad); i < Math.min(cols, i0 + w + pad); i++) free[j][i] = false;
    }
  };

  const features: GroundFeature[] = [];
  // The pitch first, in the biggest space there is; then a playground, or a
  // car park if the space it lands in is at the front, by the street.
  const pitchSpot = largestFree(free);
  if (pitchSpot && Math.max(pitchSpot.w, pitchSpot.d) >= 14 && Math.min(pitchSpot.w, pitchSpot.d) >= 9) {
    const alongX = pitchSpot.w >= pitchSpot.d;
    const long = Math.min(24, (alongX ? pitchSpot.w : pitchSpot.d) - 2);
    const short = Math.min(14, (alongX ? pitchSpot.d : pitchSpot.w) - 2);
    const w = alongX ? long : short;
    const d = alongX ? short : long;
    const i0 = pitchSpot.i0 + Math.floor((pitchSpot.w - w) / 2);
    const j0 = pitchSpot.j0 + Math.floor((pitchSpot.d - d) / 2);
    features.push({
      kind: "pitch",
      alongX,
      rect: { x0: fence.x0 + i0, z0: fence.z0 + j0, x1: fence.x0 + i0 + w, z1: fence.z0 + j0 + d },
    });
    take(i0, j0, w, d, 2);
  }
  for (let n = 0; n < 2; n++) {
    const spot = largestFree(free);
    if (!spot || spot.w < 6 || spot.d < 6) break;
    const atFront = spot.j0 + spot.d >= rows - 1;
    const kind: FeatureKind = atFront && !features.some((f) => f.kind === "carPark") ? "carPark" : "playground";
    if (features.some((f) => f.kind === kind)) break;
    const w = Math.min(kind === "carPark" ? 14 : 10, spot.w - 1);
    const d = Math.min(kind === "carPark" ? 7 : 8, spot.d - 1);
    // A car park sits against the fence at the front, where the cars get in.
    const i0 = spot.i0 + Math.floor((spot.w - w) / 2);
    const j0 = kind === "carPark" ? spot.j0 + spot.d - d : spot.j0 + Math.floor((spot.d - d) / 2);
    features.push({
      kind,
      alongX: w >= d,
      rect: { x0: fence.x0 + i0, z0: fence.z0 + j0, x1: fence.x0 + i0 + w, z1: fence.z0 + j0 + d },
    });
    take(i0, j0, w, d, 1);
  }

  // A car park needs a way out. The cars drive out of its front edge, through
  // a gap in the fence and over the pavement to the road — so that strip is
  // kept clear of everything else: trees, lamps, the bus stop.
  const driveways: Driveway[] = features
    .filter((f) => f.kind === "carPark")
    .map((f) => ({ x: (f.rect.x0 + f.rect.x1) / 2, width: DRIVEWAY, z0: f.rect.z1, z1: road.z0 }));
  for (const dw of driveways) {
    for (let j = Math.max(0, Math.floor(dw.z0 - fence.z0) - 1); j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (Math.abs(fence.x0 + i + 0.5 - dw.x) < dw.width / 2 + 1) free[j][i] = false;
      }
    }
  }

  // Trees and bushes in what is left, deterministically, never closer than
  // three metres, and thinner along the front so the school stays in view.
  const items: GroundItem[] = [];
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      if (!free[j][i]) continue;
      const x = fence.x0 + i + 0.5;
      const z = fence.z0 + j + 0.5;
      if (x < fence.x0 + 1 || x > fence.x1 - 1 || z < fence.z0 + 1 || z > fence.z1 - 1) continue;
      const h = hash(x, z);
      const front = z > b.maxZ;
      if (h > (front ? 0.04 : 0.1)) continue;
      if (items.some((t) => Math.hypot(t.x - x, t.z - z) < 3.2)) continue;
      items.push({ x, z, kind: hash(z, x) < 0.62 ? "tree" : "bush" });
    }
  }

  // The neighbours: a row of houses along the back, and down the west side,
  // all facing the school.
  const houses: House[] = [];
  const row = (from: number, to: number, place: (at: number, w: number) => Omit<House, "wall" | "roof">) => {
    let at = from + 1;
    let n = 0;
    while (at < to - 5) {
      const w = 5 + Math.floor(hash(at, n) * 3);
      if (at + w > to - 1) break;
      houses.push({
        ...place(at, w),
        wall: HOUSE_WALLS[Math.floor(hash(n, at) * HOUSE_WALLS.length)],
        roof: HOUSE_ROOFS[Math.floor(hash(at * 3, n) * HOUSE_ROOFS.length)],
      });
      at += w + 2 + Math.floor(hash(n * 7, at) * 2);
      n++;
    }
  };
  row(tile.x0 + NEIGHBOURS, tile.x1, (at, w) => ({ x: at + w / 2, z: tile.z0 + NEIGHBOURS / 2, w, d: 4.5, ry: 0 }));
  row(tile.z0 + NEIGHBOURS, fence.z1, (at, w) => ({ x: tile.x0 + NEIGHBOURS / 2, z: at + w / 2, w, d: 4.5, ry: Math.PI / 2 }));

  // Street lamps along the pavement, on the road side.
  const lamps: { x: number; z: number }[] = [];
  for (let x = tile.x0 + 4; x < tile.x1 - 2; x += 10) {
    if (entrances.some((e) => Math.abs(e - x) < 2.5)) continue;
    if (driveways.some((dw) => Math.abs(dw.x - x) < dw.width / 2 + 1)) continue;
    lamps.push({ x, z: pavement.z1 - 0.4 });
  }

  return { tile, fence, pavement, road, features, items, houses, lamps, entrances, driveways };
}

// ── The way in, today ───────────────────────────────────────────────────────

export interface WayIn {
  /** The door or gate itself. */
  door: { x: number; z: number };
  /** Paved path from the door to the pavement, as a polyline. */
  path: { x: number; z: number }[];
  /** Where the path meets the pavement, which is where the fence has its gap. */
  gateX: number;
}

const insideAny = (rooms: SchoolRoomRect[], x: number, z: number, pad: number) =>
  rooms.some((r) => x > r.x - pad && x < r.x + r.w + pad && z > r.z - pad && z < r.z + r.d + pad);

/**
 * The path from the street to today's way in: the forecourt's gate once there
 * is one, otherwise the front door. Straight out of the door, then straight
 * down to the pavement. Null when that would cross a room the player owns —
 * a path is never drawn through a building, and nobody is sent along one.
 */
export function wayIn(plan: SchoolPlan, grounds: GroundsPlan): WayIn | null {
  const court = plan.rooms.find((r) => r.id === "forecourt");
  let door: { x: number; z: number };
  let out: [number, number];
  if (court) {
    door = { x: court.x + court.w / 2, z: court.z + court.d };
    out = [0, 1];
  } else {
    const fd = frontDoor(plan);
    if (!fd) return null;
    door = { x: fd.x, z: fd.z };
    out = fd.side === "south" ? [0, 1] : fd.side === "north" ? [0, -1] : fd.side === "east" ? [1, 0] : [-1, 0];
  }
  // A north-facing door opens away from the street; there is no sensible
  // straight path from it, so there is no path.
  if (out[1] < 0) return null;
  const step = { x: door.x + out[0] * 1.6, z: door.z + out[1] * 1.6 };
  const end = { x: step.x, z: grounds.pavement.z0 };
  const path = step.z < end.z ? [door, step, end] : [door, end];
  // Sample the route and refuse it if it passes through anything built.
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i];
    const b2 = path[i + 1];
    const len = Math.hypot(b2.x - a.x, b2.z - a.z);
    for (let s = 0.4; s < len; s += 0.25) {
      const x = a.x + ((b2.x - a.x) * s) / len;
      const z = a.z + ((b2.z - a.z) * s) / len;
      if (insideAny(plan.rooms, x, z, 0.3)) return null;
    }
  }
  return { door, path, gateX: end.x };
}

/**
 * Students on their way in or out — morning and after school, when the
 * school clock says people are coming and going. Out and back along the path:
 * from the bus stop along the pavement, up the path to the door, a pause on
 * the step, and back. Two directions on one line, which the walking lane
 * keeps apart.
 */
export function arrivals(wi: WayIn | null, grounds: GroundsPlan, count = 3): PatrolPerson[] {
  if (!wi) return [];
  const stopX = busStopX(grounds, wi.gateX);
  const walkZ = grounds.pavement.z0 + 0.7;
  const top = wi.path[wi.path.length - 1];
  const up = [...wi.path].reverse();
  const loop: Spot[] = [
    { x: stopX, z: walkZ, ry: 0, hold: 1.2 },
    { x: top.x, z: walkZ, ry: 0 },
    ...up.slice(0, -1).map((p) => ({ x: p.x, z: p.z, ry: 0 })),
    { x: wi.door.x, z: wi.door.z + 0.6 * Math.sign(top.z - wi.door.z || 1), ry: 0, hold: 1.5 },
    ...up.slice(0, -1).reverse().map((p) => ({ x: p.x, z: p.z, ry: 0 })),
    { x: top.x, z: walkZ, ry: 0 },
  ];
  let span = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    span += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return Array.from({ length: count }, (_, i) => ({
    key: `arrive${i}`,
    role: "arriving" as const,
    path: spaceOut(loop, (i * span) / count),
    group: "arrivals",
  }));
}

/** The bus stop: on the pavement a few metres along from the way in, on
 *  whichever side leaves a driveway clear. The shelter and its sign take about
 *  2.5m either side of this. */
export function busStopX(grounds: GroundsPlan, gateX: number): number {
  const clear = (x: number) =>
    x > grounds.tile.x0 + 3 &&
    x < grounds.tile.x1 - 3 &&
    grounds.driveways.every((dw) => Math.abs(dw.x - x) >= dw.width / 2 + 2.6);
  for (const x of [gateX + 5, gateX - 5, gateX + 9, gateX - 9]) if (clear(x)) return x;
  return gateX + 5;
}
