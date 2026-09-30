// modules/school/walkGrid.ts
//
// Where the player's own character can walk, and how it gets there.
//
// Everybody else in the school follows a route authored for them (props.ts);
// the player goes wherever they tap, so they need something that knows the
// building. That is a grid over the campus, a quarter of a metre a cell: open
// inside every room, closed a body's width from its walls, open again through
// each doorway the building actually has (`boundaryOpenings`), and closed
// wherever a piece of furniture stands (`blockers`). A* over it finds the way;
// the path is then pulled tight, so the character walks straight across a room
// instead of zig-zagging from cell to cell.
//
// Pure: no React, no three.js. The scene builds one grid per plan.

import { SchoolPlan, blockers, boundaryOpenings } from "./props";

/** Metres per cell. */
export const CELL = 0.25;
/** How far from a wall the middle of a body stays. */
const WALL_CLEAR = 0.3;
/** …and from the edge of a piece of furniture. */
const PROP_CLEAR = 0.18;

export interface WalkGrid {
  x0: number;
  z0: number;
  cols: number;
  rows: number;
  /** 1 where a body can stand. */
  open: Uint8Array;
}

export interface Point {
  x: number;
  z: number;
}

const idx = (g: WalkGrid, c: number, r: number) => r * g.cols + c;
const colOf = (g: WalkGrid, x: number) => Math.floor((x - g.x0) / CELL);
const rowOf = (g: WalkGrid, z: number) => Math.floor((z - g.z0) / CELL);
const centre = (g: WalkGrid, c: number, r: number): Point => ({
  x: g.x0 + (c + 0.5) * CELL,
  z: g.z0 + (r + 0.5) * CELL,
});

/** Sets every cell whose centre lies inside the box. */
function fill(g: WalkGrid, x0: number, z0: number, x1: number, z1: number, v: 0 | 1) {
  const c0 = Math.max(0, Math.ceil((x0 - g.x0) / CELL - 0.5));
  const c1 = Math.min(g.cols - 1, Math.floor((x1 - g.x0) / CELL - 0.5));
  const r0 = Math.max(0, Math.ceil((z0 - g.z0) / CELL - 0.5));
  const r1 = Math.min(g.rows - 1, Math.floor((z1 - g.z0) / CELL - 0.5));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) g.open[idx(g, c, r)] = v;
}

export function walkGrid(plan: SchoolPlan): WalkGrid {
  const rooms = plan.rooms;
  const minX = Math.min(...rooms.map((r) => r.x)) - 1;
  const minZ = Math.min(...rooms.map((r) => r.z)) - 1;
  const maxX = Math.max(...rooms.map((r) => r.x + r.w)) + 1;
  const maxZ = Math.max(...rooms.map((r) => r.z + r.d)) + 1;
  const g: WalkGrid = {
    x0: minX,
    z0: minZ,
    cols: Math.ceil((maxX - minX) / CELL),
    rows: Math.ceil((maxZ - minZ) / CELL),
    open: new Uint8Array(0),
  };
  g.open = new Uint8Array(g.cols * g.rows);

  for (const r of rooms) {
    fill(g, r.x + WALL_CLEAR, r.z + WALL_CLEAR, r.x + r.w - WALL_CLEAR, r.z + r.d - WALL_CLEAR, 1);
  }

  // Doorways: a passage straight through the wall, as wide as the opening
  // less a body's width. Only where there is a room on the far side — the
  // front gate opens onto the street, and a passage that led nowhere would be
  // a place the player could get stuck looking at the pavement.
  const inRoom = (x: number, z: number) =>
    rooms.some((o) => x > o.x && x < o.x + o.w && z > o.z && z < o.z + o.d);
  const reach = WALL_CLEAR + CELL;
  for (const r of rooms) {
    const sides = boundaryOpenings(plan, r);
    for (const o of sides.north) {
      if (!inRoom(o.at, r.z - 0.5)) continue;
      fill(g, o.at - o.width / 2 + WALL_CLEAR, r.z - reach, o.at + o.width / 2 - WALL_CLEAR, r.z + reach, 1);
    }
    for (const o of sides.south) {
      if (!inRoom(o.at, r.z + r.d + 0.5)) continue;
      fill(g, o.at - o.width / 2 + WALL_CLEAR, r.z + r.d - reach, o.at + o.width / 2 - WALL_CLEAR, r.z + r.d + reach, 1);
    }
    for (const o of sides.west) {
      if (!inRoom(r.x - 0.5, o.at)) continue;
      fill(g, r.x - reach, o.at - o.width / 2 + WALL_CLEAR, r.x + reach, o.at + o.width / 2 - WALL_CLEAR, 1);
    }
    for (const o of sides.east) {
      if (!inRoom(r.x + r.w + 0.5, o.at)) continue;
      fill(g, r.x + r.w - reach, o.at - o.width / 2 + WALL_CLEAR, r.x + r.w + reach, o.at + o.width / 2 - WALL_CLEAR, 1);
    }
  }

  for (const b of blockers(plan)) {
    fill(g, b.x0 - PROP_CLEAR, b.z0 - PROP_CLEAR, b.x1 + PROP_CLEAR, b.z1 + PROP_CLEAR, 0);
  }
  return g;
}

/** Whether a body can stand at this point. */
export function canStand(g: WalkGrid, p: Point): boolean {
  const c = colOf(g, p.x);
  const r = rowOf(g, p.z);
  return c >= 0 && r >= 0 && c < g.cols && r < g.rows && g.open[idx(g, c, r)] === 1;
}

/** The standable point nearest `p`, within `radius` metres, or null. */
export function nearestStandable(g: WalkGrid, p: Point, radius = 3): Point | null {
  if (canStand(g, p)) return p;
  const c0 = colOf(g, p.x);
  const r0 = rowOf(g, p.z);
  const max = Math.ceil(radius / CELL);
  let best: Point | null = null;
  let bestD = Infinity;
  for (let ring = 1; ring <= max; ring++) {
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (c < 0 || r < 0 || c >= g.cols || r >= g.rows || !g.open[idx(g, c, r)]) continue;
        const q = centre(g, c, r);
        const d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < bestD) {
          bestD = d;
          best = q;
        }
      }
    }
    // Anything in a later ring is at least `ring` cells away; stop once a
    // find this close cannot be beaten.
    if (best && bestD <= ring * CELL) break;
  }
  return best;
}

/** Whether the straight line from a to b stays on open ground. */
function clearLine(g: WalkGrid, a: Point, b: Point): boolean {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  // Fine enough that a line cannot slip across the corner of a closed cell
  // between two samples.
  const steps = Math.max(1, Math.ceil(len / 0.04));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!canStand(g, { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })) return false;
  }
  return true;
}

/**
 * The way from `from` to `to` as a short list of straight legs, ending at
 * `to` — or null if there is no way. `to` must be standable (see
 * `nearestStandable`); `from` is where the character is, which is.
 */
export function findPath(g: WalkGrid, from: Point, to: Point): Point[] | null {
  const sc = colOf(g, from.x);
  const sr = rowOf(g, from.z);
  const tc = colOf(g, to.x);
  const tr = rowOf(g, to.z);
  const inside = (c: number, r: number) => c >= 0 && r >= 0 && c < g.cols && r < g.rows;
  if (!inside(sc, sr) || !inside(tc, tr) || !g.open[idx(g, tc, tr)]) return null;
  if (sc === tc && sr === tr) return [to];

  const n = g.cols * g.rows;
  const cost = new Float32Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const start = idx(g, sc, sr);
  const goal = idx(g, tc, tr);
  cost[start] = 0;

  // A binary heap of [priority, cell].
  const heap: number[] = [];
  const push = (pri: number, cell: number) => {
    heap.push(pri, cell);
    let i = heap.length / 2 - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p * 2] <= heap[i * 2]) break;
      [heap[p * 2], heap[i * 2]] = [heap[i * 2], heap[p * 2]];
      [heap[p * 2 + 1], heap[i * 2 + 1]] = [heap[i * 2 + 1], heap[p * 2 + 1]];
      i = p;
    }
  };
  const pop = (): number => {
    const top = heap[1];
    const lastPri = heap[heap.length - 2];
    const lastCell = heap[heap.length - 1];
    heap.length -= 2;
    if (heap.length) {
      heap[0] = lastPri;
      heap[1] = lastCell;
      let i = 0;
      const size = heap.length / 2;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < size && heap[l * 2] < heap[m * 2]) m = l;
        if (r < size && heap[r * 2] < heap[m * 2]) m = r;
        if (m === i) break;
        [heap[m * 2], heap[i * 2]] = [heap[i * 2], heap[m * 2]];
        [heap[m * 2 + 1], heap[i * 2 + 1]] = [heap[i * 2 + 1], heap[m * 2 + 1]];
        i = m;
      }
    }
    return top;
  };
  const h = (c: number, r: number) => {
    const dx = Math.abs(c - tc);
    const dz = Math.abs(r - tr);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  };

  push(h(sc, sr), start);
  let found = false;
  while (heap.length) {
    const cell = pop();
    if (closed[cell]) continue;
    if (cell === goal) {
      found = true;
      break;
    }
    closed[cell] = 1;
    const c = cell % g.cols;
    const r = (cell - c) / g.cols;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (!inside(nc, nr)) continue;
        const next = idx(g, nc, nr);
        if (!g.open[next] || closed[next]) continue;
        // No cutting a corner: a diagonal step needs both cells beside it.
        if (dr && dc && (!g.open[idx(g, c + dc, r)] || !g.open[idx(g, c, r + dr)])) continue;
        const step = dr && dc ? Math.SQRT2 : 1;
        const through = cost[cell] + step;
        if (through < cost[next]) {
          cost[next] = through;
          came[next] = cell;
          push(through + h(nc, nr), next);
        }
      }
    }
  }
  if (!found) return null;

  // Cell centres back from the goal, then pulled tight: keep a point only
  // where the straight line from the last kept one would hit something.
  const cells: Point[] = [];
  for (let cell = goal; cell !== -1 && cell !== start; cell = came[cell]) {
    const c = cell % g.cols;
    cells.push(centre(g, c, (cell - c) / g.cols));
  }
  cells.reverse();
  cells[cells.length - 1] = to;
  const out: Point[] = [];
  let anchor = from;
  for (let i = 0; i < cells.length; i++) {
    const next = cells[i + 1];
    if (next && clearLine(g, anchor, next)) continue;
    out.push(cells[i]);
    anchor = cells[i];
  }
  return out;
}
