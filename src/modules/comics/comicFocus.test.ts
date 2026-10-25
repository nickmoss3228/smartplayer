import { describe, expect, it } from 'vitest';
import { comicFocus, gutterMask, type Pixels } from './comicFocus';

/**
 * A synthetic page: grey "art" with texture, split into panels by gutters.
 * `gutter` draws one column/row of gutter at the given position.
 */
function page(
  w: number,
  h: number,
  gutters: { x?: number[]; y?: number[] },
  kind: 'white' | 'black',
): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  let seed = 12345;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Seeded noise: busy enough to pass the flat-patch check, never near
      // white or black, and with no straight structure to mistake for a line
      // (a regular pattern makes long ridges, which ARE lines).
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const v = 60 + (seed % 120);
      const i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  const paint = (x: number, y: number, v: number) => {
    const i = (y * w + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = v;
  };
  for (const gx of gutters.x ?? []) {
    for (let y = 0; y < h; y++) {
      if (kind === 'white') {
        paint(gx - 1, y, 10);
        paint(gx, y, 245);
        paint(gx + 1, y, 10);
      } else for (let d = -1; d <= 1; d++) paint(gx + d, y, 5);
    }
  }
  for (const gy of gutters.y ?? []) {
    for (let x = 0; x < w; x++) {
      if (kind === 'white') {
        paint(x, gy - 1, 10);
        paint(x, gy, 245);
        paint(x, gy + 1, 10);
      } else for (let d = -1; d <= 1; d++) paint(x, gy + d, 5);
    }
  }
  return { data, width: w, height: h };
}

/** True when no gutter line falls strictly inside the window. */
function avoids(rect: { x: number; y: number; w: number; h: number }, px: Pixels, g: { x?: number[]; y?: number[] }) {
  const x0 = rect.x * px.width;
  const x1 = (rect.x + rect.w) * px.width;
  const y0 = rect.y * px.height;
  const y1 = (rect.y + rect.h) * px.height;
  const inside = (v: number, a: number, b: number) => v > a + 4 && v < b - 4;
  return !(g.x ?? []).some((gx) => inside(gx, x0, x1)) && !(g.y ?? []).some((gy) => inside(gy, y0, y1));
}

describe('comicFocus', () => {
  const gutters = { x: [256], y: [200, 420, 600] };

  it.each(['white', 'black'] as const)('finds %s gutters', (kind) => {
    const px = page(512, 768, gutters, kind);
    const mask = gutterMask(px);
    // A full-height column of the mask lights up along the vertical gutter.
    let hits = 0;
    for (let y = 0; y < 768; y++) if (mask[y * 512 + 256]) hits++;
    expect(hits).toBeGreaterThan(700);
  });

  it.each(['white', 'black'] as const)('picks a window inside one panel (%s gutters)', (kind) => {
    const px = page(512, 768, gutters, kind);
    const rect = comicFocus(px);
    expect(rect).not.toBeNull();
    expect(avoids(rect!, px, gutters)).toBe(true);
  });

  it('zooms as little as the page allows when there are no gutters', () => {
    const px = page(512, 768, {}, 'white');
    expect(comicFocus(px)?.w).toBe(1);
  });
});
