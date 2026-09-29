// modules/school/renderScale.ts
//
// How many real pixels the school is drawn with, as a fraction of the screen's
// CSS pixels. The scene is rendered small and scaled up nearest-neighbour —
// that IS the pixel art (SchoolCanvas.tsx) — so this one number decides how
// chunky it looks.
//
// A single fixed scale looked right on a desktop and wrong on a phone. At 0.38
// a 1080-pixel-tall monitor still gets 410 rows to draw a school with; a phone
// held upright is 390 CSS pixels across and got 148 columns, which left a
// student about nine pixels tall. So the scale rises as the screen shrinks:
// unchanged from a small laptop up, close to one art pixel per CSS pixel on a
// phone. Still upscaled with nearest-neighbour, still pixel art — just pixels
// a phone can afford to show.

import { useEffect, useState } from "react";

/** The desktop look: chunky pixels. */
export const DESKTOP_SCALE = 0.38;
/** A phone's short side gets close to one art pixel per CSS pixel. */
export const PHONE_SCALE = 1;

/** Short sides (CSS px) at or below which a screen is drawn at PHONE_SCALE… */
const PHONE_SIDE = 360;
/** …and at or above which at DESKTOP_SCALE. Below a small laptop's 768. */
const DESKTOP_SIDE = 640;

/**
 * The render scale for a viewport. Keyed on the SHORT side, which is the one
 * that does not change when a phone's address bar slides away or the phone is
 * turned — so neither re-renders the canvas at a new size mid-pan.
 *
 * Never above the device's own pixel ratio: drawing more pixels than the
 * screen has buys nothing.
 */
export function renderScale(width: number, height: number, deviceRatio = 1): number {
  const short = Math.min(width, height);
  const t = Math.min(1, Math.max(0, (short - PHONE_SIDE) / (DESKTOP_SIDE - PHONE_SIDE)));
  const scale = PHONE_SCALE + (DESKTOP_SCALE - PHONE_SCALE) * t;
  // Two decimals: a canvas resized for a change nobody could see is a
  // reallocated drawing buffer for nothing.
  return Math.round(Math.min(scale, Math.max(DESKTOP_SCALE, deviceRatio)) * 100) / 100;
}

const current = () =>
  typeof window === "undefined"
    ? DESKTOP_SCALE
    : renderScale(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);

/** The scale for this window, following it when it is resized. */
export function useRenderScale(): number {
  const [scale, setScale] = useState(current);
  useEffect(() => {
    const update = () => setScale(current());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return scale;
}
