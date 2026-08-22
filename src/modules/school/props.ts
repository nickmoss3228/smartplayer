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
}

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

// ── Fixed furniture ─────────────────────────────────────────────────────────
// Everything that is not a desk. Positions are absolute world tiles, derived
// from whichever rooms the stage has, so a stage that lacks a room simply
// contributes nothing here.

function classroomProps(r: SchoolRoomRect, stage: SchoolStage, english: boolean): PropInstance[] {
  const p: PropInstance[] = [];
  // The board sits left of centre rather than centred, and is capped well short
  // of the wall's width. A board centred on a 5m wall covers every position the
  // window loop below would pick, and stage 0 ends up with no windows at all.
  const boardLen = Math.min(4, r.w * 0.45);
  const boardX = r.x + r.w * 0.32;
  p.push({ key: "board", type: "board", x: boardX, z: r.z + 0.22, ry: 0, len: boardLen });
  p.push({ key: "tdesk", type: "teacherDesk", x: r.x + r.w - 2.2, z: r.z + 1.5, ry: Math.PI });
  p.push({ key: "clock", type: "clock", x: r.x + r.w - 1.2, z: r.z + 0.24, ry: 0 });
  p.push({ key: "door", type: "door", x: r.x + 0.2, z: r.z + r.d - 1.6, ry: Math.PI / 2 });

  // Windows march along the north wall, skipping the span the board occupies.
  const boardMin = boardX - boardLen / 2 - 0.5;
  const boardMax = boardX + boardLen / 2 + 0.5;
  for (let wx = r.x + 1.2; wx < r.x + r.w - 1; wx += 2.2) {
    if (wx > boardMin && wx < boardMax) continue;
    p.push({ key: `win${wx.toFixed(1)}`, type: "window", x: wx, z: r.z + 0.16, ry: 0 });
  }

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

function libraryProps(r: SchoolRoomRect): PropInstance[] {
  const p: PropInstance[] = [];
  for (let i = 0; i < 3; i++) {
    p.push({ key: `lshelf${i}`, type: "bookshelf", x: r.x + 1.4 + i * 2.1, z: r.z + 0.7, ry: 0, len: 1.8 });
  }
  p.push({ key: "lshelfw", type: "bookshelf", x: r.x + 0.55, z: r.z + 3.4, ry: Math.PI / 2, len: 2.4 });
  p.push({ key: "lrug", type: "rug", x: r.x + r.w / 2, z: r.z + 4.6, ry: 0 });
  p.push({ key: "larm1", type: "armchair", x: r.x + r.w / 2 - 1.5, z: r.z + 4.4, ry: Math.PI / 2 });
  p.push({ key: "larm2", type: "armchair", x: r.x + r.w / 2 + 1.5, z: r.z + 4.4, ry: -Math.PI / 2 });
  p.push({ key: "ltable", type: "readingTable", x: r.x + r.w / 2, z: r.z + 4.5, ry: 0 });
  p.push({ key: "lplant", type: "plant", x: r.x + r.w - 0.8, z: r.z + r.d - 0.9, ry: 0 });
  p.push({ key: "lwin", type: "window", x: r.x + r.w - 2.2, z: r.z + 0.16, ry: 0 });
  p.push({ key: "lglobe", type: "globe", x: r.x + 1.1, z: r.z + 6.6, ry: 0 });
  return p;
}

function corridorProps(r: SchoolRoomRect): PropInstance[] {
  const p: PropInstance[] = [];
  const banks = Math.max(3, Math.floor((r.w - 4) / 4.2));
  for (let i = 0; i < banks; i++) {
    p.push({ key: `lock${i}`, type: "lockers", x: r.x + 2.5 + i * 4.2, z: r.z + 0.5, ry: 0, len: 2.4 });
  }
  p.push({ key: "cbench", type: "bench", x: r.x + r.w - 3, z: r.z + 2.1, ry: Math.PI });
  p.push({ key: "cplant", type: "plant", x: r.x + 1, z: r.z + 2.2, ry: 0 });
  p.push({ key: "cposter", type: "poster", x: r.x + 9.4, z: r.z + 0.2, ry: 0, tint: "#6a95d9" });
  if (r.w > 20) {
    p.push({ key: "cwater", type: "waterCooler", x: r.x + 20.6, z: r.z + 0.6, ry: 0 });
  }
  return p;
}

function labProps(r: SchoolRoomRect, doorX: number): PropInstance[] {
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

  p.push({ key: "labposter", type: "poster", x: r.x + r.w / 2, z: r.z + 0.2, ry: 0, tint: "#7fb08a" });
  return p;
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
  p.push({ key: "yb1", type: "bench", x: r.x + r.w / 2 - 3.0, z: r.z + r.d / 2 + 1.4, ry: Math.PI / 2 });
  p.push({ key: "yb2", type: "bench", x: r.x + r.w / 2 + 3.0, z: r.z + r.d / 2 + 1.4, ry: -Math.PI / 2 });
  p.push({ key: "ylamp", type: "lamppost", x: r.x + 0.8, z: r.z + r.d - 1.2, ry: 0 });
  for (let i = 0; i < 4; i++) {
    p.push({ key: `bush${i}`, type: "bush", x: r.x + 0.8, z: r.z + 5.0 + i * 1.1, ry: 0 });
  }
  return p;
}

function hallProps(r: SchoolRoomRect): PropInstance[] {
  const p: PropInstance[] = [];
  p.push({ key: "stage", type: "stagePlatform", x: r.x + r.w / 2, z: r.z + 1.9, ry: 0 });
  p.push({ key: "banner", type: "banner", x: r.x + r.w / 2, z: r.z + 0.22, ry: 0, len: 5 });
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
function lobbyProps(r: SchoolRoomRect, doorX: number): PropInstance[] {
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
  p.push({ key: "notice", type: "noticeboard", x: r.x + 1.6, z: r.z + 0.2, ry: 0, len: 2.2 });
  p.push({ key: "sofa1", type: "sofa", x: doorX - 2.9, z: r.z + 4.8, ry: 0 });
  p.push({ key: "sofa2", type: "sofa", x: doorX + 2.9, z: r.z + 4.8, ry: 0 });
  p.push({ key: "lplant1", type: "plant", x: r.x + 0.7, z: r.z + 2.4, ry: 0 });
  p.push({ key: "lplant2", type: "plant", x: r.x + r.w - 0.7, z: r.z + 1.4, ry: 0 });
  p.push({ key: "ltrophy", type: "trophyShelf", x: r.x + 0.6, z: r.z + 6.4, ry: Math.PI / 2 });
  p.push({ key: "lclock", type: "clock", x: r.x + r.w - 1.4, z: r.z + 0.24, ry: 0 });
  return p;
}

// The way in. Everything here is outdoors, so it reads as ground rather than a
// room: a gate you walk under, a sign, lamps and planting either side.
function forecourtProps(r: SchoolRoomRect): PropInstance[] {
  const p: PropInstance[] = [];
  p.push({ key: "gate", type: "gate", x: r.x + r.w / 2, z: r.z + r.d - 0.7, ry: 0 });
  p.push({ key: "sign", type: "signpost", x: r.x + 1.4, z: r.z + 1.3, ry: 0 });
  p.push({ key: "lamp1", type: "lamppost", x: r.x + 0.9, z: r.z + 2.9, ry: 0 });
  p.push({ key: "lamp2", type: "lamppost", x: r.x + r.w - 0.9, z: r.z + 2.9, ry: 0 });
  for (let i = 0; i < 3; i++) {
    p.push({ key: `fb${i}`, type: "bush", x: r.x + 0.8, z: r.z + 0.7 + i * 1.0, ry: 0 });
    p.push({ key: `fc${i}`, type: "bush", x: r.x + r.w - 0.8, z: r.z + 0.7 + i * 1.0, ry: 0 });
  }
  return p;
}

function cafeteriaProps(r: SchoolRoomRect, doorX: number): PropInstance[] {
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
  p.push({ key: "cwin1", type: "window", x: r.x + 3, z: r.z + 0.16, ry: 0 });
  p.push({ key: "cwin2", type: "window", x: r.x + r.w - 3, z: r.z + 0.16, ry: 0 });
  return p;
}

function gymProps(r: SchoolRoomRect): PropInstance[] {
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
  p.push({ key: "score", type: "scoreboard", x: r.x + r.w - 2, z: r.z + 0.25, ry: 0 });
  p.push({ key: "hoop1", type: "hoop", x: r.x + 0.9, z: r.z + r.d / 2, ry: Math.PI / 2 });
  p.push({ key: "hoop2", type: "hoop", x: r.x + r.w - 0.9, z: r.z + r.d / 2, ry: -Math.PI / 2 });
  p.push({ key: "vault", type: "vault", x: r.x + r.w / 2 - 2.6, z: r.z + 4.4, ry: 0 });
  for (let i = 0; i < 3; i++) {
    p.push({ key: `mat${i}`, type: "mat", x: r.x + r.w / 2 + 1.4 + i * 1.5, z: r.z + 4.6, ry: 0 });
  }
  p.push({ key: "gb1", type: "bench", x: r.x + 2.4, z: r.z + r.d - 1.2, ry: Math.PI });
  p.push({ key: "gb2", type: "bench", x: r.x + r.w - 2.4, z: r.z + r.d - 1.2, ry: Math.PI });
  return p;
}

export function stageProps(plan: SchoolPlan): PropInstance[] {
  const out: PropInstance[] = [];
  const push = (id: string, fn: (r: SchoolRoomRect) => PropInstance[]) => {
    const r = room(plan, id);
    if (r) out.push(...fn(r).map((p) => ({ ...p, key: `${id}-${p.key}` })));
  };
  /** For rooms whose layout has to dodge their own doorway. */
  const pushWithDoor = (id: string, fn: (r: SchoolRoomRect, doorX: number) => PropInstance[]) => {
    const r = room(plan, id);
    if (!r) return;
    const doorX = plan.doors[id]?.x ?? r.x + r.w / 2;
    out.push(...fn(r, doorX).map((p) => ({ ...p, key: `${id}-${p.key}` })));
  };

  // Once there is more than one English room, they all get the English dressing
  // — before that the classroom is the whole school, and a globe plus two flags
  // in a bare 8×7 box reads as clutter rather than character.
  const english = plan.stage.index >= 7;
  for (const c of classroomsOf(plan)) {
    out.push(
      ...classroomProps(c, plan.stage, english).map((p) => ({ ...p, key: `${c.id}-${p.key}` })),
    );
  }

  push("library", libraryProps);
  push("corridor", corridorProps);
  pushWithDoor("lab", labProps);
  push("courtyard", courtyardProps);
  push("hall", hallProps);
  pushWithDoor("lobby", lobbyProps);
  push("forecourt", forecourtProps);
  pushWithDoor("cafeteria", cafeteriaProps);
  push("gym", gymProps);
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
}

export interface PatrolPerson {
  key: string;
  path: Spot[];
}

/** A student who sits somewhere, walks somewhere else, and sits down there. */
export interface CommuterPerson {
  key: string;
  seats: [Spot, Spot];
  /** Waypoints between the two seats, excluding the seats themselves. */
  path: Spot[];
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
  const bare = (spots: Spot[]): VisitSeat[] => spots.map((spot) => ({ spot, via: [] }));
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
    case "library":
      return bare([
        { x: r.x + r.w / 2 - 0.1, z: r.z + 5.7, ry: Math.PI },
        { x: r.x + 1.4, z: r.z + 5.9, ry: Math.PI },
        { x: r.x + r.w / 2 + 1.6, z: r.z + 5.9, ry: Math.PI },
      ]);
    case "courtyard":
      // Benches are reached down the east edge and along the south, never
      // straight across — the middle of the yard is a tree.
      return [
        {
          spot: { x: r.x + r.w / 2 - 2.15, z: r.z + r.d / 2 + 1.4, ry: -Math.PI / 2 },
          via: [
            { x: r.x + r.w - 1.6, z: r.z + 1.6, ry: 0 },
            { x: r.x + r.w - 1.6, z: r.z + r.d - 1.0, ry: 0 },
            { x: r.x + r.w / 2 - 2.15, z: r.z + r.d - 1.0, ry: 0 },
          ],
        },
        {
          spot: { x: r.x + r.w / 2 + 2.15, z: r.z + r.d / 2 + 1.4, ry: Math.PI / 2 },
          via: [
            { x: r.x + r.w - 1.6, z: r.z + 1.6, ry: 0 },
            { x: r.x + r.w - 1.6, z: r.z + r.d - 1.0, ry: 0 },
            { x: r.x + r.w / 2 + 2.15, z: r.z + r.d - 1.0, ry: 0 },
          ],
        },
        {
          spot: { x: r.x + r.w - 2.0, z: r.z + 1.8, ry: Math.PI },
          via: [],
        },
      ];
    case "lobby": {
      // On the two sofas, which sit either side of the through-lane.
      const doorX = plan.doors.lobby?.x ?? r.x + r.w / 2;
      return [
        { x: doorX - 3.5, z: r.z + 5.5, ry: Math.PI },
        { x: doorX - 2.3, z: r.z + 5.5, ry: Math.PI },
        { x: doorX + 2.9, z: r.z + 5.5, ry: Math.PI },
      ].map((spot) => ({
        spot,
        via: [{ x: doorX, z: r.z + 5.5, ry: 0 }],
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
      const seatZ = r.z + 5.5;
      return [-1.5, -0.5, 0.5, 1.5].map((k) => ({
        spot: { x: cx + k * 1.5, z: seatZ, ry: Math.PI },
        via: [
          { x: doorX, z: r.z + 1.4, ry: 0 },
          { x: doorX, z: seatZ, ry: 0 },
        ],
      }));
    }
    case "gym":
      // Two on each bench, reached down the east side — the middle of the gym
      // is a vaulting horse and three mats.
      return [
        { x: r.x + 1.7, z: r.z + r.d - 1.9, ry: 0 },
        { x: r.x + 3.1, z: r.z + r.d - 1.9, ry: 0 },
        { x: r.x + r.w - 3.1, z: r.z + r.d - 1.9, ry: 0 },
        { x: r.x + r.w - 1.7, z: r.z + r.d - 1.9, ry: 0 },
      ].map((spot) => ({
        spot,
        via: [
          { x: r.x + r.w - 1.8, z: r.z + 2.0, ry: 0 },
          { x: r.x + r.w - 1.8, z: r.z + r.d - 1.9, ry: 0 },
        ],
      }));
    default:
      return [];
  }
}

/** A point 1.6m inside a room's doorway. Reaching it from the door crosses no
 *  wall but that door's own opening, which is what makes it safe to use as a
 *  waypoint without knowing anything about the room's furniture. */
function insideDoor(plan: SchoolPlan, roomId: string): Spot | null {
  const r = room(plan, roomId);
  const d = plan.doors[roomId];
  if (!r || !d) return null;
  const cx = r.x + r.w / 2;
  const cz = r.z + r.d / 2;
  const len = Math.hypot(cx - d.x, cz - d.z) || 1;
  return { x: d.x + ((cx - d.x) / len) * 1.6, z: d.z + ((cz - d.z) / len) * 1.6, ry: 0 };
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
    .map((spot, i) => ({ key: `s${i}`, spot, pose: "desk" as const }));

  // Every other classroom fills the same way, minus the player.
  for (const c of classroomsOf(plan)) {
    if (c.id === "classroom") continue;
    deskLayout(plan, layoutId, c.id)
      .map(seatOf)
      .slice(0, stage.secondaryStudents)
      .forEach((spot, i) => students.push({ key: `${c.id}-s${i}`, spot, pose: "desk" }));
  }

  // Readers and lab users are tied to the props they sit in, so they appear
  // and vanish with the room rather than needing their own stage counter.
  const lib = room(plan, "library");
  if (lib) {
    students.push({
      key: "r0",
      spot: { x: lib.x + lib.w / 2 - 1.5, z: lib.z + 4.4, ry: Math.PI / 2 },
      pose: "armchair",
    });
    students.push({
      key: "r1",
      spot: { x: lib.x + lib.w / 2 + 1.5, z: lib.z + 4.4, ry: -Math.PI / 2 },
      pose: "armchair",
    });
  }
  const lab = room(plan, "lab");
  if (lab) {
    labBoothRow(lab, plan.doors.lab?.x ?? lab.x + lab.w / 2).forEach((x, i) => {
      students.push({ key: `b${i}`, spot: { x, z: lab.z + 2.9, ry: Math.PI }, pose: "booth" });
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
      spot: { x: lobbyDoorX + laneHalf + deskLen / 2 + 0.2, z: lobby.z + 2.55, ry: 0 },
      pose: "desk",
    });
  }

  const teachers: PatrolPerson[] = [];
  const patrolIn = (r: SchoolRoomRect, key: string) => {
    // Back and forth across the front of the board, with a turn-to-the-class
    // stop at each end — the two waypoints in the middle are what make the
    // walk read as pacing rather than sliding.
    const z = r.z + 1.5;
    teachers.push({
      key,
      path: [
        { x: r.x + 2.2, z, ry: 0 },
        { x: r.x + r.w / 2, z: z - 0.35, ry: 0 },
        { x: r.x + r.w - 3.6, z, ry: 0 },
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
      path: [
        { x: hall.x + hall.w / 2 - 2, z: hall.z + 3.4, ry: 0 },
        { x: hall.x + hall.w / 2 + 2, z: hall.z + 3.4, ry: 0 },
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
      const stop = insideDoor(plan, here);
      if (stop) loop.push(stop);
      loop.push(...routeBetween(plan, here, next, corridor));
    }
  } else if (corridor) {
    // Before there is anywhere to go, they pace the corridor itself.
    const z = corridor.z + corridor.d / 2;
    loop.push({ x: corridor.x + 1.5, z, ry: 0 });
    loop.push({ x: corridor.x + corridor.w - 1.5, z, ry: 0 });
  }

  const wanderers: PatrolPerson[] = [];
  if (loop.length >= 2) {
    for (let i = 0; i < stage.wanderers; i++) {
      // Each one starts at a different point on the same loop, so several of
      // them never form a conga line.
      const offset = Math.floor((i * loop.length) / Math.max(1, stage.wanderers));
      wanderers.push({
        key: `w${i}`,
        path: [...loop.slice(offset), ...loop.slice(0, offset)].map((sp) => ({ ...sp, ry: 0 })),
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
export function wallOpenings(plan: SchoolPlan): Record<string, RoomOpenings> {
  const out: Record<string, RoomOpenings> = {};
  const ensure = (id: string) => (out[id] ??= { north: [], west: [] });

  const points: { x: number; z: number }[] = [];
  for (const r of plan.rooms) {
    const door = plan.doors[r.id];
    if (door) points.push({ x: door.x, z: door.z });
  }

  // Every classroom also has its own door onto whatever is west of it — the
  // one the `door` prop is drawn in. Without this the prop hangs on a solid
  // wall, which is exactly the thing that looked wrong.
  for (const r of plan.rooms) {
    if (r.kind === "classroom") points.push({ x: r.x, z: r.z + r.d - 1.6 });
  }

  for (const r of plan.rooms) {
    if (r.outdoor) continue;
    for (const pt of points) {
      if (Math.abs(pt.z - r.z) < 0.01 && pt.x > r.x - 0.01 && pt.x < r.x + r.w + 0.01) {
        ensure(r.id).north.push({ at: pt.x, width: DOOR_WIDTH });
      }
      if (Math.abs(pt.x - r.x) < 0.01 && pt.z > r.z - 0.01 && pt.z < r.z + r.d + 0.01) {
        ensure(r.id).west.push({ at: pt.z, width: DOOR_WIDTH });
      }
    }
  }
  return out;
}
