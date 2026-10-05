// Rectangles on an image, as fractions of its width and height (0–1).
//
// The comic quiz's panels and a word's crop are both stored this way, so they
// hold at any display size: the Builder draws them on a 600 px preview and the
// player lays them over whatever size the page has on a phone.
import type { Box } from "../../services/storyServices";

export type { Box };

/** Below this (a fraction of the image) a drag is a click, not a box. */
export const MIN_BOX = 0.02;

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

/** The box spanned by two corner points, clipped to the image. */
export function boxFromPoints(ax: number, ay: number, bx: number, by: number): Box {
  const left = clamp01(Math.min(ax, bx));
  const top = clamp01(Math.min(ay, by));
  const right = clamp01(Math.max(ax, bx));
  const bottom = clamp01(Math.max(ay, by));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

export const isUsableBox = (b: Box) => b.w >= MIN_BOX && b.h >= MIN_BOX;

/** Slides a box by (dx, dy), stopping at the image's edges rather than shrinking. */
export function moveBox(b: Box, dx: number, dy: number): Box {
  return {
    ...b,
    x: Math.min(Math.max(b.x + dx, 0), 1 - b.w),
    y: Math.min(Math.max(b.y + dy, 0), 1 - b.h),
  };
}

export type Corner = "nw" | "ne" | "sw" | "se";

/** Drags one corner of a box to (px, py); the opposite corner stays put. */
export function resizeBox(b: Box, corner: Corner, px: number, py: number): Box {
  const fixedX = corner === "nw" || corner === "sw" ? b.x + b.w : b.x;
  const fixedY = corner === "nw" || corner === "ne" ? b.y + b.h : b.y;
  return boxFromPoints(fixedX, fixedY, px, py);
}

export const contains = (b: Box, x: number, y: number) =>
  x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

/**
 * The box under a point, or null. Where boxes overlap — comic gutters are
 * often slanted, so straight boxes drawn over them do — the smallest one wins:
 * it is the one the point is most specifically inside.
 */
export function boxAt(boxes: readonly Box[], x: number, y: number): number | null {
  let best: number | null = null;
  boxes.forEach((b, i) => {
    if (!contains(b, x, y)) return;
    if (best === null || b.w * b.h < boxes[best].w * boxes[best].h) best = i;
  });
  return best;
}

/**
 * Indices of `boxes` in reading order: rows top to bottom, left to right
 * within a row. Two boxes share a row when their vertical centres are closer
 * than half the shorter one's height.
 */
export function readingOrder(boxes: readonly Box[]): number[] {
  const centre = (b: Box) => b.y + b.h / 2;
  const byTop = boxes.map((_, i) => i).sort((a, b) => centre(boxes[a]) - centre(boxes[b]));
  const rows: number[][] = [];
  for (const i of byTop) {
    const row = rows[rows.length - 1];
    const anchor = row ? boxes[row[0]] : null;
    if (anchor && Math.abs(centre(boxes[i]) - centre(anchor)) < Math.min(anchor.h, boxes[i].h) / 2) {
      row.push(i);
    } else {
      rows.push([i]);
    }
  }
  return rows.flatMap((row) => row.sort((a, b) => boxes[a].x - boxes[b].x));
}

/** An even rows × cols grid over the whole image, in reading order. */
export function gridBoxes(rows: number, cols: number): Box[] {
  const out: Box[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ x: c / cols, y: r / rows, w: 1 / cols, h: 1 / rows });
    }
  }
  return out;
}

/** A crop's width / height in pixels, given the image's natural size. */
export const cropAspect = (b: Box, naturalWidth: number, naturalHeight: number) =>
  (b.w * naturalWidth) / (b.h * naturalHeight);

/**
 * The largest size with the given aspect (width / height) that fits a space.
 * How the comic quiz lays a page out so its panel boxes land on the picture.
 */
export function fitInside(spaceW: number, spaceH: number, aspect: number): { w: number; h: number } {
  if (spaceW <= 0 || spaceH <= 0 || !(aspect > 0)) return { w: 0, h: 0 };
  return spaceW / spaceH > aspect
    ? { w: spaceH * aspect, h: spaceH }
    : { w: spaceW, h: spaceW / aspect };
}
