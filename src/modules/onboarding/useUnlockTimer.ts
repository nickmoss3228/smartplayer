import { useEffect, useState } from 'react';

const TICK_MS = 250;
/**
 * The most one tick may add. A background tab's interval is throttled to
 * once a minute or so, and the first tick after the tab comes back would
 * otherwise credit that whole minute as watched.
 */
const MAX_STEP_MS = TICK_MS * 2;

/**
 * Counts how long something has been on screen and unlocks after `ms`.
 *
 * Only VISIBLE time counts: a tab in the background does not run the slide's
 * animation, so it must not run the slide's lock either — otherwise switching
 * away and back is a skip button.
 *
 * The count belongs to `resetKey` (the slide): a new key starts from zero on
 * its very first render, so moving on never shows the next slide unlocked for
 * a frame. `ms <= 0` or `alreadyUnlocked` starts unlocked.
 */
export const useUnlockTimer = (
  ms: number,
  resetKey: string | number,
  alreadyUnlocked = false,
): { unlocked: boolean; progress: number } => {
  const [count, setCount] = useState<{ key: string | number; elapsed: number }>({
    key: resetKey,
    elapsed: 0,
  });
  const elapsed = count.key === resetKey ? count.elapsed : 0;
  const done = alreadyUnlocked || ms <= 0 || elapsed >= ms;

  useEffect(() => {
    if (done) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const step = Math.min(now - last, MAX_STEP_MS);
      last = now;
      if (typeof document !== 'undefined' && document.hidden) return;
      setCount((c) => ({
        key: resetKey,
        elapsed: (c.key === resetKey ? c.elapsed : 0) + step,
      }));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [done, resetKey]);

  return { unlocked: done, progress: done ? 1 : Math.min(1, elapsed / ms) };
};
