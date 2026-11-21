import { describe, expect, it } from 'vitest';
import { comicPanel, gutterMask, type FocusRect, type Pixels } from './comicFocus';

/**
 * A synthetic page: noisy grey "art" split into panels by gutter lines at
 * the given x and y positions, drawn white-between-black or solid black.
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
  const line = (at: (d: number, t: number) => [number, number], len: number) => {
    for (let t = 0; t < len; t++) {
      if (kind === 'white') {
        paint(...at(-1, t), 10);
        paint(...at(0, t), 245);
        paint(...at(1, t), 10);
      } else for (let d = -1; d <= 1; d++) paint(...at(d, t), 5);
    }
  };
  for (const gx of gutters.x ?? []) line((d, t) => [gx + d, t], h);
  for (const gy of gutters.y ?? []) line((d, t) => [t, gy + d], w);
  return { data, width: w, height: h };
}

/** True when no gutter line runs through the inside of the rectangle. */
function avoids(rect: FocusRect, px: Pixels, g: { x?: number[]; y?: number[] }) {
  const x0 = rect.x * px.width;
  const x1 = (rect.x + rect.w) * px.width;
  const y0 = rect.y * px.height;
  const y1 = (rect.y + rect.h) * px.height;
  const inside = (v: number, a: number, b: number) => v > a + 1 && v < b - 1;
  return !(g.x ?? []).some((gx) => inside(gx, x0, x1)) && !(g.y ?? []).some((gy) => inside(gy, y0, y1));
}

describe('comicPanel', () => {
  // Two columns; rows of different heights. The top-left panel is 255×200.
  const gutters = { x: [256], y: [200, 420, 600] };

  it.each(['white', 'black'] as const)('finds %s gutters', (kind) => {
    const mask = gutterMask(page(512, 768, gutters, kind));
    let hits = 0;
    for (let y = 0; y < 768; y++) if (mask[y * 512 + 256]) hits++;
    expect(hits).toBeGreaterThan(700);
  });

  it.each(['white', 'black'] as const)('returns one whole panel (%s gutters)', (kind) => {
    const px = page(512, 768, gutters, kind);
    const rect = comicPanel(px)!;
    expect(rect).not.toBeNull();
    expect(avoids(rect, px, gutters)).toBe(true);
    // A whole panel, not a slice: it reaches close to the gutters around it.
    expect(rect.w * 512).toBeGreaterThan(240);
    expect(rect.h * 768).toBeGreaterThan(160);
  });

  it('leaves a page with no gutters to the ordinary crop', () => {
    expect(comicPanel(page(512, 768, {}, 'white'))).toBeNull();
  });
});
