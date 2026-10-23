// Pure rules for useSlowCopies, kept apart so they can be tested without audio.

/** Speed ("0.65", "0.8") -> URL of the part's pre-made slowed copy of that speed. */
export type SlowCopies = Record<string, string>;

/** How far the slowed copy and the silent WaveSurfer clock may drift before the clock is moved. */
export const DRIFT_LIMIT_SECONDS = 0.15;

/** Drift is not judged right after a start or a seek, while both elements settle. */
export const SETTLE_MS = 400;

/**
 * If the clock stops this soon after a copy starts, the browser would not let
 * the two play together (a one-sound-at-a-time policy), and the part falls
 * back to the browser's own stretching.
 */
export const CONFLICT_WINDOW_MS = 300;

/** The key of the copy made for `rate`, or null when the part has none for it. */
export function copyKeyFor(rate: number, copies: SlowCopies | null | undefined): string | null {
  if (!copies) return null;
  for (const [key, url] of Object.entries(copies)) {
    if (url && Math.abs(Number(key) - rate) < 0.001) return key;
  }
  return null;
}

/** Where the copy is for a time on the original: a copy is exactly duration / rate long. */
export const copyTimeFor = (originalTime: number, rate: number): number => originalTime / rate;

/**
 * The time to move the silent clock to so that it matches what is heard, or
 * null while the two are close enough. The copy wins: moving the silent clock
 * makes no sound, moving the copy would.
 */
export function clockCorrection(
  copyTime: number,
  rate: number,
  clockTime: number,
  limit: number = DRIFT_LIMIT_SECONDS,
): number | null {
  const heard = copyTime * rate;
  return Math.abs(heard - clockTime) > limit ? heard : null;
}

/**
 * Safari (every iOS browser is Safari underneath) lets a media element play
 * from a timer only once it has been started inside a tap. Chrome and Firefox
 * allow it for the whole page after the first tap.
 */
export function needsTapToUnlock(userAgent: string, maxTouchPoints = 0, platform = ""): boolean {
  const iOS = /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
  const safari = /safari/i.test(userAgent) && !/chrome|chromium|crios|fxios|android|edg/i.test(userAgent);
  return iOS || safari;
}
