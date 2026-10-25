/**
 * Finds a clean spot to zoom into on a comic page.
 *
 * A phone part tile is a short landscape box, so the whole page cannot show:
 * an ordinary centre crop lands on the white gutters between panels, which
 * cut through faces and run under the title caption. This looks for the
 * largest landscape window that no gutter crosses, so the tile can be zoomed
 * onto a single panel.
 *
 * Gutters are found as thin bright lines (brighter than the pixels a few px
 * either side) that run long and straight, which art rarely does. On these
 * pages a gutter is ~4px of white between two ~3px black panel edges at
 * 1024px wide; the page is analysed at ANALYSIS_WIDTH, where that line is
 * still 2px. Any smaller and the downscale skips it in places.
 */

/** A window on the page, as fractions of its width and height. */
export interface FocusRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The pixels comicFocus reads — an ImageData, or anything shaped like one. */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Width/height of the window looked for: the phone 2×5 tile shape. */
export const FOCUS_ASPECT = 1.4;

/** Draw the page this wide before handing its pixels to comicFocus. */
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
const MARGIN = 4; // a gutter this close to the window edge is cropped away anyway
const STEP = 6; // window scan step
const MIN_VARIANCE = 400; // grey variance below this is a flat patch, not a picture
const TOP_BIAS = 0.3; // how much a window's height on the page counts against it
// Widest window first, so the zoom is as gentle as the page allows.
const WIDTHS = [1, 0.9, 0.8, 0.7, 0.62, 0.55, 0.48, 0.42, 0.36, 0.3, 0.26, 0.22];

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
 * A FOCUS_ASPECT window no gutter crosses, or null when even the smallest
 * cannot avoid one (the caller keeps its ordinary crop).
 *
 * Bigger windows win, since they zoom less, but a window higher on the page
 * may beat a slightly bigger one lower down: a page opens on its character,
 * and a large clean panel further down is as often a seascape or a wall.
 * The winner is then centred across its panel and set in its upper part,
 * where the faces are.
 */
export function comicFocus(px: Pixels): FocusRect | null {
  const { width: w, height: h, data } = px;
  const lines = integral(Float64Array.from(gutterMask(px)), w, h);

  const gray = new Float64Array(w * h);
  const gray2 = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const v = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    gray[i] = v;
    gray2[i] = v * v;
  }
  const g1 = integral(gray, w, h);
  const g2 = integral(gray2, w, h);

  const clean = (x: number, y: number, ww: number, wh: number) =>
    x >= 0 && y >= 0 && x + ww <= w && y + wh <= h &&
    sum(lines, w, x + MARGIN, y + MARGIN, x + ww - MARGIN, y + wh - MARGIN) === 0;
  // A flat patch (night sky, a blank caption box) is clean but shows nothing.
  const busy = (x: number, y: number, ww: number, wh: number) => {
    const n = ww * wh;
    const mean = sum(g1, w, x, y, x + ww, y + wh) / n;
    return sum(g2, w, x, y, x + ww, y + wh) / n - mean * mean >= MIN_VARIANCE;
  };

  let best: { x: number; y: number; ww: number; wh: number; score: number } | null = null;
  for (const frac of WIDTHS) {
    let ww = Math.round(w * frac);
    let wh = Math.round(ww / FOCUS_ASPECT);
    if (wh > h) {
      wh = h;
      ww = Math.round(h * FOCUS_ASPECT);
    }
    for (let y = 0; y + wh <= h; y += STEP) {
      const score = ww / w - TOP_BIAS * (y + wh / 2) / h;
      if (best && score <= best.score) continue; // every later x scores the same
      for (let x = 0; x + ww <= w; x += STEP) {
        if (clean(x, y, ww, wh) && busy(x, y, ww, wh)) {
          best = { x, y, ww, wh, score };
          break;
        }
      }
    }
  }
  if (!best) return null;

  // Centre across the panel, then sit in its upper third.
  const { ww, wh } = best;
  let { x, y } = best;
  let left = x;
  let right = x;
  while (clean(left - STEP, y, ww, wh)) left -= STEP;
  while (clean(right + STEP, y, ww, wh)) right += STEP;
  const cx = left + Math.round((right - left) / 2 / STEP) * STEP;
  if (clean(cx, y, ww, wh)) x = cx;
  let top = y;
  let bottom = y;
  while (clean(x, top - STEP, ww, wh)) top -= STEP;
  while (clean(x, bottom + STEP, ww, wh)) bottom += STEP;
  const cy = top + Math.round(((bottom - top) * 0.3) / STEP) * STEP;
  if (clean(x, cy, ww, wh)) y = cy;

  return { x: x / w, y: y / h, w: ww / w, h: wh / h };
}
