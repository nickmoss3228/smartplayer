// modules/school/props.ts
//
// Where everything stands, and where everyone walks. Pure geometry — no React,
// no three — so the desk layouts, the routes and the people plan can be
// reasoned about (and unit-tested) without a canvas.
//
// Conventions, shared with the models the designer will eventually deliver
// (see docs/room-game-concept.md §6):
//
//   • 1 unit = 1 tile = 1 metre. x runs east, z runs south, y is up.
//   • A prop's pivot is on the floor, centred on its footprint.
//   • A prop's FRONT faces local +z. `ry` yaws it around Y, so local +z maps
//     to world (sin ry, cos ry).
//   • A student sits SEAT_GAP behind their desk along the desk's local +z, and
//     faces back into it — which is what puts the whole class's eyes on the
//     board no matter which layout preset is picked.

import {
  DoorNode,
  LayoutId,
  SchoolRoomRect,
  SchoolStage,
  getVariant,
  roomsAtStage,
} from "../../config/schoolCatalog";
import { PersonRole } from "./bubbles";

/**
 * Everything the scene needs to lay itself out: which stage, and which of the
 * three campus shapes. Built once per render and threaded through, because
 * almost every function below needs both and passing them separately meant
 * four-argument signatures everywhere.
 */
export interface SchoolPlan {
  stage: SchoolStage;
  variantId: string;
  rooms: SchoolRoomRect[];
  doors: Record<string, DoorNode>;
}

export function buildPlan(stage: SchoolStage, variantId: string): SchoolPlan {
  return {
    stage,
    variantId,
    rooms: roomsAtStage(variantId, stage.index),
    doors: getVariant(variantId).doors,
  };
}

/** Every classroom in the plan. The first is "the" classroom — the one whose
 *  desk count the stage names directly and where the player sits. */
export const classroomsOf = (plan: SchoolPlan): SchoolRoomRect[] =>
  plan.rooms.filter((r) => r.kind === "classroom");

export interface Spot {
  x: number;
  z: number;
  ry: number;
  /**
   * Seconds to stand still on arriving here. Absent means walk straight
   * through, which is what every doorway and corner wants.
   *
   * It lives on the WAYPOINT rather than in the walker because two people on
   * the same loop must hold for the same time in the same places, or the gap
   * between them drifts every lap until they end up standing inside one
   * another. See `spaceOut` below.
   */
  hold?: number;
}

/** Which side of a room a wall runs along. Only north and west are drawn in
 *  the cutaway; the exterior view draws all four. */
export type WallSide = "north" | "south" | "west" | "east";

export type PropType =
  | "desk"
  | "chair"
  | "teacherDesk"
  | "board"
  | "bookshelf"
  | "plant"
  | "window"
  | "door"
  | "clock"
  | "poster"
  | "rug"
  | "armchair"
  | "readingTable"
  | "lockers"
  | "bench"
  | "booth"
  | "speaker"
  | "tree"
  | "bush"
  | "fountain"
  | "stagePlatform"
  | "banner"
  | "chairRow"
  | "trophyShelf"
  // Stage 6 and up.
  | "cupboard"
  | "globe"
  | "computer"
  | "flag"
  | "alphabet"
  | "receptionDesk"
  | "sofa"
  | "noticeboard"
  | "gate"
  | "signpost"
  | "lamppost"
  | "waterCooler"
  | "bin"
  | "cafeCounter"
  | "longTable"
  | "wallBars"
  | "hoop"
  | "mat"
  | "scoreboard"
  | "vault";

export interface PropInstance {
  key: string;
  type: PropType;
  x: number;
  z: number;
  ry: number;
  /** Props that stretch along a wall (boards, banners, lockers). */
  len?: number;
  tint?: string;
}

/** How far behind their desk a student sits, centre to centre. The desk is
 *  0.6 deep, so this leaves ~0.2m of air behind it — any more and the seated
 *  figure reads as sitting BESIDE the desk rather than at it. */
export const SEAT_GAP = 0.62;

const room = (plan: SchoolPlan, id: string): SchoolRoomRect | undefined =>
  plan.rooms.find((r) => r.id === id);

// ── Desk layouts ────────────────────────────────────────────────────────────
// Four presets over the same desk count. Each returns exactly `n` spots so the
// people plan can zip students onto them without worrying about which preset
// is active. All of them keep the front strip clear — that is the teacher's
// patrol lane, and desks in it would have the teacher walk through a chair.

const TEACHER_LANE = 2.6;

function rowsLayout(r: SchoolRoomRect, n: number): Spot[] {
  const cols: number = n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const rowCount = Math.ceil(n / cols);
  const x0 = r.x + 1.6;
  const x1 = r.x + r.w - 1.6;
  const z0 = r.z + TEACHER_LANE + 0.4;
  const z1 = r.z + r.d - 1.4;

  const spots: Spot[] = [];
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    spots.push({
      x: cols === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * col) / (cols - 1),
      z: rowCount === 1 ? z0 : z0 + ((z1 - z0) * row) / (rowCount - 1),
      ry: 0,
    });
  }
  return spots;
}

// A U opening toward the board: two arms down the side walls with students on
// the outside facing in, and a back row across the south wall.
function uShapeLayout(r: SchoolRoomRect, n: number): Spot[] {
  const perArm = Math.floor(n / 3);
  const back = n - perArm * 2;
  const zTop = r.z + TEACHER_LANE + 0.6;
  const zBot = r.z + r.d - 2.2;
  const spots: Spot[] = [];

  const arm = (x: number, ry: number) => {
    for (let i = 0; i < perArm; i++) {
      const t = perArm === 1 ? 0.5 : i / (perArm - 1);
      spots.push({ x, z: zTop + (zBot - zTop) * t, ry });
    }
  };
  arm(r.x + 2.1, -Math.PI / 2);
  arm(r.x + r.w - 2.1, Math.PI / 2);

  const bx0 = r.x + 2.8;
  const bx1 = r.x + r.w - 2.8;
  for (let i = 0; i < back; i++) {
    const t = back === 1 ? 0.5 : i / (back - 1);
    spots.push({ x: bx0 + (bx1 - bx0) * t, z: r.z + r.d - 1.5, ry: 0 });
  }
  return spots;
}

// Pods of four, two facing two. Laid out in ONE row across the room, never a
// grid: a pod is 2.3m deep once the students on the outside are counted, and
// the classroom only has ~5.4m of depth behind the teacher's lane — two rows of
// pods put the back students inside the front row's desks. Width is the axis
// with room to spare, so that is the axis pods spread along.
function clustersLayout(r: SchoolRoomRect, n: number): Spot[] {
  const pods = Math.max(1, Math.ceil(n / 4));
  const x0 = r.x + 2.2;
  const x1 = r.x + r.w - 2.2;
  const z0 = r.z + TEACHER_LANE + 1.5;
  const z1 = r.z + r.d - 2.2;
  const cz = (z0 + z1) / 2;

  // Balanced rather than greedy: nine desks over three pods is 3/3/3, and
  // filling pods to four first would give 4/4/1 and one lonely straggler.
  const base = Math.floor(n / pods);
  const extra = n % pods;

  const spots: Spot[] = [];
  for (let p = 0; p < pods; p++) {
    const cx = pods === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * p) / (pods - 1);
    // Four desks back to back in the middle, students on the OUTSIDE facing in.
    // The obvious arrangement — desks facing outward — seats each student
    // exactly on top of the desk opposite, because a seat is SEAT_GAP from its
    // desk and the two desks are only 0.7m apart.
    const seats: Spot[] = [
      { x: cx - 0.65, z: cz - 0.35, ry: Math.PI },
      { x: cx + 0.65, z: cz - 0.35, ry: Math.PI },
      { x: cx - 0.65, z: cz + 0.35, ry: 0 },
      { x: cx + 0.65, z: cz + 0.35, ry: 0 },
    ];
    spots.push(...seats.slice(0, base + (p < extra ? 1 : 0)));
  }
  return spots;
}

// A ring with everyone facing the middle. Deliberately an ELLIPSE, not a
// circle: a classroom is half again as wide as it is deep once the teacher's
// lane is taken out, and a true circle inscribed in that has to shrink to the
// depth — which packs twelve desks into a 1.3m radius and turns them into a
// pile. Students sit on the outside, so the ellipse is measured to the desks
// and the seats fall beyond it.
function circleLayout(r: SchoolRoomRect, n: number): Spot[] {
  const cx = r.x + r.w / 2;
  const cz = r.z + (TEACHER_LANE + r.d) / 2;
  const rx = Math.max(1.2, r.w / 2 - 2.4);
  const rz = Math.max(1.0, (r.d - TEACHER_LANE) / 2 - 1.1);
  const spots: Spot[] = [];
  for (let i = 0; i < n; i++) {
    // Start at the south of the ring so the gap, when n is odd, lands facing
    // the board rather than blocking it.
    const a = Math.PI + (i / n) * Math.PI * 2;
    // On an ellipse the outward normal is not the radial direction, and using
    // the radial one leaves the desks at the ends visibly splayed. The normal
    // at (rx·sin a, rz·cos a) is proportional to (sin a / rx, cos a / rz).
    const ry = Math.atan2(Math.sin(a) / rx, Math.cos(a) / rz);
    spots.push({ x: cx + Math.sin(a) * rx, z: cz + Math.cos(a) * rz, ry });
  }
  return spots;
}

function layoutIn(r: SchoolRoomRect, n: number, layoutId: LayoutId): Spot[] {
  switch (layoutId) {
    case "u-shape":
      return uShapeLayout(r, n);
    case "clusters":
      return clustersLayout(r, n);
    case "circle":
      return circleLayout(r, n);
    default:
      return rowsLayout(r, n);
  }
}

/** Desks in a classroom. Both classrooms use the player's chosen preset, so
 *  changing it visibly rearranges the whole school rather than one room. */
export function deskLayout(
  plan: SchoolPlan,
  layoutId: LayoutId,
  roomId: string = "classroom",
): Spot[] {
  const r = room(plan, roomId);
  if (!r || r.kind !== "classroom") return [];
  // The main classroom gets the stage's headline desk count; every other
  // classroom gets the secondary count, so a variant can add a fourth without
  // needing a new field in the catalog.
  const n = roomId === "classroom" ? plan.stage.desks : plan.stage.secondaryDesks;
  return n > 0 ? layoutIn(r, n, layoutId) : [];
}

/** Where a student sits, given the desk they sit at. */
export const seatOf = (desk: Spot): Spot => ({
  x: desk.x + Math.sin(desk.ry) * SEAT_GAP,
  z: desk.z + Math.cos(desk.ry) * SEAT_GAP,
  // Facing back into the desk.
  ry: desk.ry + Math.PI,
});

/**
 * Where somebody sits when they sit ON a piece of furniture — a chair, a
 * bench, a sofa, an armchair, the stool at a booth.
 *
 * EVERY seat in furniture.tsx is authored with its backrest on local +z, so
 * the occupant is at the prop's own position facing the other way. Working
 * that out per prop is how people ended up sitting in armchairs the wrong way
 * round, facing into the backrest, and sitting three quarters of a metre in
 * front of benches they were supposed to be on. There is now one rule and one
 * function, and `along` slides a second person up the same bench.
 */
export const sitOn = (prop: Spot, along = 0): Spot => ({
  x: prop.x + Math.cos(prop.ry) * along,
  z: prop.z - Math.sin(prop.ry) * along,
  ry: prop.ry + Math.PI,
});

// ── Walls you can actually hang something on ────────────────────────────────

const subtractSpan = (
  runs: [number, number][],
  a: number,
  b: number,
): [number, number][] => {
  const out: [number, number][] = [];
  for (const [s, e] of runs) {
    if (b <= s || a >= e) {
      out.push([s, e]);
      continue;
    }
    if (a > s) out.push([s, a]);
    if (b < e) out.push([b, e]);
  }
  return out;
};

/**
 * Stretches of a room's north or west wall that Building.tsx draws at FULL
 * height and unbroken: no room behind them to drop them to a knee-high
 * partition, and no doorway cut through them.
 *
 * Anything that hangs rather than stands — a clock, a window, a poster, a
 * scoreboard — has to be mounted inside one of these. Hung anywhere else it
 * floats in mid-air, which is exactly what reception's clock, the corridor's
 * poster and the gym's scoreboard were doing: the wall they were nailed to was
 * 0.95m tall, or was not there at all.
 */
function wallRuns(
  plan: SchoolPlan,
  r: SchoolRoomRect,
  side: "north" | "west",
  holes: WallOpening[],
): [number, number][] {
  const north = side === "north";
  let runs: [number, number][] = [[north ? r.x : r.z, north ? r.x + r.w : r.z + r.d]];

  for (const o of plan.rooms) {
    if (o.id === r.id) continue;
    const touches = north
      ? Math.abs(o.z + o.d - r.z) < 0.01
      : Math.abs(o.x + o.w - r.x) < 0.01;
    if (!touches) continue;
    runs = subtractSpan(runs, north ? o.x : o.z, north ? o.x + o.w : o.z + o.d);
  }
  for (const hole of holes) {
    runs = subtractSpan(runs, hole.at - hole.width / 2 - 0.3, hole.at + hole.width / 2 + 0.3);
  }
  return runs.filter(([s, e]) => e - s > 0.4);
}

export const freeWallRuns = (
  plan: SchoolPlan,
  r: SchoolRoomRect,
  side: "north" | "west",
): [number, number][] => wallRuns(plan, r, side, boundaryOpenings(plan, r)[side]);

/**
 * Where a classroom's own door onto whatever is west of it goes.
 *
 * The GAP is cut whatever the wall behind it is doing — before the corridor is
 * built this is the room's only way in, and in the Terrace campus the library
 * is pressed against it, so requiring a full-height wall sealed the classroom
 * shut. Whether the 2.1m door FRAME is drawn in that gap is a separate
 * question, asked in `classroomProps`: over a knee-high partition there is
 * nothing for a frame to be set into.
 *
 * Deliberately reads the catalog's own doors only — asking `freeWallRuns`
 * would ask back about this door.
 */
export function classroomWestDoor(plan: SchoolPlan, r: SchoolRoomRect): number | null {
  if (r.kind !== "classroom") return null;
  let runs: [number, number][] = [[r.z, r.z + r.d]];
  for (const hole of nodeOpenings(plan, r).west) {
    runs = subtractSpan(runs, hole.at - hole.width / 2 - 0.3, hole.at + hole.width / 2 + 0.3);
  }
  const prefer = r.z + r.d - 1.6;
  let best: number | null = null;
  for (const [s, e] of runs) {
    if (e - s < DOOR_WIDTH + 1.0) continue;
    const at = Math.min(Math.max(prefer, s + DOOR_WIDTH / 2 + 0.4), e - DOOR_WIDTH / 2 - 0.4);
    if (best === null || Math.abs(at - prefer) < Math.abs(best - prefer)) best = at;
  }
  return best;
}

/** True when nothing is pressed against this stretch of a room's west wall, so
 *  it is drawn at full height rather than dropped to a partition. */
const westWallIsFull = (plan: SchoolPlan, r: SchoolRoomRect, at: number) =>
  !plan.rooms.some(
    (o) =>
      o.id !== r.id &&
      Math.abs(o.x + o.w - r.x) < 0.01 &&
      at > o.z - 0.01 &&
      at < o.z + o.d + 0.01,
  );

/** The point on a drawn wall closest to `prefer` with `len` of room to spare,
 *  or null when the room has no such wall. A room made entirely of partitions
 *  and doorways gets no clock, which is the correct answer. */
export function mountOnWall(
  plan: SchoolPlan,
  r: SchoolRoomRect,
  side: "north" | "west",
  prefer: number,
  len: number,
): number | null {
  let best: number | null = null;
  for (const [s, e] of freeWallRuns(plan, r, side)) {
    if (e - s < len + 0.2) continue;
    const at = Math.min(Math.max(prefer, s + len / 2 + 0.1), e - len / 2 - 0.1);
    if (best === null || Math.abs(at - prefer) < Math.abs(best - prefer)) best = at;
  }
  return best;
}

/** Hangs a prop on the north wall if there is one, else the west wall, else
 *  nowhere. `inset` is how far off the wall the prop's pivot sits. */
function hang(
  plan: SchoolPlan,
  r: SchoolRoomRect,
  base: Omit<PropInstance, "x" | "z" | "ry">,
  opts: { len: number; inset: number; north?: number; west?: number },
): PropInstance | null {
  if (opts.north !== undefined) {
    const at = mountOnWall(plan, r, "north", opts.north, opts.len);
    if (at !== null) return { ...base, x: at, z: r.z + opts.inset, ry: 0 };
  }
  if (opts.west !== undefined) {
    const at = mountOnWall(plan, r, "west", opts.west, opts.len);
    if (at !== null) return { ...base, x: r.x + opts.inset, z: at, ry: Math.PI / 2 };
  }
  return null;
}

/**
 * Windows along the stretches of OUTSIDE wall a room actually has.
 *
 * The cafeteria used to get two windows on its north wall in every campus, and
 * in every campus the hall or the corridor is on the other side of it: they
 * looked out onto an interior. A run that survives `freeWallRuns` has nothing
 * behind it at all, which is the definition of an outside wall.
 *
 * `reserved` guards spans of the NORTH wall — the only wall anything else in
 * this file hangs on — so a window is never punched through the board.
 */
function windowsOn(
  plan: SchoolPlan,
  r: SchoolRoomRect,
  sides: ("north" | "west")[],
  reserved: [number, number][] = [],
): PropInstance[] {
  const out: PropInstance[] = [];
  const clear = (at: number) => !reserved.some(([s, e]) => at > s && at < e);

  for (const side of sides) {
    for (const [s, e] of freeWallRuns(plan, r, side)) {
      for (let at = s + 1.2; at < e - 1.0; at += 2.2) {
        if (side === "north" && !clear(at)) continue;
        out.push(
          side === "north"
            ? { key: `win-n${at.toFixed(1)}`, type: "window", x: at, z: r.z + 0.16, ry: 0 }
            : { key: `win-w${at.toFixed(1)}`, type: "window", x: r.x + 0.16, z: at, ry: Math.PI / 2 },
        );
      }
    }
  }
  return out;
}

// ── Fixed furniture ─────────────────────────────────────────────────────────
// Everything that is not a desk. Positions are absolute world tiles, derived
// from whichever rooms the stage has, so a stage that lacks a room simply
// contributes nothing here.

function classroomProps(
  plan: SchoolPlan,
  r: SchoolRoomRect,
  stage: SchoolStage,
  english: boolean,
): PropInstance[] {
  const p: PropInstance[] = [];
  // The board sits left of centre rather than centred, and is capped well short
  // of the wall's width. A board centred on a 5m wall covers every position the
  // window loop below would pick, and stage 0 ends up with no windows at all.
  //
  // No floorplan ever puts a room north of a classroom (there is a test), so
  // this wall is always there to take it.
  const boardLen = Math.min(4, r.w * 0.45);
  const boardX = r.x + r.w * 0.32;
  p.push({ key: "board", type: "board", x: boardX, z: r.z + 0.22, ry: 0, len: boardLen });
  p.push({ key: "tdesk", type: "teacherDesk", x: r.x + r.w - 2.2, z: r.z + 1.5, ry: Math.PI });

  const reserved: [number, number][] = [[boardX - boardLen / 2 - 0.5, boardX + boardLen / 2 + 0.5]];
  const clock = hang(plan, r, { key: "clock", type: "clock" }, {
    len: 0.7,
    inset: 0.24,
    north: r.x + r.w - 1.2,
    west: r.z + 1.6,
  });
  if (clock) {
    p.push(clock);
    if (clock.ry === 0) reserved.push([clock.x - 0.75, clock.x + 0.75]);
  }

  // The frame for the west doorway, but only where the wall it pierces is
  // drawn full height. Set into a knee-high partition, a 2.1m door frame
  // stands more than a metre proud of the wall it is supposedly part of — the
  // gap is still cut there, you just see straight over it.
  const westDoor = classroomWestDoor(plan, r);
  if (westDoor !== null && westWallIsFull(plan, r, westDoor)) {
    // Centred on the wall's own plane, half a wall thickness west of the room
    // edge — set INTO the opening rather than standing in front of it.
    p.push({ key: "door", type: "door", x: r.x - WALL_T / 2, z: westDoor, ry: Math.PI / 2 });
  }

  p.push(...windowsOn(plan, r, ["north"], reserved));

  if (stage.index >= 1) {
    p.push({ key: "shelf1", type: "bookshelf", x: r.x + 0.55, z: r.z + 2.4, ry: Math.PI / 2 });
    p.push({ key: "plant1", type: "plant", x: r.x + 0.7, z: r.z + r.d - 0.8, ry: 0 });
    p.push({ key: "plant2", type: "plant", x: r.x + r.w - 0.7, z: r.z + r.d - 0.8, ry: 0 });
  }
  if (stage.index >= 6) {
    p.push({ key: "cupboard", type: "cupboard", x: r.x + 0.6, z: r.z + 4.8, ry: Math.PI / 2 });
    p.push({ key: "bin", type: "bin", x: r.x + r.w - 0.8, z: r.z + 2.6, ry: 0 });
  }

  // This is an English school, so the dressing says so: flags, the alphabet
  // along the wall, a globe. Deliberately NOT a second subject's room.
  if (english) {
    p.push({ key: "flagA", type: "flag", x: r.x + 0.9, z: r.z + 0.3, ry: 0, tint: "#2b4c8c" });
    p.push({ key: "flagB", type: "flag", x: r.x + 1.9, z: r.z + 0.3, ry: 0, tint: "#8c2b3a" });
    p.push({ key: "alphabet", type: "alphabet", x: r.x + r.w / 2, z: r.z + 0.2, ry: 0, len: r.w - 2.5 });
    // Tucked against the north wall, north of the teacher's patrol lane —
    // out in the room it was something the teacher paced straight through.
    p.push({ key: "globe", type: "globe", x: r.x + r.w - 2.6, z: r.z + 0.8, ry: 0 });
  } else if (stage.index >= 1) {
    p.push({ key: "poster1", type: "poster", x: r.x + 1.4, z: r.z + 0.2, ry: 0, tint: "#d98b6a" });
  }
  if (english && stage.index >= 8) {
    p.push({ key: "pc1", type: "computer", x: r.x + r.w - 1.9, z: r.z + 1.5, ry: Math.PI });
  }
  return p;
}

/** Where the library's study desks stand. Shared with the seats visitors take
 *  at them, so a chair can never end up somewhere nobody sits and a visitor can
 *  never end up sitting on the floor. */
export function libraryDesks(r: SchoolRoomRect): Spot[] {
  // Facing north into the shelves, which puts the chairs between the desks and
  // the reading corner rather than in the lane down from the door.
  return [r.x + 1.7, r.x + r.w / 2, r.x + r.w - 1.7].map((x) => ({
    x,
    z: r.z + 2.6,
    ry: Math.PI,
  }));
}

/** The clear run down the east side of the library, used to reach the study
 *  desks without crossing the rug, the armchairs or the reading table. */
const libraryAisle = (r: SchoolRoomRect) => r.x + r.w - 0.9;

function libraryProps(plan: SchoolPlan, r: SchoolRoomRect): PropInstance[] {
  const p: PropInstance[] = [...windowsOn(plan, r, ["north"])];
  for (let i = 0; i < 3; i++) {
    p.push({ key: `lshelf${i}`, type: "bookshelf", x: r.x + 1.4 + i * 2.1, z: r.z + 0.7, ry: 0, len: 1.8 });
  }
  p.push({ key: "lshelfw", type: "bookshelf", x: r.x + 0.55, z: r.z + 3.4, ry: Math.PI / 2, len: 2.4 });
  p.push({ key: "lrug", type: "rug", x: r.x + r.w / 2, z: r.z + 4.6, ry: 0 });
  // Turned to FACE the reading table. Both armchairs used to have their backs
  // to it, with the reader sitting the wrong way round in the chair — every
  // seat in this game is authored with its backrest on local +z, and whoever
  // sits in it faces the other way.
  p.push({ key: "larm1", type: "armchair", x: r.x + r.w / 2 - 1.5, z: r.z + 4.4, ry: -Math.PI / 2 });
  p.push({ key: "larm2", type: "armchair", x: r.x + r.w / 2 + 1.5, z: r.z + 4.4, ry: Math.PI / 2 });
  p.push({ key: "ltable", type: "readingTable", x: r.x + r.w / 2, z: r.z + 4.5, ry: 0 });

  // A study row with real chairs. Visitors used to be sat on the rug at desk
  // height — sitting on nothing, forty centimetres above the floor.
  libraryDesks(r).forEach((d, i) => {
    p.push({ key: `lsdesk${i}`, type: "desk", x: d.x, z: d.z, ry: d.ry });
    const seat = seatOf(d);
    p.push({ key: `lschair${i}`, type: "chair", x: seat.x, z: seat.z, ry: d.ry });
  });

  // Both out of the east aisle: the plant used to stand squarely in it.
  p.push({ key: "lplant", type: "plant", x: r.x + 0.8, z: r.z + r.d - 0.9, ry: 0 });
  p.push({ key: "lglobe", type: "globe", x: r.x + 0.8, z: r.z + 1.6, ry: 0 });
  return p;
}

function corridorProps(plan: SchoolPlan, r: SchoolRoomRect): PropInstance[] {
  const p: PropInstance[] = [];
  const banks = Math.max(3, Math.floor((r.w - 4) / 4.2));
  for (let i = 0; i < banks; i++) {
    p.push({ key: `lock${i}`, type: "lockers", x: r.x + 2.5 + i * 4.2, z: r.z + 0.5, ry: 0, len: 2.4 });
  }
  // Pushed back against the south side and turned to FACE the corridor. It
  // used to stand a metre out in the middle of the walkway with its back to
  // the room, which is neither a place to sit nor a place to walk.
  p.push({ key: "cbench", type: "bench", x: r.x + 2, z: r.z + r.d - 0.4, ry: 0 });
  p.push({ key: "cplant", type: "plant", x: r.x + 0.8, z: r.z + 0.9, ry: 0 });
  // The corridor's north wall is classrooms all the way along, so it is knee
  // height everywhere and a poster nailed to it hung in mid-air. Whichever
  // stretch is genuinely a wall gets it, and if none is, the corridor simply
  // has no poster.
  const poster = hang(plan, r, { key: "cposter", type: "poster", tint: "#6a95d9" }, {
    len: 1.0,
    inset: 0.2,
    north: r.x + 9.4,
    west: r.z + r.d / 2,
  });
  if (poster) p.push(poster);
  if (r.w > 20) {
    p.push({ key: "cwater", type: "waterCooler", x: r.x + 20.6, z: r.z + 0.6, ry: 0 });
  }
  return p;
}

function labProps(plan: SchoolPlan, r: SchoolRoomRect, doorX: number): PropInstance[] {
  const p: PropInstance[] = [];

  // Booths sit either side of the lane running from the door to the back of
  // the room. In the Courtyard campus the lobby hangs off the lab's south
  // wall, so that lane is a THROUGH route — people crossing the whole lab —
  // and a booth parked in it is a booth people walk through.
  const half = DOOR_WIDTH / 2 + 0.4;
  const west = doorX - half;
  const east = doorX + half;
  const fit = (from: number, to: number, n: number) =>
    Array.from({ length: n }, (_, i) => from + 0.78 + i * ((to - from - 1.56) / Math.max(1, n - 1) || 0));

  const westSlots = fit(r.x + 0.1, west, 2);
  const eastSlots = fit(east, r.x + r.w - 0.1, 2);

  [...westSlots, ...eastSlots].forEach((x, i) => {
    p.push({ key: `booth${i}`, type: "booth", x, z: r.z + 2.2, ry: 0 });
  });
  p.push({ key: "booth20", type: "booth", x: westSlots[0], z: r.z + 4.6, ry: 0 });
  p.push({ key: "booth21", type: "booth", x: eastSlots[1], z: r.z + 4.6, ry: 0 });

  const poster = hang(plan, r, { key: "labposter", type: "poster", tint: "#7fb08a" }, {
    len: 1.0,
    inset: 0.2,
    north: r.x + r.w / 2,
    west: r.z + r.d - 1.4,
  });
  if (poster) p.push(poster);
  return p;
}

/** The two benches in the yard, facing each other across it. Shared with the
 *  people who sit on them. */
export function courtyardBenches(r: SchoolRoomRect): Spot[] {
  return [
    { x: r.x + r.w / 2 - 3.0, z: r.z + r.d / 2 + 1.4, ry: Math.PI / 2 },
    { x: r.x + r.w / 2 + 3.0, z: r.z + r.d / 2 + 1.4, ry: -Math.PI / 2 },
  ];
}

function courtyardProps(r: SchoolRoomRect): PropInstance[] {
  const p: PropInstance[] = [];
  // The fountain used to sit in the south-west, which is precisely where the
  // west bench's seat is — anyone sitting there was inside the fountain, and
  // anyone walking to it went through the water. It is now tucked into the
  // north-west corner, out of every approach lane.
  p.push({ key: "fountain", type: "fountain", x: r.x + 2.4, z: r.z + 2.4, ry: 0 });
  p.push({ key: "tree1", type: "tree", x: r.x + r.w / 2 + 0.6, z: r.z + r.d / 2 - 1.2, ry: 0 });
  p.push({ key: "tree2", type: "tree", x: r.x + r.w - 2.2, z: r.z + r.d - 2.2, ry: 0 });
  courtyardBenches(r).forEach((b, i) => {
    p.push({ key: `yb${i}`, type: "bench", x: b.x, z: b.z, ry: b.ry });
  });
  p.push({ key: "ylamp", type: "lamppost", x: r.x + 0.8, z: r.z + r.d - 1.2, ry: 0 });
  for (let i = 0; i < 4; i++) {
    p.push({ key: `bush${i}`, type: "bush", x: r.x + 0.8, z: r.z + 5.0 + i * 1.1, ry: 0 });
  }
  return p;
}

function hallProps(plan: SchoolPlan, r: SchoolRoomRect): PropInstance[] {
  const p: PropInstance[] = [];
  p.push({ key: "stage", type: "stagePlatform", x: r.x + r.w / 2, z: r.z + 1.9, ry: 0 });
  const banner = hang(plan, r, { key: "banner", type: "banner", len: 5 }, {
    len: 5,
    inset: 0.22,
    north: r.x + r.w / 2,
  });
  if (banner) p.push(banner);
  // Same story as the cafeteria tables: the hall is 11m deep in one variant and
  // 8m in the other two, and four fixed rows overshot the shallow ones into the
  // corridor behind.
  const rows = Math.max(1, Math.min(4, Math.floor((r.d - 5.8) / 1.4) + 1));
  for (let i = 0; i < rows; i++) {
    p.push({
      key: `crow${i}`,
      type: "chairRow",
      x: r.x + r.w / 2,
      z: r.z + 5.0 + i * 1.4,
      ry: 0,
      len: Math.min(7, r.w - 3),
    });
  }
  p.push({ key: "trophy", type: "trophyShelf", x: r.x + 0.6, z: r.z + 3.4, ry: Math.PI / 2 });
  p.push({ key: "hplant1", type: "plant", x: r.x + 1, z: r.z + r.d - 1, ry: 0 });
  p.push({ key: "hplant2", type: "plant", x: r.x + r.w - 1, z: r.z + r.d - 1, ry: 0 });
  return p;
}

// Reception: the room a visitor meets first, so it is the one room dressed to
// be looked AT rather than worked in.
function lobbyProps(plan: SchoolPlan, r: SchoolRoomRect, doorX: number): PropInstance[] {
  const p: PropInstance[] = [];

  // Reception is the one room people walk THROUGH rather than into: the
  // forecourt hangs off its south side, so every arrival crosses it north to
  // south along the door's x. Everything is placed around that lane instead of
  // on a fixed grid, and the desk is sized to whatever is left beside it.
  const laneHalf = DOOR_WIDTH / 2 + 0.4;
  const eastRoom = r.x + r.w - (doorX + laneHalf) - 0.4;
  const deskLen = Math.max(1.8, Math.min(3.4, eastRoom));
  const deskX = doorX + laneHalf + deskLen / 2 + 0.2;

  p.push({ key: "recdesk", type: "receptionDesk", x: deskX, z: r.z + 3.2, ry: Math.PI, len: deskLen });
  // Somebody has to be sitting on something behind that desk.
  p.push({ key: "recchair", type: "chair", x: deskX, z: r.z + 2.55, ry: Math.PI });
  // Backs to the north, so whoever is waiting faces the way in.
  p.push({ key: "sofa1", type: "sofa", x: doorX - 2.9, z: r.z + 4.8, ry: Math.PI });
  p.push({ key: "sofa2", type: "sofa", x: doorX + 2.9, z: r.z + 4.8, ry: Math.PI });
  p.push({ key: "lplant1", type: "plant", x: r.x + 0.7, z: r.z + 2.4, ry: 0 });
  p.push({ key: "lplant2", type: "plant", x: r.x + r.w - 0.7, z: r.z + 1.4, ry: 0 });
  p.push({ key: "ltrophy", type: "trophyShelf", x: r.x + 0.6, z: r.z + 6.4, ry: Math.PI / 2 });

  // Reception is the room where this mattered most: its north wall is the back
  // of the lab or the courtyard in every campus, so it is a knee-high
  // partition and the clock nailed to it hung in thin air. It goes on the west
  // wall instead — the one wall reception really has.
  for (const item of [
    hang(plan, r, { key: "notice", type: "noticeboard", len: 2.2 }, {
      len: 2.2, inset: 0.2, north: r.x + 1.6, west: r.z + 2.0,
    }),
    hang(plan, r, { key: "lclock", type: "clock" }, {
      len: 0.7, inset: 0.24, north: r.x + r.w - 1.4, west: r.z + 4.6,
    }),
  ]) {
    if (item) p.push(item);
  }
  return p;
}

// The way in. Everything here is outdoors, so it reads as ground rather than a
// room: a gate you walk under, a sign, lamps and planting either side.
function forecourtProps(r: SchoolRoomRect): PropInstance[] {
  const p: PropInstance[] = [];
  // Straddling the boundary wall rather than standing a metre inside it: the
  // forecourt is walled now, and the gate is the gap in that wall.
  p.push({ key: "gate", type: "gate", x: r.x + r.w / 2, z: r.z + r.d - 0.2, ry: 0 });
  p.push({ key: "sign", type: "signpost", x: r.x + 1.4, z: r.z + 1.3, ry: 0 });
  p.push({ key: "lamp1", type: "lamppost", x: r.x + 0.9, z: r.z + 2.9, ry: 0 });
  p.push({ key: "lamp2", type: "lamppost", x: r.x + r.w - 0.9, z: r.z + 2.9, ry: 0 });
  for (let i = 0; i < 3; i++) {
    p.push({ key: `fb${i}`, type: "bush", x: r.x + 0.8, z: r.z + 0.7 + i * 1.0, ry: 0 });
    p.push({ key: `fc${i}`, type: "bush", x: r.x + r.w - 0.8, z: r.z + 0.7 + i * 1.0, ry: 0 });
  }
  return p;
}

function cafeteriaProps(plan: SchoolPlan, r: SchoolRoomRect, doorX: number): PropInstance[] {
  const p: PropInstance[] = [];

  // Along the WEST wall, not the north one. Every variant puts the cafeteria's
  // door in the north wall, and a servery across that wall is a 7m counter
  // standing squarely in the only way in — people walked straight through it.
  p.push({
    key: "counter",
    type: "cafeCounter",
    x: r.x + 1.0,
    z: r.z + r.d / 2,
    ry: Math.PI / 2,
    len: Math.min(7, r.d - 3),
  });

  // Tables go on whichever side of the door lane has more floor. In the
  // Terrace campus the gym hangs off the cafeteria's south wall, so that lane
  // carries people all the way across the room, and an 8m table lying over it
  // is something they walked through.
  const half = DOOR_WIDTH / 2 + 0.6;
  const westRoom = doorX - half - (r.x + 2.4);
  const eastRoom = r.x + r.w - 0.6 - (doorX + half);
  const useEast = eastRoom >= westRoom;
  const span = Math.max(2.5, useEast ? eastRoom : westRoom);
  const len = Math.min(8, span - 0.4);
  const cx = useEast ? doorX + half + span / 2 : doorX - half - span / 2;

  const tables = Math.max(1, Math.floor((r.d - 5.8) / 2.6) + 1);
  for (let i = 0; i < tables; i++) {
    p.push({ key: `ltab${i}`, type: "longTable", x: cx, z: r.z + 4.6 + i * 2.6, ry: 0, len });
  }

  p.push({ key: "cplant1", type: "plant", x: r.x + r.w - 0.7, z: r.z + 1.2, ry: 0 });
  p.push({ key: "cbin", type: "bin", x: r.x + r.w - 0.9, z: r.z + r.d - 1.0, ry: 0 });
  p.push({ key: "cwater", type: "waterCooler", x: r.x + 0.6, z: r.z + r.d - 1.0, ry: 0 });
  // The two fixed windows here used to look out onto the hall or the corridor,
  // depending on the campus — the cafeteria's north wall is an interior wall in
  // all three. Whatever outside wall it has gets them instead.
  p.push(...windowsOn(plan, r, ["north", "west"]));
  return p;
}

/** The gym's spectator benches, flanking the door on the north wall. Shared
 *  with the people who sit on them. */
export function gymBenches(r: SchoolRoomRect): Spot[] {
  return [
    { x: r.x + 2.4, z: r.z + 1.1, ry: Math.PI },
    { x: r.x + r.w - 2.4, z: r.z + 1.1, ry: Math.PI },
  ];
}

function gymProps(plan: SchoolPlan, r: SchoolRoomRect): PropInstance[] {
  const p: PropInstance[] = [];
  // Wall bars on the WEST wall for the same reason the servery moved: the gym
  // door is in the north wall in every variant, and a 5m run of bars across it
  // is something people walked through.
  p.push({
    key: "bars",
    type: "wallBars",
    x: r.x + 0.35,
    z: r.z + r.d / 2 - 1,
    ry: Math.PI / 2,
    len: Math.min(5, r.d - 4),
  });
  // Every campus puts a room hard against the gym's north wall, so it is knee
  // height and the scoreboard bolted to it floated three metres over an open
  // room. Wherever there is a real wall, it goes there; where there is not,
  // the gym does without one.
  const score = hang(plan, r, { key: "score", type: "scoreboard" }, {
    len: 1.8,
    inset: 0.25,
    north: r.x + r.w - 2,
    west: r.z + r.d - 2,
  });
  if (score) p.push(score);
  p.push({ key: "hoop1", type: "hoop", x: r.x + 0.9, z: r.z + r.d / 2, ry: Math.PI / 2 });
  p.push({ key: "hoop2", type: "hoop", x: r.x + r.w - 0.9, z: r.z + r.d / 2, ry: -Math.PI / 2 });
  p.push({ key: "vault", type: "vault", x: r.x + r.w / 2 - 2.6, z: r.z + 4.4, ry: 0 });
  for (let i = 0; i < 3; i++) {
    p.push({ key: `mat${i}`, type: "mat", x: r.x + r.w / 2 + 1.4 + i * 1.5, z: r.z + 4.6, ry: 0 });
  }
  // Backs to the north wall, so whoever sits down is watching the game rather
  // than the brickwork — and is facing the camera, which is the whole reason
  // they moved off the south wall.
  gymBenches(r).forEach((b, i) => {
    p.push({ key: `gb${i}`, type: "bench", x: b.x, z: b.z, ry: b.ry });
  });
  return p;
}

export function stageProps(plan: SchoolPlan): PropInstance[] {
  const out: PropInstance[] = [];
  const push = (id: string, fn: (r: SchoolRoomRect) => PropInstance[]) => {
    const r = room(plan, id);
    if (r) out.push(...fn(r).map((p) => ({ ...p, key: `${id}-${p.key}` })));
  };
  /** For rooms that need to know which walls they actually have. */
  const pushInPlan = (id: string, fn: (plan: SchoolPlan, r: SchoolRoomRect) => PropInstance[]) => {
    const r = room(plan, id);
    if (r) out.push(...fn(plan, r).map((p) => ({ ...p, key: `${id}-${p.key}` })));
  };
  /** For rooms whose layout has to dodge their own doorway. */
  const pushWithDoor = (
    id: string,
    fn: (plan: SchoolPlan, r: SchoolRoomRect, doorX: number) => PropInstance[],
  ) => {
    const r = room(plan, id);
    if (!r) return;
    const doorX = plan.doors[id]?.x ?? r.x + r.w / 2;
    out.push(...fn(plan, r, doorX).map((p) => ({ ...p, key: `${id}-${p.key}` })));
  };

  // Once there is more than one English room, they all get the English dressing
  // — before that the classroom is the whole school, and a globe plus two flags
  // in a bare 8×7 box reads as clutter rather than character.
  const english = plan.stage.index >= 7;
  for (const c of classroomsOf(plan)) {
    out.push(
      ...classroomProps(plan, c, plan.stage, english).map((p) => ({ ...p, key: `${c.id}-${p.key}` })),
    );
  }

  pushInPlan("library", libraryProps);
  pushInPlan("corridor", corridorProps);
  pushWithDoor("lab", labProps);
  push("courtyard", courtyardProps);
  pushInPlan("hall", hallProps);
  pushWithDoor("lobby", lobbyProps);
  push("forecourt", forecourtProps);
  pushWithDoor("cafeteria", cafeteriaProps);
  pushInPlan("gym", gymProps);
  return clearDoorways(out, doorZones(plan));
}


// ── Footprints and clearance ────────────────────────────────────────────────
//
// What a prop actually occupies on the floor, so that "people do not walk
// through things" can be a checked invariant rather than something you notice
// in a screenshot. Nobody steers at runtime — every actor follows an authored
// polyline exactly — which means a static check over those polylines is a
// COMPLETE guarantee, not an approximation.
//
// null means the prop does not obstruct: wall furniture you pass in front of
// (boards, posters, flags), things you walk over (rugs, mats), and the gate,
// which is an arch you walk under.

const FOOTPRINTS: Record<PropType, { w: number; d: number } | null> = {
  desk: { w: 1.15, d: 0.6 },
  chair: { w: 0.5, d: 0.5 },
  teacherDesk: { w: 1.7, d: 0.8 },
  bookshelf: { w: 1.8, d: 0.36 },
  lockers: { w: 2.4, d: 0.42 },
  armchair: { w: 0.85, d: 0.85 },
  readingTable: { w: 0.9, d: 0.9 },
  bench: { w: 1.6, d: 0.45 },
  booth: { w: 1.5, d: 0.75 },
  speaker: { w: 0.4, d: 0.35 },
  tree: { w: 0.7, d: 0.7 },
  bush: { w: 0.75, d: 0.75 },
  fountain: { w: 2.35, d: 2.35 },
  stagePlatform: { w: 7.2, d: 3.0 },
  chairRow: { w: 7, d: 0.55 },
  trophyShelf: { w: 1.6, d: 0.4 },
  cupboard: { w: 1.5, d: 0.55 },
  globe: { w: 0.65, d: 0.65 },
  receptionDesk: { w: 3.45, d: 1.0 },
  sofa: { w: 1.9, d: 0.9 },
  signpost: { w: 0.35, d: 0.35 },
  lamppost: { w: 0.45, d: 0.45 },
  waterCooler: { w: 0.45, d: 0.45 },
  bin: { w: 0.5, d: 0.5 },
  cafeCounter: { w: 7, d: 1.05 },
  // The table only. The benches either side are what people SIT on, so
  // counting them as obstacle would put every diner inside one.
  longTable: { w: 8, d: 1.25 },
  wallBars: { w: 5, d: 0.25 },
  hoop: { w: 0.3, d: 0.3 },
  vault: { w: 0.8, d: 1.55 },
  // Passable or wall-mounted.
  board: null,
  plant: { w: 0.45, d: 0.45 },
  window: null,
  door: null,
  clock: null,
  poster: null,
  rug: null,
  banner: null,
  computer: null,
  flag: null,
  alphabet: null,
  noticeboard: null,
  gate: null,
  mat: null,
  scoreboard: null,
};

export interface Box {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  key: string;
}

const overlaps = (a: Box, b: Box) =>
  a.x0 < b.x1 - 0.01 && a.x1 > b.x0 + 0.01 && a.z0 < b.z1 - 0.01 && a.z1 > b.z0 + 0.01;

/** A prop's floor box in world space. Props whose `len` stretches them use it
 *  as the width; a rotation off the axes falls back to the larger dimension on
 *  both sides, which is conservative and keeps the maths honest. */
export function footprintOf(p: PropInstance): Box | null {
  const base = FOOTPRINTS[p.type];
  if (!base) return null;
  const w = p.len ?? base.w;
  const d = base.d;

  const c = Math.abs(Math.cos(p.ry));
  const sn = Math.abs(Math.sin(p.ry));
  let ew: number;
  let ed: number;
  if (c > 0.99) {
    ew = w;
    ed = d;
  } else if (sn > 0.99) {
    ew = d;
    ed = w;
  } else {
    ew = Math.max(w, d);
    ed = Math.max(w, d);
  }

  return {
    key: p.key,
    x0: p.x - ew / 2,
    x1: p.x + ew / 2,
    z0: p.z - ed / 2,
    z1: p.z + ed / 2,
  };
}

/** How much floor to keep clear on each side of a doorway. Enough for the
 *  1.6m-wide opening plus somebody standing in it. */
const DOOR_CLEARANCE = 1.9;

/**
 * The strips of floor either side of every doorway. Anything solid standing in
 * one of these is something a person walking through the door would pass
 * straight through — which is exactly what the cafeteria counter and the gym's
 * wall bars were doing.
 */
export function doorZones(plan: SchoolPlan): Box[] {
  const zones: Box[] = [];
  for (const r of plan.rooms) {
    const door = plan.doors[r.id];
    if (!door) continue;
    const parent = door.parent ? plan.rooms.find((o) => o.id === door.parent) : undefined;
    if (!parent) continue;

    // A door on a north/south edge is crossed along z; one on an east/west edge
    // is crossed along x.
    const horizontal =
      Math.abs(door.z - r.z) < 0.01 || Math.abs(door.z - (r.z + r.d)) < 0.01;

    if (horizontal) {
      zones.push({
        key: `${r.id}-door`,
        x0: door.x - DOOR_WIDTH / 2,
        x1: door.x + DOOR_WIDTH / 2,
        z0: door.z - DOOR_CLEARANCE,
        z1: door.z + DOOR_CLEARANCE,
      });
    } else {
      zones.push({
        key: `${r.id}-door`,
        x0: door.x - DOOR_CLEARANCE,
        x1: door.x + DOOR_CLEARANCE,
        z0: door.z - DOOR_WIDTH / 2,
        z1: door.z + DOOR_WIDTH / 2,
      });
    }
  }
  return zones;
}

/** Everything solid on the floor of this plan. */
export function blockers(plan: SchoolPlan): Box[] {
  return stageProps(plan)
    .map(footprintOf)
    .filter((b): b is Box => b !== null);
}

// ── Somewhere to sit ────────────────────────────────────────────────────────

/** How far behind a booth's worktop its stool stands. */
export const BOOTH_STOOL = 0.7;

/**
 * Where a prop can actually be sat on, in its own frame: `at` is the offset
 * along local +z, and the box is `w` across by `d` deep.
 *
 * This exists so that "nobody is sitting on thin air" can be a checked
 * invariant. Half the reported bugs in this scene were people seated where
 * there was no seat — beside a bench, in front of a sofa, at a lab booth with
 * no stool, on a library rug at chair height — and every one of them was
 * invisible in code review and obvious on screen.
 */
const SEAT_AREAS: Partial<Record<PropType, { at: number; w: number; d: number }[]>> = {
  chair: [{ at: 0, w: 0.6, d: 0.6 }],
  armchair: [{ at: -0.05, w: 0.8, d: 0.75 }],
  bench: [{ at: 0, w: 1.7, d: 0.55 }],
  sofa: [{ at: 0.05, w: 1.9, d: 0.8 }],
  booth: [{ at: BOOTH_STOOL, w: 1.3, d: 0.7 }],
  // Both benches of a canteen table, which is why the table's own footprint
  // stops short of them.
  longTable: [
    { at: -0.85, w: 0, d: 0.6 },
    { at: 0.85, w: 0, d: 0.6 },
  ],
};

/** The seat boxes a prop offers, in world space. Empty for anything you cannot
 *  sit on, which is most of the catalog. */
export function seatBoxes(p: PropInstance): Box[] {
  const areas = SEAT_AREAS[p.type];
  if (!areas) return [];
  const c = Math.cos(p.ry);
  const sn = Math.sin(p.ry);
  return areas.map((a, i) => {
    // Local +z maps to world (sin ry, cos ry); local +x to (cos ry, −sin ry).
    const cx = p.x + sn * a.at;
    const cz = p.z + c * a.at;
    const w = a.w || (p.len ?? 0) - 0.6;
    // Off the axes the honest answer is the larger dimension on both sides.
    const axis = Math.abs(c) > 0.99 || Math.abs(sn) > 0.99;
    const ew = axis ? (Math.abs(c) > 0.99 ? w : a.d) : Math.max(w, a.d);
    const ed = axis ? (Math.abs(c) > 0.99 ? a.d : w) : Math.max(w, a.d);
    return {
      key: `${p.key}#${i}`,
      x0: cx - ew / 2,
      x1: cx + ew / 2,
      z0: cz - ed / 2,
      z1: cz + ed / 2,
    };
  });
}

/** Every seat in the school, including the classroom chairs — those are drawn
 *  from the desk layout rather than from `stageProps`, and a student sitting
 *  beside their chair is exactly as wrong as one sitting beside a bench. */
export function seatSurfaces(plan: SchoolPlan, layoutId: LayoutId): Box[] {
  const out = stageProps(plan).flatMap(seatBoxes);
  for (const c of classroomsOf(plan)) {
    deskLayout(plan, layoutId, c.id).forEach((desk, i) => {
      const seat = seatOf(desk);
      out.push(
        ...seatBoxes({ key: `${c.id}-deskchair${i}`, type: "chair", x: seat.x, z: seat.z, ry: desk.ry }),
      );
    });
  }
  return out;
}

/** Drops props that stand in a doorway.
 *
 *  A backstop, not the primary mechanism: the rooms below are laid out so their
 *  big identity props (the servery, the wall bars, reception) are nowhere near
 *  a door in ANY variant. This catches the long tail — a chair row or a bin
 *  that happens to land in a doorway in one variant out of three — and dropping
 *  it is both correct and what a real room would do. */
function clearDoorways(props: PropInstance[], zones: Box[]): PropInstance[] {
  return props.filter((p) => {
    const box = footprintOf(p);
    if (!box) return true;
    return !zones.some((z) => overlaps(box, z));
  });
}

// ── People ──────────────────────────────────────────────────────────────────

export interface SeatedPerson {
  key: string;
  spot: Spot;
  /** Drives which idle loop plays and how the sitting pose is shaped. */
  pose: "desk" | "armchair" | "booth";
  /** What they are here to do, and so what they say when tapped. */
  role: PersonRole;
}

export interface PatrolPerson {
  key: string;
  path: Spot[];
  role: PersonRole;
}

/** Who somebody is, given where they are. The room IS the role — which is why
 *  tapping the person behind the front desk gets you "Welcome!" and tapping
 *  the one on the gym bench gets you "Nice pass!". */
export function roleForRoom(roomId: string): PersonRole {
  switch (roomId) {
    case "lobby":
      return "visitor";
    case "library":
      return "librarian";
    case "lab":
      return "listener";
    case "cafeteria":
      return "diner";
    case "gym":
      return "athlete";
    default:
      return "student";
  }
}

/** A student who sits somewhere, walks somewhere else, and sits down there. */
export interface CommuterPerson {
  key: string;
  seats: [Spot, Spot];
  /** Waypoints between the two seats, excluding the seats themselves. */
  path: Spot[];
  role: PersonRole;
}

export interface PeoplePlan {
  /** The player's own avatar always takes a desk. */
  playerSeat: Spot | null;
  students: SeatedPerson[];
  teachers: PatrolPerson[];
  wanderers: PatrolPerson[];
  commuters: CommuterPerson[];
}

// ── Routing ─────────────────────────────────────────────────────────────────
// A real navmesh would be overkill for eleven axis-aligned rectangles. Instead
// every room hangs off the corridor by a chain of doorways: walk to your room's
// door, then its parent's door, until you reach the corridor spine; cross the
// spine; then descend the other chain in reverse. The routes that produces are
// the ones a person would actually take, and it is a dozen lines of code.

/** Where the lab's front row of booths sits, given its doorway. Shared by the
 *  props and by the people who occupy them, so the two cannot drift apart. */
export function labBoothRow(r: SchoolRoomRect, doorX: number): number[] {
  const half = DOOR_WIDTH / 2 + 0.4;
  const fit = (from: number, to: number, n: number) =>
    Array.from({ length: n }, (_, i) => from + 0.78 + i * ((to - from - 1.56) / Math.max(1, n - 1) || 0));
  return [...fit(r.x + 0.1, doorX - half, 2), ...fit(doorX + half, r.x + r.w - 0.1, 2)];
}

/** True when you cannot reach `b` without walking through `a` — in the Terrace
 *  campus the gym hangs off the cafeteria, for instance. A journey between two
 *  such rooms is not a journey; the route doubles back through the corridor and
 *  cuts across the room in between, which is how commuters ended up crossing
 *  the cafeteria's tables. */
function isOnPathTo(plan: SchoolPlan, a: string, b: string): boolean {
  let id: string | null = b;
  const guard = new Set<string>();
  while (id && !guard.has(id)) {
    if (id === a) return true;
    guard.add(id);
    id = plan.doors[id]?.parent ?? null;
  }
  return false;
}

/** Doorways from a room out to the corridor, in walking order. */
function toCorridor(plan: SchoolPlan, roomId: string): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  let id: string | null = roomId;
  const guard = new Set<string>();
  while (id && id !== "corridor" && plan.doors[id] && !guard.has(id)) {
    guard.add(id);
    const node: DoorNode = plan.doors[id];
    out.push({ x: node.x, z: node.z });
    id = node.parent;
  }
  return out;
}

function routeBetween(
  plan: SchoolPlan,
  fromRoom: string,
  toRoom: string,
  corridor: SchoolRoomRect,
): Spot[] {
  const spineZ = corridor.z + corridor.d / 2;
  const up = toCorridor(plan, fromRoom);
  const down = toCorridor(plan, toRoom);
  const enter = up.length ? up[up.length - 1].x : corridor.x + 1;
  const exit = down.length ? down[down.length - 1].x : corridor.x + 1;

  return [
    ...up.map((d) => ({ ...d, ry: 0 })),
    { x: enter, z: spineZ, ry: 0 },
    { x: exit, z: spineZ, ry: 0 },
    ...[...down].reverse().map((d) => ({ ...d, ry: 0 })),
  ];
}

/**
 * A seat a visitor can take, plus the way in to it.
 *
 * `via` is the lane from the room's DOORWAY to the seat, and it is the reason
 * commuters stopped walking through the furniture. A straight line from a door
 * to a chair crosses whatever happens to be between them — a booth, a vaulting
 * horse, a fountain — so each room states the clear route instead, usually "down
 * the side wall, then across".
 */
interface VisitSeat {
  spot: Spot;
  via: Spot[];
}

/** Seats a visiting student can occupy — never the ones a room's permanent
 *  occupants use, or two people end up sharing a chair. */
function visitSeats(plan: SchoolPlan, roomId: string): VisitSeat[] {
  const r = room(plan, roomId);
  if (!r) return [];
  switch (roomId) {
    case "lab": {
      // The back-row booths; the front row belongs to the residents. Reached
      // straight down the door's own lane, which is kept clear of booths.
      const doorX = plan.doors.lab?.x ?? r.x + r.w / 2;
      const row = labBoothRow(r, doorX);
      return [row[0], row[3]].map((x) => ({
        spot: { x, z: r.z + 5.3, ry: Math.PI },
        via: [
          { x: doorX, z: r.z + 1.2, ry: 0 },
          { x: doorX, z: r.z + 5.3, ry: 0 },
        ],
      }));
    }
    case "library": {
      // At the study desks. These used to be three points on the rug, which
      // meant three visitors sitting at chair height on the floor.
      const aisle = libraryAisle(r);
      return libraryDesks(r).map((desk) => {
        const seat = seatOf(desk);
        return {
          spot: seat,
          // Down the east aisle, along BEHIND the chairs, then into one. Along
          // the row itself would walk through every chair on the way.
          via: [
            { x: aisle, z: r.z + r.d - 1.6, ry: 0 },
            { x: aisle, z: r.z + 1.3, ry: 0 },
            { x: seat.x, z: r.z + 1.3, ry: 0 },
          ],
        };
      });
    }
    case "courtyard":
      // Two to a bench, reached down the east edge and along the south, never
      // straight across — the middle of the yard is a tree.
      return courtyardBenches(r).flatMap((bench) =>
        [-0.45, 0.45].map((along) => ({
          spot: sitOn(bench, along),
          via: [
            { x: r.x + r.w - 1.6, z: r.z + 1.6, ry: 0 },
            { x: r.x + r.w - 1.6, z: r.z + r.d - 1.0, ry: 0 },
            { x: bench.x, z: r.z + r.d - 1.0, ry: 0 },
          ],
        })),
      );
    case "lobby": {
      // ON the two sofas, which sit either side of the through-lane. The seats
      // used to be a metre south of them, facing them.
      const doorX = plan.doors.lobby?.x ?? r.x + r.w / 2;
      const sofas: Spot[] = [
        { x: doorX - 2.9, z: r.z + 4.8, ry: Math.PI },
        { x: doorX + 2.9, z: r.z + 4.8, ry: Math.PI },
      ];
      return [
        sitOn(sofas[0], -0.45),
        sitOn(sofas[0], 0.45),
        sitOn(sofas[1], 0.45),
      ].map((spot) => ({
        spot,
        via: [{ x: doorX, z: r.z + 5.9, ry: 0 }, { x: spot.x, z: r.z + 5.9, ry: 0 }],
      }));
    }
    case "cafeteria": {
      // At whichever bank of tables the room actually has, approached along the
      // south of it rather than across it.
      const doorX = plan.doors.cafeteria?.x ?? r.x + r.w / 2;
      const half = DOOR_WIDTH / 2 + 0.6;
      const westRoom = doorX - half - (r.x + 2.4);
      const eastRoom = r.x + r.w - 0.6 - (doorX + half);
      const useEast = eastRoom >= westRoom;
      const span = Math.max(2.5, useEast ? eastRoom : westRoom);
      const cx = useEast ? doorX + half + span / 2 : doorX - half - span / 2;
      const len = Math.min(8, span - 0.4);
      // Spread ALONG THE TABLE the room actually fits, not by a fixed 1.5m: in
      // a narrow cafeteria a fixed spread put the outermost diner past the end
      // of the bench, sitting on nothing.
      const seatZ = r.z + 5.5;
      const step = (len - 1.2) / 3;
      return [-1.5, -0.5, 0.5, 1.5].map((k) => ({
        spot: { x: cx + k * step, z: seatZ, ry: Math.PI },
        via: [
          { x: doorX, z: r.z + 1.4, ry: 0 },
          { x: doorX, z: seatZ, ry: 0 },
        ],
      }));
    }
    case "gym": {
      // Two to a bench, and the benches are now beside the door rather than
      // across the room, so nobody has to cross the vaulting horse and the
      // mats to reach one.
      const doorX = plan.doors.gym?.x ?? r.x + r.w / 2;
      return gymBenches(r).flatMap((bench) =>
        [-0.45, 0.45].map((along) => ({
          spot: sitOn(bench, along),
          via: [{ x: doorX, z: r.z + 2.4, ry: 0 }, { x: bench.x + along, z: r.z + 2.4, ry: 0 }],
        })),
      );
    }
    default:
      return [];
  }
}

/**
 * The two points a roamer stands on just inside a room's doorway — step in,
 * pause, step across, go back out.
 *
 * A pair rather than one point, and that is not decoration. A single point
 * makes the visit a 1.6m out-and-back along one line: two roamers whose
 * positions mirror each other about that point stand in exactly the same place,
 * and no amount of walking on the right helps, because a dead-on turn has no
 * right-hand side to be on. Two points make it a little circuit instead, with
 * an in lane and an out lane.
 *
 * Reaching either from the door crosses no wall but that door's own opening,
 * and both stay inside the strip kept clear of furniture either side of it —
 * so this is safe without knowing anything about the room it is in.
 */
function insideDoor(plan: SchoolPlan, roomId: string): Spot[] {
  const r = room(plan, roomId);
  const d = plan.doors[roomId];
  if (!r || !d) return [];
  const cx = r.x + r.w / 2;
  const cz = r.z + r.d / 2;
  const len = Math.hypot(cx - d.x, cz - d.z) || 1;
  const ix = (cx - d.x) / len;
  const iz = (cz - d.z) / len;
  const bx = d.x + ix * 1.6;
  const bz = d.z + iz * 1.6;
  // Well off to the side of the doorway. Not a nicety: some rooms are walked
  // THROUGH — the gym hangs off the courtyard, so everyone bound for it crosses
  // the yard on the door's own line — and a stop parked on that line is
  // somebody standing where other people are walking.
  const px = iz * 1.0;
  const pz = -ix * 1.0;
  // A stop of 2-4 seconds, fixed per room rather than per person: everybody on
  // this loop has to hold for the same time in the same place, or they drift
  // into one another (see `spaceOut`).
  const hold = 2 + (Math.abs(Math.round(d.x * 7 + d.z * 13)) % 5) * 0.45;
  return [
    { x: bx + px, z: bz + pz, ry: 0, hold },
    { x: bx - px, z: bz - pz, ry: 0 },
  ];
}

/** Drops waypoints that repeat the one before them. Routes chained out of door
 *  points do that routinely, and a zero-length leg is a person standing still
 *  for no reason with no way to tell how long. */
function tidy(path: Spot[]): Spot[] {
  const out: Spot[] = [];
  for (const p of path) {
    const last = out[out.length - 1];
    if (last && Math.hypot(last.x - p.x, last.z - p.z) < 0.05) {
      // Keep the longer hold rather than the later point's.
      if ((p.hold ?? 0) > (last.hold ?? 0)) last.hold = p.hold;
      continue;
    }
    out.push({ ...p });
  }
  return out;
}

/** How fast everybody walks. Shared, and deliberately not per-person: two
 *  people on the same loop at different speeds converge, and then they are
 *  standing inside each other. */
export const WALK_SPEED = 1.15;

/**
 * How far to the RIGHT of the centre line everybody walks.
 *
 * People keep to one side of a corridor, and here they have to. Every roaming
 * loop is a tour of a tree, so every stretch of corridor is walked twice a lap
 * — once out, once back — and two people on the same centre line meet head-on
 * and pass straight through each other. Walking on the right puts twice this
 * between them instead. Small enough to stay well inside a 1.6m doorway and
 * inside the cleared strip either side of it.
 */
export const WALK_LANE = 0.4;

export interface WalkStep {
  x: number;
  z: number;
  heading: number;
  walking: boolean;
}

/**
 * Where a walker is on their path at time `t`, and which way they are facing.
 *
 * Absolute time, not a per-frame integration. That is the point: a walker who
 * accumulates dt drifts against one who accumulates it slightly differently,
 * and over a few laps the twenty-metre gap between two wanderers closes to
 * nothing. As a pure function of the clock, the gap they start with is the gap
 * they still have an hour later — and it is a function a test can sample,
 * which is the only way "they do not pile up" is checkable at all.
 */
/** How much of each leg is spent easing across from one side of the previous
 *  leg's lane to this one's. */
const LANE_BLEND = 0.9;

export function walkerAt(
  path: Spot[],
  t: number,
  speed = WALK_SPEED,
  lane = WALK_LANE,
): WalkStep {
  const n = path.length;
  if (n === 0) return { x: 0, z: 0, heading: 0, walking: false };
  if (n === 1) return { x: path[0].x, z: path[0].z, heading: path[0].ry, walking: false };

  const leg = (i: number) => {
    const a = path[i % n];
    const b = path[(i + 1) % n];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const dist = Math.hypot(dx, dz);
    return { a, b, dx, dz, dist, heading: dist > 0.0001 ? Math.atan2(dx, dz) : a.ry };
  };

  // Forward is (sin h, cos h), so a walker's right hand is (cos h, −sin h).
  // Scaled down on short legs: swinging the full lane width out and back
  // inside a two-metre step reads as a sideways lurch rather than as keeping
  // to one side.
  const right = (i: number): [number, number] => {
    const { heading, dist } = leg(i);
    const k = lane * Math.min(1, dist / 2.5);
    return [Math.cos(heading) * k, -Math.sin(heading) * k];
  };
  /** The lane direction AT a waypoint: halfway between the two legs meeting
   *  there. At a right angle it cuts the corner slightly; at a dead end the two
   *  cancel out, so the walker crosses the centre line as they turn round
   *  rather than teleporting from one side of the corridor to the other. */
  const corner = (i: number): [number, number] => {
    const [ax, az] = right(i - 1 + n);
    const [bx, bz] = right(i);
    return [(ax + bx) / 2, (az + bz) / 2];
  };
  const mix = (u: [number, number], v: [number, number], k: number): [number, number] => [
    u[0] + (v[0] - u[0]) * k,
    u[1] + (v[1] - u[1]) * k,
  ];

  let total = 0;
  for (let i = 0; i < n; i++) total += leg(i).dist / speed + (path[(i + 1) % n].hold ?? 0);
  if (total <= 0) {
    return { x: path[0].x, z: path[0].z, heading: path[0].ry, walking: false };
  }

  let u = ((t % total) + total) % total;
  for (let i = 0; i < n; i++) {
    const { a, b, dx, dz, dist, heading } = leg(i);
    const walk = dist / speed;

    if (u < walk) {
      const k = walk > 0 ? u / walk : 0;
      const along = dist * k;
      const blend = Math.min(LANE_BLEND, dist / 2);
      let dir: [number, number];
      if (along < blend) dir = mix(corner(i), right(i), along / blend);
      else if (along > dist - blend) dir = mix(right(i), corner(i + 1), (along - (dist - blend)) / blend);
      else dir = right(i);
      return {
        x: a.x + dx * k + dir[0] * lane,
        z: a.z + dz * k + dir[1] * lane,
        heading,
        walking: true,
      };
    }
    u -= walk;

    const hold = b.hold ?? 0;
    if (u < hold) {
      // Standing at a waypoint: hold the corner's lane, so nobody sidesteps
      // across the floor while they are supposed to be standing still.
      const dir = corner(i + 1);
      return { x: b.x + dir[0] * lane, z: b.z + dir[1] * lane, heading, walking: false };
    }
    u -= hold;
  }
  return { x: path[0].x, z: path[0].z, heading: path[0].ry, walking: false };
}

/**
 * The same closed loop, rotated to begin `distance` metres along it.
 *
 * This is the whole answer to wanderers piling up on one another. Everybody
 * walks the identical loop at the identical speed and holds for the identical
 * time at each stop, so whatever gap two of them start with is the gap they
 * keep — for as long as the page is open. Spacing them by ARRAY INDEX, which
 * is what this replaced, looked even and was not: two door points a metre
 * apart count as one step, so the two people given those indices spent the
 * whole loop standing on top of each other.
 *
 * The split point is a waypoint like any other except that nobody stops there:
 * a hold at the seam would be a hold the others never take, and the spacing
 * would drift apart a little more every lap.
 */
function spaceOut(loop: Spot[], distance: number): Spot[] {
  let left = distance;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len >= left) {
      const t = len === 0 ? 0 : left / len;
      const seam: Spot = {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        ry: 0,
        hold: 0,
      };
      return [seam, ...loop.slice(i + 1), ...loop.slice(0, i + 1)];
    }
    left -= len;
  }
  return loop.map((s) => ({ ...s }));
}

/** Public rooms a wanderer will drift through, in the order they unlock. */
const ROAM_STOPS = ["courtyard", "library", "forecourt", "cafeteria", "gym"];

// Which pairs of rooms are worth walking between, in the order they unlock.
// Every entry is skipped until both its rooms exist, so this list doubles as a
// progression: the campus does not just get bigger, it gets busier.
const JOURNEY_PAIRS: [string, string][] = [
  ["library", "lab"],
  ["lab", "courtyard"],
  ["library", "courtyard"],
  ["lobby", "library"],
  ["cafeteria", "courtyard"],
  ["gym", "cafeteria"],
  ["lobby", "gym"],
  ["cafeteria", "gym"],
  ["lobby", "courtyard"],
  ["cafeteria", "library"],
];

export function peoplePlan(plan: SchoolPlan, layoutId: LayoutId): PeoplePlan {
  const stage = plan.stage;
  const desks = deskLayout(plan, layoutId);
  const seats = desks.map(seatOf);

  // The player takes the desk nearest the camera — largest x + z under the
  // fixed isometric angle — rather than the first one in the list. Their avatar
  // is the only one they dressed themselves; putting it in the back row where
  // it is half a centimetre tall wastes the one thing they customised.
  let playerIdx = 0;
  for (let i = 1; i < seats.length; i++) {
    if (seats[i].x + seats[i].z > seats[playerIdx].x + seats[playerIdx].z) playerIdx = i;
  }
  const playerSeat = seats.length ? seats[playerIdx] : null;
  const students: SeatedPerson[] = seats
    .filter((_, i) => i !== playerIdx)
    .slice(0, stage.students)
    .map((spot, i) => ({ key: `s${i}`, spot, pose: "desk" as const, role: "student" as const }));

  // Every other classroom fills the same way, minus the player.
  for (const c of classroomsOf(plan)) {
    if (c.id === "classroom") continue;
    deskLayout(plan, layoutId, c.id)
      .map(seatOf)
      .slice(0, stage.secondaryStudents)
      .forEach((spot, i) =>
        students.push({ key: `${c.id}-s${i}`, spot, pose: "desk", role: "student" }),
      );
  }

  // Readers and lab users are tied to the props they sit in, so they appear
  // and vanish with the room rather than needing their own stage counter.
  const lib = room(plan, "library");
  if (lib) {
    // In the armchairs, not beside them and not facing into the backrest.
    // `sitOn` is the whole rule: a seat's back is on its local +z.
    students.push({
      key: "r0",
      spot: sitOn({ x: lib.x + lib.w / 2 - 1.5, z: lib.z + 4.4, ry: -Math.PI / 2 }),
      pose: "armchair",
      role: "librarian",
    });
    students.push({
      key: "r1",
      spot: sitOn({ x: lib.x + lib.w / 2 + 1.5, z: lib.z + 4.4, ry: Math.PI / 2 }),
      pose: "armchair",
      role: "librarian",
    });
  }
  const lab = room(plan, "lab");
  if (lab) {
    labBoothRow(lab, plan.doors.lab?.x ?? lab.x + lab.w / 2).forEach((x, i) => {
      students.push({
        // On the booth's stool, which is BOOTH_STOOL behind its worktop.
        spot: sitOn({ x, z: lab.z + 2.2 + BOOTH_STOOL, ry: 0 }),
        key: `b${i}`,
        pose: "booth",
        role: "listener",
      });
    });
  }
  // Somebody has to be behind the front desk, or reception reads as abandoned.
  const lobby = room(plan, "lobby");
  if (lobby) {
    const lobbyDoorX = plan.doors.lobby?.x ?? lobby.x + lobby.w / 2;
    const laneHalf = DOOR_WIDTH / 2 + 0.4;
    const eastRoom = lobby.x + lobby.w - (lobbyDoorX + laneHalf) - 0.4;
    const deskLen = Math.max(1.8, Math.min(3.4, eastRoom));
    students.push({
      key: "recep",
      // On the chair behind the desk — this used to be a person sitting on
      // thin air, which is only invisible because the desk is in front of it.
      spot: sitOn({ x: lobbyDoorX + laneHalf + deskLen / 2 + 0.2, z: lobby.z + 2.55, ry: Math.PI }),
      pose: "desk",
      role: "receptionist",
    });
  }

  const teachers: PatrolPerson[] = [];
  const patrolIn = (r: SchoolRoomRect, key: string) => {
    // Back and forth across the front of the board, with a turn-to-the-class
    // stop at each end — the two waypoints in the middle are what make the
    // walk read as pacing rather than sliding, and they are walked THROUGH.
    const z = r.z + 1.5;
    teachers.push({
      key,
      role: "teacher",
      path: [
        { x: r.x + 2.2, z, ry: 0, hold: 2.8 },
        { x: r.x + r.w / 2, z: z - 0.35, ry: 0 },
        { x: r.x + r.w - 3.6, z, ry: 0, hold: 2.2 },
        { x: r.x + r.w / 2, z: z + 0.35, ry: 0 },
      ],
    });
  };
  const classroom = room(plan, "classroom");
  if (classroom) patrolIn(classroom, "t0");
  const hall = room(plan, "hall");
  if (hall && stage.teachers > 1) {
    teachers.push({
      key: "t1",
      role: "teacher",
      path: [
        { x: hall.x + hall.w / 2 - 2, z: hall.z + 3.4, ry: 0, hold: 3.0 },
        { x: hall.x + hall.w / 2 + 2, z: hall.z + 3.4, ry: 0, hold: 2.4 },
      ],
    });
  }
  // One teacher per classroom, as far as the stage's teacher budget stretches.
  classroomsOf(plan)
    .filter((c) => c.id !== "classroom")
    .forEach((c, i) => {
      if (teachers.length < stage.teachers) patrolIn(c, `tc${i}`);
    });

  // Wanderers walk a loop through whatever public space exists.
  //
  // The loop is built out of REAL ROUTES, not straight lines between nice
  // spots. The first version strung together one point per room and let people
  // walk the diagonal between them, which sent them clean through the lab's
  // north wall — the reported "walking through walls" bug. Going via
  // routeBetween means every leg leaves through a door, exactly as a commuter
  // does.
  const roamStops = ROAM_STOPS.filter((id) => room(plan, id) && plan.doors[id]);
  const loop: Spot[] = [];
  const corridor = room(plan, "corridor");

  if (corridor && roamStops.length >= 2) {
    for (let i = 0; i < roamStops.length; i++) {
      const here = roamStops[i];
      const next = roamStops[(i + 1) % roamStops.length];
      loop.push(...insideDoor(plan, here));
      loop.push(...routeBetween(plan, here, next, corridor));
    }
  } else if (corridor) {
    // Before there is anywhere to go, they pace the corridor itself — AROUND
    // it, not along it. A there-and-back line is not a loop: the same stretch
    // of floor is both the outward leg and the return, so two people at
    // different points on it meet in the middle and walk through each other
    // twice a lap. Up one side and back down the other, and they never do.
    const lo = corridor.z + corridor.d / 2 - 0.6;
    const hi = corridor.z + corridor.d / 2 + 0.6;
    const x0 = corridor.x + 1.5;
    const x1 = corridor.x + corridor.w - 1.5;
    loop.push({ x: x0, z: lo, ry: 0 });
    loop.push({ x: x1, z: lo, ry: 0, hold: 2.4 });
    loop.push({ x: x1, z: hi, ry: 0 });
    loop.push({ x: x0, z: hi, ry: 0, hold: 2.4 });
  }

  const wanderers: PatrolPerson[] = [];
  const route = tidy(loop);
  if (route.length >= 2) {
    // Spread evenly around the loop BY DISTANCE. Ten wanderers on a 200m loop
    // are twenty metres apart and stay twenty metres apart, which is what
    // stopped two of them from arriving at the same doorway and standing
    // inside each other.
    let span = 0;
    for (let i = 0; i < route.length; i++) {
      const a = route[i];
      const b = route[(i + 1) % route.length];
      span += Math.hypot(b.x - a.x, b.z - a.z);
    }

    // Nobody may stand still for longer than the gap between two people
    // reaching the same spot, or the second arrives while the first is still
    // there and they end up merged. Early on the loop is short and there are
    // already five of them, so they barely stop at all — which is the honest
    // answer: a small school with a lot of people in it is a busy one.
    const apart = span / Math.max(1, stage.wanderers) / WALK_SPEED;
    const paced = route.map((s) => ({
      ...s,
      hold: Math.min(s.hold ?? 0, Math.max(0, apart - 1.4)),
    }));

    for (let i = 0; i < stage.wanderers; i++) {
      wanderers.push({
        key: `w${i}`,
        role: "student",
        path: spaceOut(paced, (i * span) / Math.max(1, stage.wanderers)),
      });
    }
  }

  // Commuters need a corridor to cross; before stage 3 there is nowhere to go.
  // Seats are handed out at most once each, so two commuters can never be
  // routed into the same chair.
  const commuters: CommuterPerson[] = [];
  if (corridor) {
    const used = new Map<string, number>();
    for (const [a, b] of JOURNEY_PAIRS) {
      if (commuters.length >= stage.commuters) break;
      // Skip a pair where one room is simply on the way to the other.
      if (isOnPathTo(plan, a, b) || isOnPathTo(plan, b, a)) continue;
      const seatsA = visitSeats(plan, a);
      const seatsB = visitSeats(plan, b);
      const ia = used.get(a) ?? 0;
      const ib = used.get(b) ?? 0;
      if (ia >= seatsA.length || ib >= seatsB.length) continue;
      used.set(a, ia + 1);
      used.set(b, ib + 1);
      const from = seatsA[ia];
      const to = seatsB[ib];
      commuters.push({
        key: `c${commuters.length}`,
        seats: [from.spot, to.spot],
        role: roleForRoom(b),
        // Out along one room's aisle, across the campus, in along the other's.
        path: [
          ...[...from.via].reverse(),
          ...routeBetween(plan, a, b, corridor),
          ...to.via,
        ],
      });
    }
  }

  return { playerSeat, students, teachers, wanderers, commuters };
}

// ── Doorways ────────────────────────────────────────────────────────────────

export interface WallOpening {
  /** Centre of the gap along the wall's own axis (x for north, z for west). */
  at: number;
  width: number;
}

export interface RoomOpenings {
  north: WallOpening[];
  west: WallOpening[];
}

export const DOOR_WIDTH = 1.6;

/** Wall thickness. Lives here rather than in Building.tsx because props have to
 *  know it too: a door leaf set into a wall has to sit in that wall's plane, or
 *  it hangs in the room looking like a door left ajar. */
export const WALL_T = 0.22;

/**
 * Where to cut a hole in a wall, keyed by room id.
 *
 * People were walking through solid walls because the routes and the geometry
 * had never been reconciled: the router already sent everyone through a door
 * POINT on the shared edge, but Building.tsx drew that edge as one unbroken
 * box. Both now read from the same door map, so a route and a gap cannot
 * disagree.
 *
 * Only north and west walls are ever drawn (see Building.tsx), so an opening
 * is only recorded when a door point lands on one of those two edges.
 */
/** How wide the gap in the boundary wall is where the front gate stands. */
export const GATE_WIDTH = 3.4;

type SideOpenings = Record<WallSide, WallOpening[]>;

const emptySides = (): SideOpenings => ({ north: [], south: [], west: [], east: [] });

/** Openings from the catalog's own door map only — no synthetic ones. Kept
 *  separate because `classroomWestDoor` has to ask which walls are free, and
 *  asking the full picture would ask back about the door being placed. */
function nodeOpenings(plan: SchoolPlan, r: SchoolRoomRect): SideOpenings {
  const out = emptySides();
  for (const other of plan.rooms) {
    const door = plan.doors[other.id];
    if (door) addOpening(out, r, door.x, door.z, DOOR_WIDTH);
  }
  return out;
}

function addOpening(
  into: SideOpenings,
  r: SchoolRoomRect,
  x: number,
  z: number,
  width: number,
) {
  const alongX = x > r.x - 0.01 && x < r.x + r.w + 0.01;
  const alongZ = z > r.z - 0.01 && z < r.z + r.d + 0.01;
  if (alongX && Math.abs(z - r.z) < 0.01) into.north.push({ at: x, width });
  if (alongX && Math.abs(z - (r.z + r.d)) < 0.01) into.south.push({ at: x, width });
  if (alongZ && Math.abs(x - r.x) < 0.01) into.west.push({ at: z, width });
  if (alongZ && Math.abs(x - (r.x + r.w)) < 0.01) into.east.push({ at: z, width });
}

/**
 * Every gap in every one of a room's four boundaries.
 *
 * The cutaway only ever draws north and west (`wallOpenings` below is the view
 * of this that it wants). The exterior view draws all four, and the garden
 * walls around the yard and the forecourt need their gateways cut out of the
 * south and east sides too.
 */
export function boundaryOpenings(plan: SchoolPlan, r: SchoolRoomRect): SideOpenings {
  const out = nodeOpenings(plan, r);

  // Every classroom also has its own door onto whatever is west of it — the
  // one the `door` prop is drawn in.
  for (const other of plan.rooms) {
    const at = classroomWestDoor(plan, other);
    if (at !== null) addOpening(out, r, other.x, at, DOOR_WIDTH);
  }
  // The way in off the street.
  if (r.kind === "forecourt") {
    out.south.push({ at: r.x + r.w / 2, width: GATE_WIDTH });
  }
  return out;
}

export function wallOpenings(plan: SchoolPlan): Record<string, RoomOpenings> {
  const out: Record<string, RoomOpenings> = {};
  for (const r of plan.rooms) {
    const sides = boundaryOpenings(plan, r);
    out[r.id] = { north: sides.north, west: sides.west };
  }
  return out;
}
