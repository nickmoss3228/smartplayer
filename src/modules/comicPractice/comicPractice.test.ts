import { describe, expect, it } from "vitest";
import {
  boxAt,
  boxFromPoints,
  cropAspect,
  fitInside,
  gridBoxes,
  moveBox,
  readingOrder,
  resizeBox,
} from "./boxes";
import {
  assignmentsFromClips,
  buildRound,
  clipsFromAssignments,
  questionsFromClips,
  segmentsFromMarkers,
} from "./panelQuizRounds";
import { matchPictureFiles, pictureKey } from "./pictureFiles";

describe("boxes", () => {
  it("spans two points in any order and clips to the image", () => {
    expect(boxFromPoints(0.6, 0.8, 0.2, 0.1)).toEqual({
      x: 0.2,
      y: 0.1,
      w: expect.closeTo(0.4),
      h: expect.closeTo(0.7),
    });
    expect(boxFromPoints(-0.5, 0.5, 2, 0.5)).toEqual({ x: 0, y: 0.5, w: 1, h: 0 });
  });

  it("moves without leaving the image or shrinking", () => {
    const b = { x: 0.7, y: 0.1, w: 0.2, h: 0.2 };
    expect(moveBox(b, 0.5, -0.5)).toEqual({ x: 0.8, y: 0, w: 0.2, h: 0.2 });
  });

  it("resizes from the dragged corner, the opposite one fixed", () => {
    const b = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
    const r = resizeBox(b, "nw", 0.1, 0.3);
    expect(r.x).toBeCloseTo(0.1);
    expect(r.y).toBeCloseTo(0.3);
    expect(r.x + r.w).toBeCloseTo(0.6);
    expect(r.y + r.h).toBeCloseTo(0.6);
    // Dragged past the fixed corner, it flips rather than going negative.
    const flipped = resizeBox(b, "se", 0.1, 0.1);
    expect(flipped).toEqual({ x: 0.1, y: 0.1, w: expect.closeTo(0.1), h: expect.closeTo(0.1) });
  });

  it("finds the box under a point, the smaller one where two overlap", () => {
    const boxes = [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0.4, y: 0, w: 0.3, h: 0.5 },
    ];
    expect(boxAt(boxes, 0.1, 0.1)).toBe(0);
    expect(boxAt(boxes, 0.5, 0.1)).toBe(1);
    expect(boxAt(boxes, 0.5, 0.9)).toBeNull();
  });

  it("orders panels as a comic reads: rows down, left to right", () => {
    const boxes = [
      { x: 0.5, y: 0.52, w: 0.5, h: 0.45 }, // bottom right
      { x: 0, y: 0, w: 0.48, h: 0.5 }, // top left
      { x: 0, y: 0.5, w: 0.48, h: 0.5 }, // bottom left
      { x: 0.5, y: 0.02, w: 0.5, h: 0.46 }, // top right, a little lower
    ];
    expect(readingOrder(boxes)).toEqual([1, 3, 2, 0]);
  });

  it("splits into an even grid in reading order", () => {
    const grid = gridBoxes(2, 3);
    expect(grid).toHaveLength(6);
    expect(grid[4]).toEqual({ x: 1 / 3, y: 0.5, w: 1 / 3, h: 0.5 });
  });

  it("measures a crop in pixels and fits an aspect into a space", () => {
    expect(cropAspect({ x: 0, y: 0, w: 0.5, h: 0.25 }, 1000, 1500)).toBeCloseTo(500 / 375);
    expect(fitInside(400, 300, 2 / 3)).toEqual({ w: 200, h: 300 });
    expect(fitInside(400, 900, 2 / 3)).toEqual({ w: 400, h: 600 });
    expect(fitInside(0, 300, 1)).toEqual({ w: 0, h: 0 });
  });
});

describe("panel quiz rounds", () => {
  it("makes one line per marker, the last running to the end of the audio", () => {
    expect(segmentsFromMarkers([2.5, 0.1, 4.5], 9)).toEqual([
      { start: 0.1, end: 2.5 },
      { start: 2.5, end: 4.5 },
      { start: 4.5, end: 9 },
    ]);
    // No duration yet: the last line is left out, not guessed.
    expect(segmentsFromMarkers([0, 2], null)).toEqual([{ start: 0, end: 2 }]);
  });

  it("reads saved clips back onto the markers and counts the ones that no longer fit", () => {
    const segments = segmentsFromMarkers([0, 2, 4], 6);
    const { assignments, orphans } = assignmentsFromClips(segments, [
      { start: 2.01, end: 4, panel: 3 },
      { start: 7, end: 8, panel: 1 },
    ]);
    expect(assignments).toEqual([null, 3, null]);
    expect(orphans).toBe(1);
    expect(clipsFromAssignments(segments, [0, null, 2])).toEqual([
      { start: 0, end: 2, panel: 0 },
      { start: 4, end: 6, panel: 2 },
    ]);
  });

  it("rounds saved times to the millisecond, as the server stores them", () => {
    const segments = segmentsFromMarkers([16.947399010823013, 20.8], 23.8000004);
    expect(clipsFromAssignments(segments, [1, 2])).toEqual([
      { start: 16.947, end: 20.8, panel: 1 },
      { start: 20.8, end: 23.8, panel: 2 },
    ]);
  });

  it("plays each clip at most once, at most `max`, without repeating a panel back to back", () => {
    const clips = [0, 0, 0, 1, 1, 2, 2, 2, 3, 3].map((panel, i) => ({ start: i, end: i + 1, panel }));
    for (let seed = 0; seed < 50; seed++) {
      let s = seed + 1;
      const random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
      const round = buildRound(clips, 8, random);
      expect(round).toHaveLength(8);
      expect(new Set(round).size).toBe(8);
      for (let i = 1; i < round.length; i++) {
        expect(clips[round[i]].panel).not.toBe(clips[round[i - 1]].panel);
      }
    }
  });

  it("asks lines next to each other on the same panel as one question", () => {
    expect(
      questionsFromClips([
        { start: 4, end: 6, panel: 1 },
        { start: 0, end: 2, panel: 0 },
        { start: 2, end: 4, panel: 1 },
        { start: 9, end: 11, panel: 1 }, // same panel, but not next to it
      ]),
    ).toEqual([
      { start: 0, end: 2, panel: 0 },
      { start: 2, end: 6, panel: 1 },
      { start: 9, end: 11, panel: 1 },
    ]);
  });

  it("repeats a panel only when nothing else is left", () => {
    const clips = [0, 0, 0].map((panel, i) => ({ start: i, end: i + 1, panel }));
    expect(buildRound(clips, 8).sort()).toEqual([0, 1, 2]);
  });
});

describe("picture files", () => {
  it("reduces names and keys to the same comparable form", () => {
    expect(pictureKey("Local_Shop.PNG")).toBe("local shop");
    expect(pictureKey("a-lot--of friends.webp")).toBe("a lot of friends");
  });

  it("pairs files with words by name and reports the rest", () => {
    const files = [{ name: "flat.png" }, { name: "Local-Shop.jpg" }, { name: "cat.png" }, { name: "flat.webp" }];
    const { matched, unmatched } = matchPictureFiles(files, ["flat", "local shop", "kind"]);
    expect([...matched.keys()]).toEqual(["flat", "local shop"]);
    expect(matched.get("flat")?.name).toBe("flat.png");
    expect(unmatched.map((f) => f.name)).toEqual(["cat.png", "flat.webp"]);
  });
});
