import { describe, it, expect } from "vitest";
import {
  MIN_SCALE,
  MAX_SCALE,
  clampView,
  wheelFactor,
  zoomAt,
} from "./zoomMath";

describe("zoomAt", () => {
  it("keeps the image point under the pivot fixed", () => {
    const v = { s: 2, x: 30, y: -10 };
    const px = 120;
    const py = 45;
    // Point on the unscaled image that currently sits under the pivot
    const ux = (px - v.x) / v.s;
    const uy = (py - v.y) / v.s;

    const next = zoomAt(v, 3.5, px, py);
    expect(next.x + next.s * ux).toBeCloseTo(px);
    expect(next.y + next.s * uy).toBeCloseTo(py);
  });

  it("clamps the scale to [MIN_SCALE, MAX_SCALE]", () => {
    expect(zoomAt({ s: 4, x: 0, y: 0 }, 99, 0, 0).s).toBe(MAX_SCALE);
    expect(zoomAt({ s: 2, x: 0, y: 0 }, 0.2, 0, 0).s).toBe(MIN_SCALE);
  });

  it("snaps to 100% when zooming out close to it", () => {
    expect(zoomAt({ s: 1.3, x: 0, y: 0 }, 1.005, 0, 0).s).toBe(MIN_SCALE);
  });

  it("lets a tiny zoom-in step leave 100%", () => {
    expect(zoomAt({ s: 1, x: 0, y: 0 }, 1.005, 0, 0).s).toBeCloseTo(1.005);
  });
});

describe("clampView", () => {
  const viewport = { w: 1000, h: 800 };
  const image = { w: 600, h: 800 }; // portrait page filling the height

  it("keeps an axis that still fits centred", () => {
    // 600 × 1.5 = 900 wide, inside the 1000 px viewport
    expect(clampView({ s: 1.5, x: 200, y: 0 }, viewport, image).x).toBe(0);
  });

  it("limits the pan to the overflow on an axis that does not fit", () => {
    // At 2×: 1200 wide → 100 px spare per side; 1600 tall → 400
    expect(clampView({ s: 2, x: 500, y: -900 }, viewport, image)).toEqual({
      s: 2,
      x: 100,
      y: -400,
    });
  });

  it("leaves an in-bounds pan alone", () => {
    expect(clampView({ s: 2, x: -60, y: 250 }, viewport, image)).toEqual({
      s: 2,
      x: -60,
      y: 250,
    });
  });
});

describe("wheelFactor", () => {
  it("zooms in on scroll up and out on scroll down", () => {
    expect(wheelFactor(-100, 0, false)).toBeGreaterThan(1);
    expect(wheelFactor(100, 0, false)).toBeLessThan(1);
  });

  it("scales with the delta, so small trackpad events zoom gently", () => {
    expect(wheelFactor(-4, 0, false)).toBeLessThan(1.01);
    expect(wheelFactor(-100, 0, false)).toBeGreaterThan(1.1);
  });

  it("caps a single huge event", () => {
    expect(wheelFactor(-5000, 0, false)).toBeCloseTo(wheelFactor(-100, 0, false));
  });

  it("converts line deltas to pixels", () => {
    expect(wheelFactor(-1, 1, false)).toBeCloseTo(wheelFactor(-40, 0, false));
  });

  it("follows a ctrl+wheel trackpad pinch 1:1", () => {
    expect(wheelFactor(-100 * Math.log(1.2), 0, true)).toBeCloseTo(1.2);
  });
});
