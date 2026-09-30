import { describe, expect, it } from "vitest";
import { WINDOW, WINDOW_PITCH, onWindowGrid, windowSpots } from "./windowLayout";

describe("where the windows go", () => {
  it("puts them on one grid, whatever the wall starts at", () => {
    // Two walls starting at different places still share their columns.
    const a = windowSpots(0, 12);
    const b = windowSpots(1.7, 13.4);
    for (const at of [...a, ...b]) expect(onWindowGrid(at), `${at}`).toBe(true);
    expect(a.filter((x) => b.includes(x)).length).toBeGreaterThan(1);
  });

  it("spaces them evenly along a wall", () => {
    const spots = windowSpots(0, 20);
    for (let i = 1; i < spots.length; i++) expect(spots[i] - spots[i - 1]).toBeCloseTo(WINDOW_PITCH);
  });

  it("keeps every window, rail and all, off the ends of its wall", () => {
    // The rail is the widest part of a window indoors: the frame plus 0.27m.
    const rail = WINDOW.width / 2 + 0.27;
    for (const [from, to] of [[0, 12], [1.7, 13.4], [3.1, 7.9], [10, 14.2]] as const) {
      for (const at of windowSpots(from, to)) {
        expect(at - rail).toBeGreaterThanOrEqual(from - 1e-9);
        expect(at + rail).toBeLessThanOrEqual(to + 1e-9);
      }
    }
  });

  it("leaves a gap where something is in the way, without shuffling the rest", () => {
    const free = windowSpots(0, 20);
    const blocked = windowSpots(0, 20, [[5, 8]]);
    expect(blocked.length).toBeLessThan(free.length);
    for (const at of blocked) {
      expect(free).toContain(at);
      // Frame clear of the booked span.
      expect(at + WINDOW.width / 2 <= 5 + 1e-9 || at - WINDOW.width / 2 >= 8 - 1e-9).toBe(true);
    }
  });

  it("still gives a short wall the grid misses one window, in its middle", () => {
    // 2.4m of wall that no grid column lands in with room to spare.
    const spots = windowSpots(4.0, 6.4);
    expect(spots).toEqual([5.2]);
  });

  it("gives a wall too short for a window none", () => {
    expect(windowSpots(0, 1.5)).toEqual([]);
  });
});
