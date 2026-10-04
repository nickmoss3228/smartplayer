// ─── Zoom/pan math for ComicsModal (pure — no DOM, no React) ─────────────────

export const MIN_SCALE = 1;
export const MAX_SCALE = 5;

/** Scale, plus the image centre's offset (px) from the viewport centre. */
export interface View {
  s: number;
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/**
 * Zoom to `s` keeping the point (px, py) — pixels from the viewport centre —
 * fixed under the pointer. Zooming out to within 1% of MIN_SCALE snaps to it,
 * so a pinch can't strand the view at 100.4% with the "zoomed" controls up;
 * zooming in is never snapped, or a slow pinch could not leave 100% at all.
 */
export const zoomAt = (v: View, s: number, px: number, py: number): View => {
  if (s < v.s && s < MIN_SCALE * 1.01) s = MIN_SCALE;
  s = clamp(s, MIN_SCALE, MAX_SCALE);
  const k = s / v.s;
  return { s, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
};

/**
 * Limits the pan so the scaled image never uncovers background on an axis
 * where it overflows the viewport, and keeps it centred on an axis where it
 * fits. `image` is the untransformed (scale 1) layout size.
 */
export const clampView = (v: View, viewport: Size, image: Size): View => {
  const bx = Math.max(0, (image.w * v.s - viewport.w) / 2);
  const by = Math.max(0, (image.h * v.s - viewport.h) / 2);
  return { s: v.s, x: clamp(v.x, -bx, bx), y: clamp(v.y, -by, by) };
};

/**
 * Scale multiplier for one wheel event, proportional to how far it scrolled.
 * A mouse notch (~100 px) zooms ~16%, while a trackpad's stream of 2–5 px
 * events zooms smoothly instead of jumping a fixed step per event. Trackpad
 * pinches arrive as ctrl+wheel with deltaY ≈ −100·ln(scale), so their 0.01
 * gain follows the fingers 1:1.
 */
export const wheelFactor = (
  deltaY: number,
  deltaMode: number,
  ctrlKey: boolean,
): number => {
  // deltaMode 1 = lines (Firefox mouse wheels), 2 = pages
  const px =
    deltaMode === 1 ? deltaY * 40 : deltaMode === 2 ? deltaY * 800 : deltaY;
  return Math.exp(-clamp(px, -100, 100) * (ctrlKey ? 0.01 : 0.0015));
};
