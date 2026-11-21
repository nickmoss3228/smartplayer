/**
 * Finds one whole panel on a comic page to show in a phone part tile.
 *
 * A phone part tile is a short landscape box, so the whole page cannot show:
 * an ordinary centre crop lands on the white gutters between panels, which
 * run under the title caption and make the tile hard to read. Zooming into a
 * slice of one panel avoids them but loses the scene (2026-10-25: every tile
 * became a close-up of the same face). So this finds a complete panel, and
 * the tile shows all of it.
 *
 * Gutters are found as thin bright lines (brighter than the pixels a few px
 * either side) that run long and straight, which art rarely does. On these
 * pages a gutter is ~4px of white between two ~3px black panel edges at
 * 1024px wide; the page is analysed at ANALYSIS_WIDTH, where that line is
 * still 2px. Any smaller and the downscale skips it in places.
 */

/** A rectangle on the page, as fractions of its width and height. */
export interface FocusRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The pixels read here — an ImageData, or anything shaped like one. */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Width/height of the phone 2×5 tile: panels near this shape are preferred. */
export const TILE_ASPECT = 1.4;

/** Draw the page this wide before handing its pixels to comicPanel. */
export const ANALYSIS_WIDTH = 512;

// All px below are at ANALYSIS_WIDTH.
// A light gutter is lighter than both its sides, looking SIDES px away: grey-
// white between black panel edges (big contrast), or near-white between two
// light panels with no edge drawn (small contrast).
const EDGED = { bright: 120, contrast: 45 };
const BARE = { bright: 215, contrast: 18 };
// A black gutter (how the Daniel pages separate panels) often sits between
// dark panels, so it is not darker than its sides — it is found instead as a
// near-black run long and straight enough to be a panel edge.
const BLACK = { dark: 24, run: 110 };
const SIDES = [1, 2, 3, 4]; // for lines from a hairline to 3px wide
const MIN_RUN = 40; // how long a line must run to count as a gutter
const MIN_VARIANCE = 400; // grey variance below this is a flat patch, not a picture
const SEED = 0.08; // seed rectangle side, as a fraction of the page width
const GROW = 2; // px a side moves per growth step
// A page opens on its character; a big panel lower down is as often a
// seascape or a wall. This much of a panel's height on the page counts
// against it.
const TOP_BIAS = 0.75;
// Panel shape counts as fit^SHAPE_WEIGHT (fit = 1 when it matches the tile):
// enough to pass over a long strip, not so much that a big panel loses to a
// small one of the right shape.
const SHAPE_WEIGHT = 0.75;
// Growth stops at the white middle of a gutter, so the panel's own black
// outline is still inside the rectangle; this much more is trimmed off.
const INSET = 5;

/** Summed-area table, (w+1)×(h+1), for O(1) window sums. */
function integral(values: Float64Array, w: number, h: number): Float64Array {
  const s = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += values[y * w + x];
      s[(y + 1) * (w + 1) + x + 1] = s[y * (w + 1) + x + 1] + row;
    }
  }
  return s;
}

function sum(s: Float64Array, w: number, x0: number, y0: number, x1: number, y1: number): number {
  const W = w + 1;
  return s[y1 * W + x1] - s[y0 * W + x1] - s[y1 * W + x0] + s[y0 * W + x0];
}

/**
 * Marks gutter pixels: thin light lines kept only where they run at least
 * MIN_RUN px (a line that slants a pixel every few rows still counts — the
 * run is measured with one pixel of sideways slack), and long black runs.
 */
export function gutterMask(px: Pixels): Uint8Array {
  const { data, width: w, height: h } = px;
  const g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  // 1 = part of a vertical-ish line, 2 = horizontal-ish, 3 = both
  const thin = new Uint8Array(w * h);
  const far = SIDES[SIDES.length - 1];
  for (let y = far; y < h - far; y++) {
    for (let x = far; x < w - far; x++) {
      const i = y * w + x;
      const v = g[i];
      if (v >= EDGED.bright) {
        const contrast = v >= BARE.bright ? BARE.contrast : EDGED.contrast;
        for (const d of SIDES) {
          if (v - g[i - d] > contrast && v - g[i + d] > contrast) thin[i] |= 1;
          if (v - g[i - d * w] > contrast && v - g[i + d * w] > contrast) thin[i] |= 2;
        }
      }
    }
  }

  const mask = new Uint8Array(w * h);
  // Vertical runs: walk down each column, letting the line drift ±1 px.
  for (let x = 0; x < w; x++) {
    let start = -1;
    let cx = x;
    for (let y = 0; y <= h; y++) {
      let hit = -1;
      if (y < h) {
        for (const dx of [0, -1, 1]) {
          const xx = cx + dx;
          if (xx >= 0 && xx < w && thin[y * w + xx] & 1) { hit = xx; break; }
        }
      }
      if (hit >= 0) {
        if (start < 0) start = y;
        cx = hit;
      } else {
        if (start >= 0 && y - start >= MIN_RUN) {
          // Re-walk the run to mark it (the drift path is cheap to repeat).
          let mx = x;
          for (let yy = start; yy < y; yy++) {
            for (const dx of [0, -1, 1]) {
              const xx = mx + dx;
              if (xx >= 0 && xx < w && thin[yy * w + xx] & 1) { mx = xx; break; }
            }
            mask[yy * w + mx] = 1;
          }
        }
        start = -1;
        cx = x;
      }
    }
  }
  // Horizontal runs, the same way across each row.
  for (let y = 0; y < h; y++) {
    let start = -1;
    let cy = y;
    for (let x = 0; x <= w; x++) {
      let hit = -1;
      if (x < w) {
        for (const dy of [0, -1, 1]) {
          const yy = cy + dy;
          if (yy >= 0 && yy < h && thin[yy * w + x] & 2) { hit = yy; break; }
        }
      }
      if (hit >= 0) {
        if (start < 0) start = x;
        cy = hit;
      } else {
        if (start >= 0 && x - start >= MIN_RUN) {
          let my = y;
          for (let xx = start; xx < x; xx++) {
            for (const dy of [0, -1, 1]) {
              const yy = my + dy;
              if (yy >= 0 && yy < h && thin[yy * w + xx] & 2) { my = yy; break; }
            }
            mask[my * w + xx] = 1;
          }
        }
        start = -1;
        cy = y;
      }
    }
  }
  // Black runs, straight along rows and columns.
  for (let y = 0; y < h; y++) {
    let start = -1;
    for (let x = 0; x <= w; x++) {
      if (x < w && g[y * w + x] <= BLACK.dark) {
        if (start < 0) start = x;
      } else {
        if (start >= 0 && x - start >= BLACK.run) mask.fill(1, y * w + start, y * w + x);
        start = -1;
      }
    }
  }
  for (let x = 0; x < w; x++) {
    let start = -1;
    for (let y = 0; y <= h; y++) {
      if (y < h && g[y * w + x] <= BLACK.dark) {
        if (start < 0) start = y;
      } else {
        if (start >= 0 && y - start >= BLACK.run) {
          for (let yy = start; yy < y; yy++) mask[yy * w + x] = 1;
        }
        start = -1;
      }
    }
  }
  return mask;
}

/**
 * The biggest whole panel on the page, as a rectangle just inside its
 * gutters, or null when no panel is found (a photo with no gutters at all
 * also returns null — the caller's ordinary crop already suits it).
 *
 * Grows a small seed rectangle at many points of the page until every side
 * meets a gutter, and keeps the result with the best score: its area, times
 * how close its shape is to the tile's (a long strip would be letterboxed
 * into a sliver), times a preference for panels higher on the page.
 */
export function comicPanel(px: Pixels, tileAspect = TILE_ASPECT): FocusRect | null {
  const { width: w, height: h, data } = px;
  const mask = gutterMask(px);
  let gutterPixels = 0;
  for (const m of mask) gutterPixels += m;
  if (gutterPixels < w) return null; // no panel grid to speak of

  const lines = integral(Float64Array.from(mask), w, h);
  const gray = new Float64Array(w * h);
  const gray2 = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const v = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    gray[i] = v;
    gray2[i] = v * v;
  }
  const g1 = integral(gray, w, h);
  const g2 = integral(gray2, w, h);
  const clean = (x0: number, y0: number, x1: number, y1: number) =>
    x0 >= 0 && y0 >= 0 && x1 <= w && y1 <= h && sum(lines, w, x0, y0, x1, y1) === 0;

  const seed = Math.round(w * SEED);
  let best: { x0: number; y0: number; x1: number; y1: number; score: number } | null = null;
  for (let sy = 0; sy + seed <= h; sy += seed) {
    for (let sx = 0; sx + seed <= w; sx += seed) {
      let x0 = sx, y0 = sy, x1 = sx + seed, y1 = sy + seed;
      if (!clean(x0, y0, x1, y1)) continue;
      // Grow each side in turn until none can move.
      for (let moved = true; moved; ) {
        moved = false;
        if (clean(x0 - GROW, y0, x1, y1)) { x0 -= GROW; moved = true; }
        if (clean(x0, y0, x1 + GROW, y1)) { x1 += GROW; moved = true; }
        if (clean(x0, y0 - GROW, x1, y1)) { y0 -= GROW; moved = true; }
        if (clean(x0, y0, x1, y1 + GROW)) { y1 += GROW; moved = true; }
      }
      const pw = x1 - x0, ph = y1 - y0;
      const n = pw * ph;
      const mean = sum(g1, w, x0, y0, x1, y1) / n;
      if (sum(g2, w, x0, y0, x1, y1) / n - mean * mean < MIN_VARIANCE) continue;
      const aspect = pw / ph;
      const fit = Math.min(aspect / tileAspect, tileAspect / aspect);
      const score = (n / (w * h)) * fit ** SHAPE_WEIGHT * (1 - TOP_BIAS * ((y0 + y1) / 2 / h));
      if (!best || score > best.score) best = { x0, y0, x1, y1, score };
    }
  }
  if (!best) return null;
  const x0 = Math.min(best.x0 + INSET, best.x1);
  const y0 = Math.min(best.y0 + INSET, best.y1);
  const x1 = Math.max(best.x1 - INSET, x0);
  const y1 = Math.max(best.y1 - INSET, y0);
  return { x: x0 / w, y: y0 / h, w: (x1 - x0) / w, h: (y1 - y0) / h };
}
