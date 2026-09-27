// modules/school/roof.ts
//
// ONE roof over the whole building, instead of one per room.
//
// Per-room roofs were the trouble. A pitched roof per room meant a ridge per
// room, each running along that room's own longer side at a height worked out
// from its own size — so at twenty rooms the campus was a heap of crossing
// prisms with gable ends showing through the gaps. Flat finishes were inset
// inside every room, which drew the floor plan onto the roof as a grid of
// seams.
//
// The fix is to roof the FOOTPRINT, not the rooms. Every indoor room is grown
// out to the eave line and the union is rasterised; then each point's height
// is its Chebyshev (L∞) distance to the outside of that union, times a slope.
// On a footprint made of axis-aligned rectangles that is exactly a hip roof:
// every eave at the same height, the same pitch on every side, hips at the
// outside corners, valleys where two wings meet, and slopes running down into
// the courtyards. A cap on the height turns the middle of a big block into a
// flat top at one uniform height rather than a six-metre pyramid.
//
// Pure — no three.js here — so the tests can check the surface directly.

import { SchoolRoomRect } from "../../config/schoolCatalog";

/** Wall height, as Building.tsx draws it. */
const WALL_H = 3.0;
/** Sampling step of the distance field. Half the mesh cell, so the field is
 *  known at every cell's centre and at the middle of every cell edge. */
export const ROOF_STEP = 0.25;
/** One mesh cell. Room coordinates are whole metres and the eave sits half a
 *  metre out, so every edge of the footprint lands on this grid. */
export const ROOF_CELL = 0.5;
/** From a room's edge (the middle of its wall) out to the eave: half a wall
 *  plus the overhang. */
export const EAVE = 0.5;
/** Rise per metre of run. */
export const ROOF_SLOPE = 0.5;
/** The run after which the roof stops rising. A multiple of ROOF_CELL, so the
 *  edge of the flat top also lies on the mesh grid. Deep enough that a wing as
 *  deep as a classroom gets a proper ridge; only the big blocks, where several
 *  rooms sit side by side, have a flat top in the middle. */
export const ROOF_CAP_RUN = 4.5;
/** Where the roof crosses the outside face of the wall: a hair above the wall's
 *  cap, so the cap never pokes through. */
const AT_WALL_FACE = WALL_H + 0.1;
const WALL_FACE_RUN = EAVE - 0.11;
/** Height of the roof surface at the eave line. */
export const EAVE_Y = AT_WALL_FACE - ROOF_SLOPE * WALL_FACE_RUN;
/** Height of the flat top. */
export const ROOF_TOP_Y = EAVE_Y + ROOF_SLOPE * ROOF_CAP_RUN;

/** Roof height at a given distance in from the eave. */
export const roofHeight = (run: number) => EAVE_Y + ROOF_SLOPE * Math.min(Math.max(run, 0), ROOF_CAP_RUN);

export interface RoofField {
  /** World position of vertex (0, 0). */
  x0: number;
  z0: number;
  /** Vertex counts along x and z. */
  nx: number;
  nz: number;
  /** Per vertex, row-major along x: L∞ distance to the outside of the eave
   *  footprint, in metres. Zero on the eave line and everywhere outside. */
  dist: Float32Array;
  /** Per ROOF_STEP cell (nx-1 by nz-1): inside the footprint or not. */
  inside: Uint8Array;
}

/**
 * The distance field for a set of rooms. Only the indoor ones count — the
 * yard and the forecourt are open to the sky. Null when there is nothing
 * indoors to roof.
 */
export function roofField(rooms: SchoolRoomRect[]): RoofField | null {
  const grown = rooms
    .filter((r) => !r.outdoor)
    .map((r) => ({ x0: r.x - EAVE, z0: r.z - EAVE, x1: r.x + r.w + EAVE, z1: r.z + r.d + EAVE }));
  if (!grown.length) return null;

  // One mesh cell of empty margin all round, so every footprint vertex has a
  // neighbour outside it and the border needs no special case.
  const snap = (v: number) => Math.floor(v / ROOF_CELL) * ROOF_CELL;
  const x0 = snap(Math.min(...grown.map((g) => g.x0))) - ROOF_CELL;
  const z0 = snap(Math.min(...grown.map((g) => g.z0))) - ROOF_CELL;
  const x1 = Math.max(...grown.map((g) => g.x1)) + ROOF_CELL;
  const z1 = Math.max(...grown.map((g) => g.z1)) + ROOF_CELL;
  // Even vertex counts minus one: the mesh uses every other vertex, so the
  // number of steps must be even.
  const steps = (lo: number, hi: number) => 2 * Math.ceil((hi - lo) / ROOF_CELL);
  const cx = steps(x0, x1);
  const cz = steps(z0, z1);
  const nx = cx + 1;
  const nz = cz + 1;

  const inside = new Uint8Array(cx * cz);
  for (let j = 0; j < cz; j++) {
    const z = z0 + (j + 0.5) * ROOF_STEP;
    for (let i = 0; i < cx; i++) {
      const x = x0 + (i + 0.5) * ROOF_STEP;
      if (grown.some((g) => x > g.x0 && x < g.x1 && z > g.z0 && z < g.z1)) inside[j * cx + i] = 1;
    }
  }

  // A vertex is on the edge (distance 0) when any of the four cells around it
  // is outside. Everything else starts unknown.
  const cellIn = (i: number, j: number) => i >= 0 && j >= 0 && i < cx && j < cz && inside[j * cx + i] === 1;
  const BIG = 1e9;
  const d = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const allIn = cellIn(i - 1, j - 1) && cellIn(i, j - 1) && cellIn(i - 1, j) && cellIn(i, j);
      d[j * nx + i] = allIn ? BIG : 0;
    }
  }

  // Two-pass chessboard distance transform: exact for L∞ with unit steps.
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= nx || j >= nz ? BIG : d[j * nx + i]);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      d[k] = Math.min(d[k], at(i - 1, j) + 1, at(i - 1, j - 1) + 1, at(i, j - 1) + 1, at(i + 1, j - 1) + 1);
    }
  }
  for (let j = nz - 1; j >= 0; j--) {
    for (let i = nx - 1; i >= 0; i--) {
      const k = j * nx + i;
      d[k] = Math.min(d[k], at(i + 1, j) + 1, at(i + 1, j + 1) + 1, at(i, j + 1) + 1, at(i - 1, j + 1) + 1);
    }
  }
  for (let k = 0; k < d.length; k++) d[k] *= ROOF_STEP;

  return { x0, z0, nx, nz, dist: d, inside };
}

const vertexDist = (f: RoofField, i: number, j: number) =>
  i < 0 || j < 0 || i >= f.nx || j >= f.nz ? 0 : f.dist[j * f.nx + i];

/**
 * Distance at any point, erring short: the least of the field vertices around
 * it. Used to ask "is all of this fitting on the roof", where a wrong yes puts
 * a solar panel over the edge.
 */
export function distAt(f: RoofField, x: number, z: number): number {
  const fi = (x - f.x0) / ROOF_STEP;
  const fj = (z - f.z0) / ROOF_STEP;
  // A point exactly on a vertex line reads that line alone, or asking about a
  // wall's own position would answer for the next quarter-metre out.
  const i = Math.floor(fi + 1e-6);
  const j = Math.floor(fj + 1e-6);
  const i1 = fi - i < 1e-6 ? i : i + 1;
  const j1 = fj - j < 1e-6 ? j : j + 1;
  return Math.min(vertexDist(f, i, j), vertexDist(f, i1, j), vertexDist(f, i, j1), vertexDist(f, i1, j1));
}

/** Whether a whole axis-aligned box sits at least `margin` in from the eave. */
export function fitsOnRoof(f: RoofField, cx: number, cz: number, hw: number, hd: number, margin: number): boolean {
  for (const [x, z] of [
    [cx - hw, cz - hd],
    [cx + hw, cz - hd],
    [cx - hw, cz + hd],
    [cx + hw, cz + hd],
    [cx, cz],
  ]) {
    if (distAt(f, x, z) < margin) return false;
  }
  return true;
}

/** Mesh cells are two field steps wide; this is how many there are. */
const meshCells = (f: RoofField) => ({ mx: (f.nx - 1) / 2, mz: (f.nz - 1) / 2 });

/** A mesh cell is inside when its footprint cells are — they all agree, since
 *  the footprint's edges are on the mesh grid. */
function meshCellIn(f: RoofField, I: number, J: number): boolean {
  const cx = f.nx - 1;
  const { mx, mz } = meshCells(f);
  if (I < 0 || J < 0 || I >= mx || J >= mz) return false;
  return f.inside[(2 * J) * cx + 2 * I] === 1;
}

/**
 * The pitched roof's surface, as a flat list of triangle positions (x, y, z
 * per vertex, three vertices per triangle).
 *
 * Each mesh cell is a fan of four triangles round its centre, with the centre
 * at the field's true value there. The folds of an L∞ distance field on this
 * footprint run along the mesh grid lines and the cells' diagonals, and a
 * four-way fan is exact for both — so hips and valleys come out as sharp as
 * they are in the field, and neighbouring cells share their edges exactly.
 * Every triangle faces up.
 */
export function hipRoofTriangles(f: RoofField): Float32Array {
  const { mx, mz } = meshCells(f);
  const out: number[] = [];
  const P = (i: number, j: number): [number, number, number] => [
    f.x0 + i * ROOF_STEP,
    roofHeight(vertexDist(f, i, j)),
    f.z0 + j * ROOF_STEP,
  ];
  for (let J = 0; J < mz; J++) {
    for (let I = 0; I < mx; I++) {
      if (!meshCellIn(f, I, J)) continue;
      const i = 2 * I;
      const j = 2 * J;
      const A = P(i, j);
      const B = P(i + 2, j);
      const C = P(i + 2, j + 2);
      const D = P(i, j + 2);
      const M = P(i + 1, j + 1);
      // Wound so (b - a) × (c - a) points up: from the centre, clockwise as
      // seen from above in this x-right, z-down layout.
      out.push(...M, ...B, ...A);
      out.push(...M, ...C, ...B);
      out.push(...M, ...D, ...C);
      out.push(...M, ...A, ...D);
    }
  }
  return new Float32Array(out);
}

/**
 * The band under the eave, all the way round: the roof's edge given a
 * thickness, so it reads as a roof rather than a sheet of paper laid on the
 * walls. Quads, as triangle positions, meant for a double-sided material.
 */
export function fasciaTriangles(f: RoofField, depth: number): Float32Array {
  const { mx, mz } = meshCells(f);
  const out: number[] = [];
  const top = EAVE_Y;
  const bottom = EAVE_Y - depth;
  const quad = (xa: number, za: number, xb: number, zb: number) => {
    out.push(xa, top, za, xb, top, zb, xb, bottom, zb);
    out.push(xa, top, za, xb, bottom, zb, xa, bottom, za);
  };
  for (let J = 0; J < mz; J++) {
    for (let I = 0; I < mx; I++) {
      if (!meshCellIn(f, I, J)) continue;
      const xa = f.x0 + I * ROOF_CELL;
      const za = f.z0 + J * ROOF_CELL;
      const xb = xa + ROOF_CELL;
      const zb = za + ROOF_CELL;
      if (!meshCellIn(f, I, J - 1)) quad(xa, za, xb, za);
      if (!meshCellIn(f, I, J + 1)) quad(xa, zb, xb, zb);
      if (!meshCellIn(f, I - 1, J)) quad(xa, za, xa, zb);
      if (!meshCellIn(f, I + 1, J)) quad(xb, za, xb, zb);
    }
  }
  return new Float32Array(out);
}

export interface RoofRect {
  x: number;
  z: number;
  w: number;
  d: number;
}

/**
 * Where a flat roof's finish goes — gravel, planting, snow — as rectangles
 * covering everything at least `inset` in from the eave. Built from the field
 * rather than from the rooms, so the finish runs straight across the lines
 * where two rooms meet instead of stopping short of every wall.
 *
 * Runs along x are merged per row, and identical runs on consecutive rows are
 * merged again, so a plain block is one rectangle rather than hundreds.
 */
export function finishRects(f: RoofField, inset: number): RoofRect[] {
  const cx = f.nx - 1;
  const cz = f.nz - 1;
  const cellOk = (i: number, j: number) =>
    f.inside[j * cx + i] === 1 &&
    Math.min(vertexDist(f, i, j), vertexDist(f, i + 1, j), vertexDist(f, i, j + 1), vertexDist(f, i + 1, j + 1)) >=
      inset - 1e-6;

  const open = new Map<string, RoofRect>();
  const done: RoofRect[] = [];
  for (let j = 0; j < cz; j++) {
    const runs: [number, number][] = [];
    let start = -1;
    for (let i = 0; i <= cx; i++) {
      const ok = i < cx && cellOk(i, j);
      if (ok && start < 0) start = i;
      if (!ok && start >= 0) {
        runs.push([start, i]);
        start = -1;
      }
    }
    const next = new Map<string, RoofRect>();
    for (const [a, b] of runs) {
      const key = `${a}:${b}`;
      const prev = open.get(key);
      if (prev) {
        prev.d += ROOF_STEP;
        next.set(key, prev);
        open.delete(key);
      } else {
        next.set(key, { x: f.x0 + a * ROOF_STEP, z: f.z0 + j * ROOF_STEP, w: (b - a) * ROOF_STEP, d: ROOF_STEP });
      }
    }
    for (const r of open.values()) done.push(r);
    open.clear();
    for (const [k, r] of next) open.set(k, r);
  }
  for (const r of open.values()) done.push(r);
  return done;
}

/**
 * Spots for roof fittings — solar panels, vents, shrubs — on one lattice
 * fixed to the world, so a row of panels runs on across a wall line instead
 * of starting again in every room. A spot is kept only when the whole fitting
 * (half-extents `hw` by `hd`) stands at least `margin` in from the eave.
 * `checker` drops every other spot, for fittings that want breathing room.
 */
export function roofLattice(
  f: RoofField,
  pitchX: number,
  pitchZ: number,
  hw: number,
  hd: number,
  margin: number,
  checker = false,
): [number, number][] {
  const out: [number, number][] = [];
  const xEnd = f.x0 + (f.nx - 1) * ROOF_STEP;
  const zEnd = f.z0 + (f.nz - 1) * ROOF_STEP;
  const i0 = Math.ceil(f.x0 / pitchX);
  const j0 = Math.ceil(f.z0 / pitchZ);
  for (let j = j0; j * pitchZ <= zEnd; j++) {
    for (let i = i0; i * pitchX <= xEnd; i++) {
      if (checker && (((i + j) % 2) + 2) % 2 === 1) continue;
      const x = i * pitchX + pitchX / 2;
      const z = j * pitchZ + pitchZ / 2;
      if (fitsOnRoof(f, x, z, hw, hd, margin)) out.push([Number(x.toFixed(3)), Number(z.toFixed(3))]);
    }
  }
  return out;
}
