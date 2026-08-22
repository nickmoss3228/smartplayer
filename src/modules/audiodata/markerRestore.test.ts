import { describe, it, expect } from "vitest";
// allowJs (tsconfig.test.json) infers this plain backend JS module directly.
import { restoreMarkersIntoParts } from "../../../backend/src/models/PartMarkers.js";

/**
 * Guards the rule that decides whether hours of marker placement survive a
 * delete-and-reimport, which is the single most destructive operation in the
 * Story Builder (importStory 409s while a doc exists, so deleting is the only
 * way to re-import a story after its content changes).
 *
 * The rule is deliberately asymmetric — fill a gap, never overwrite — so no
 * ordering of events can replace real markers with staler ones. These tests
 * pin that asymmetry down, since a "tidy" refactor to a plain merge would
 * silently reintroduce the data loss.
 *
 * Testing the pure function rather than the endpoint is the point: it needs no
 * database, so it runs in CI where Mongo isn't reachable.
 */
const marker = (time: number) => ({ time, label: String(time), color: "red" });

describe("restoreMarkersIntoParts", () => {
  it("fills a part that arrives with no markers", () => {
    const { parts, restoredCount } = restoreMarkersIntoParts(
      [{ partNumber: 1, timeMarkers: [] }],
      { 1: [marker(5)] },
    );
    expect(parts[0].timeMarkers).toEqual([marker(5)]);
    expect(restoredCount).toBe(1);
  });

  it("fills a part whose timeMarkers key is missing entirely", () => {
    const { parts, restoredCount } = restoreMarkersIntoParts([{ partNumber: 2 }], {
      2: [marker(9)],
    });
    expect(parts[0].timeMarkers).toEqual([marker(9)]);
    expect(restoredCount).toBe(1);
  });

  // The safety property. The caller's markers come from the static repo files,
  // which are the deliberate, reviewed copy; a remembered row must never win.
  it("never overwrites markers the caller already supplied", () => {
    const incoming = [{ partNumber: 1, timeMarkers: [marker(1)] }];
    const { parts, restoredCount } = restoreMarkersIntoParts(incoming, { 1: [marker(99)] });
    expect(parts[0].timeMarkers).toEqual([marker(1)]);
    expect(restoredCount).toBe(0);
  });

  it("leaves a part alone when nothing was remembered for it", () => {
    const { parts, restoredCount } = restoreMarkersIntoParts([{ partNumber: 3, timeMarkers: [] }], {
      1: [marker(4)],
    });
    expect(parts[0].timeMarkers).toEqual([]);
    expect(restoredCount).toBe(0);
  });

  // An empty remembered row records a deliberate "I cleared these". Treating it
  // as a restore would resurrect markers the user had just deleted.
  it("does not treat an empty remembered row as something to restore", () => {
    const { parts, restoredCount } = restoreMarkersIntoParts([{ partNumber: 1, timeMarkers: [] }], {
      1: [],
    });
    expect(parts[0].timeMarkers).toEqual([]);
    expect(restoredCount).toBe(0);
  });

  it("restores only the empty parts of a mixed story, and counts parts not markers", () => {
    const { parts, restoredCount } = restoreMarkersIntoParts(
      [
        { partNumber: 1, timeMarkers: [marker(1)] },
        { partNumber: 2, timeMarkers: [] },
        { partNumber: 3, timeMarkers: [] },
      ],
      { 2: [marker(7), marker(8)], 3: [marker(11)] },
    );
    expect(parts.map((p) => p.timeMarkers?.length ?? 0)).toEqual([1, 2, 1]);
    expect(restoredCount).toBe(2);
  });

  it("does not mutate the parts it was given", () => {
    const incoming = [{ partNumber: 1, timeMarkers: [] }];
    restoreMarkersIntoParts(incoming, { 1: [marker(5)] });
    expect(incoming[0].timeMarkers).toEqual([]);
  });

  it("survives an empty story and an empty memory", () => {
    expect(restoreMarkersIntoParts([], {}).parts).toEqual([]);
    expect(restoreMarkersIntoParts(undefined, undefined).restoredCount).toBe(0);
  });
});
