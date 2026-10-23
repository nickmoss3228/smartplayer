import { useEffect, useRef } from "react";
import type WaveSurfer from "wavesurfer.js";
import {
  CONFLICT_WINDOW_MS,
  SETTLE_MS,
  clockCorrection,
  copyKeyFor,
  copyTimeFor,
  needsTapToUnlock,
  type SlowCopies,
} from "./slowCopies";

interface UseSlowCopiesOptions {
  wavesurfer: React.MutableRefObject<WaveSurfer | null>;
  isInitialized: boolean;
  /** The part's pre-made slowed copies, by speed. Empty or absent: none. */
  copies: SlowCopies | null | undefined;
  volume: number;
  isMuted: boolean;
  /** The speed the player is at or about to switch to; used to start loading early. */
  playbackRate: number;
}

interface Copy {
  el: HTMLAudioElement;
  /** Has had playable data once. readyState alone lies: every seek drops it. */
  ready: boolean;
  /** The next play/pause event is ours, not the lock screen's or a headset's. */
  ourPlay: boolean;
  ourPause: boolean;
  unlocked: boolean;
  stall?: ReturnType<typeof setTimeout>;
}

const setPreservesPitch = (el: HTMLMediaElement, on: boolean) => {
  const media = el as HTMLMediaElement & { mozPreservesPitch?: boolean; webkitPreservesPitch?: boolean };
  media.preservesPitch = on;
  media.mozPreservesPitch = on;
  media.webkitPreservesPitch = on;
};

/**
 * Plays the part's pre-made slowed copies whenever the player slows down,
 * instead of letting the browser stretch the audio. The copies are made on the
 * server with Praat's PSOLA (audio-worker/), which a blind test preferred to
 * every in-browser stretcher; the browser's own stretching sounds echoey.
 *
 * WaveSurfer stays the clock. The waveform, the cursor, the markers, the
 * segment engine and the preview limit all keep reading its time and calling
 * its play/pause/setTime, unchanged. While a copy plays, WaveSurfer plays on
 * muted at the same speed, and a hidden <audio> plays the copy at normal speed
 * from originalTime / speed (a copy is exactly duration / speed long). This
 * hook only listens to WaveSurfer's media element and mirrors what it does.
 *
 * Whenever a copy cannot play (none for this speed, not loaded yet, refused,
 * stalled), that stretch of playback falls back to the browser's stretching,
 * so it never sounds worse than before.
 */
export function useSlowCopies({
  wavesurfer,
  isInitialized,
  copies,
  volume,
  isMuted,
  playbackRate,
}: UseSlowCopiesOptions) {
  const copiesRef = useRef<Map<string, Copy>>(new Map());
  const outputRef = useRef({ volume, isMuted });
  const prepareRef = useRef<(rate: number) => void>(() => {});
  // A stable dependency: the parent builds a new object on every render.
  const copiesKey = copies && Object.keys(copies).length > 0 ? JSON.stringify(copies) : "";

  useEffect(() => {
    outputRef.current = { volume, isMuted };
    for (const copy of copiesRef.current.values()) copy.el.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // The segment engine sets the store's speed about a second before it gives
  // it to WaveSurfer: time enough to start loading a copy not loaded yet.
  useEffect(() => {
    prepareRef.current(playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    const ws = wavesurfer.current;
    if (!isInitialized || !ws || !copiesKey) return;
    const media = ws.getMediaElement();
    const urls = JSON.parse(copiesKey) as SlowCopies;

    const all = new Map<string, Copy>();
    for (const [key, url] of Object.entries(urls)) {
      if (!url) continue;
      const el = new Audio();
      // The default lesson plays every sentence at 0.8x first, so that copy is
      // needed at once; the others load when their speed comes up.
      el.preload = key === "0.8" ? "auto" : "none";
      el.src = url;
      el.volume = outputRef.current.isMuted ? 0 : outputRef.current.volume;
      all.set(key, { el, ready: false, ourPlay: false, ourPause: false, unlocked: false });
    }
    copiesRef.current = all;

    let active: Copy | null = null;
    let activeRate = 1;
    let engagedAt = 0;
    let ourSeek = false;
    // Set when the browser stopped the clock as soon as a copy started: it will
    // not play two sounds at once. This part then uses its own stretching.
    let refused = false;

    const find = (rate: number) => {
      const key = copyKeyFor(rate, urls);
      return key ? all.get(key) ?? null : null;
    };

    const prepare = (rate: number) => {
      const copy = find(rate);
      if (copy && copy.el.preload !== "auto") {
        copy.el.preload = "auto";
        copy.el.load();
      }
    };
    prepareRef.current = prepare;

    const stop = (copy: Copy) => {
      if (copy.el.paused) return;
      copy.ourPause = true;
      copy.el.pause();
    };

    const fallBack = () => {
      if (active) {
        stop(active);
        active = null;
      }
      media.muted = false;
      setPreservesPitch(media, true);
    };

    // On play, and on a speed change while playing. Starting fires both
    // `ratechange` and `play`, so a second call must change nothing.
    const engage = () => {
      const rate = media.playbackRate;
      const copy = refused ? null : find(rate);
      if (!copy) {
        fallBack();
        return;
      }
      if (active === copy && activeRate === rate && !copy.el.paused) return;
      if (!copy.ready && copy.el.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        prepare(rate);
        fallBack();
        return;
      }
      if (active && active !== copy) stop(active);
      active = copy;
      activeRate = rate;
      media.muted = true;
      // Nothing to stretch while it is silent; a plain speed change is cheaper.
      setPreservesPitch(media, false);
      copy.el.currentTime = copyTimeFor(media.currentTime, rate);
      engagedAt = performance.now();
      if (copy.el.paused) {
        copy.ourPlay = true;
        copy.el.play().catch(() => {
          copy.ourPlay = false;
          if (active === copy) fallBack();
        });
      }
    };

    const onPlay = () => engage();
    const onRateChange = () => {
      if (media.paused) prepare(media.playbackRate);
      else engage();
    };
    const onPause = () => {
      if (!active) return;
      if (!active.el.paused && performance.now() - engagedAt < CONFLICT_WINDOW_MS) {
        refused = true;
        console.warn("[slow copies] the browser stopped the player when the slowed copy started; this part uses the browser's own stretching");
      }
      stop(active);
    };
    const onEnded = () => {
      if (active) stop(active);
    };
    const onSeeking = () => {
      if (ourSeek) {
        ourSeek = false;
        return;
      }
      if (active) {
        active.el.currentTime = copyTimeFor(media.currentTime, activeRate);
        engagedAt = performance.now();
      }
    };
    // The copy is what is heard, so the silent clock follows it.
    const onTimeUpdate = () => {
      if (!active || media.paused || active.el.paused || active.el.seeking || media.seeking) return;
      if (performance.now() - engagedAt < SETTLE_MS) return;
      const to = clockCorrection(active.el.currentTime, activeRate, media.currentTime);
      if (to === null) return;
      ourSeek = true;
      media.currentTime = to;
      engagedAt = performance.now();
    };

    const mediaListeners: [string, () => void][] = [
      ["play", onPlay],
      ["ratechange", onRateChange],
      ["pause", onPause],
      ["ended", onEnded],
      ["seeking", onSeeking],
      ["timeupdate", onTimeUpdate],
    ];
    for (const [type, fn] of mediaListeners) media.addEventListener(type, fn);

    const copyListeners: [HTMLAudioElement, string, () => void][] = [];
    for (const copy of all.values()) {
      const on = (type: string, fn: () => void) => {
        copy.el.addEventListener(type, fn);
        copyListeners.push([copy.el, type, fn]);
      };
      on("canplay", () => {
        copy.ready = true;
        // Still playing this speed on the browser's stretching because the copy
        // was not loaded in time: switch over now, rather than at the next pass.
        if (!refused && !media.paused && active !== copy && find(media.playbackRate) === copy) engage();
      });
      // The lock screen and headset buttons control the audible element.
      on("pause", () => {
        if (copy.ourPause) {
          copy.ourPause = false;
          return;
        }
        if (copy === active && !media.paused) ws.pause();
      });
      on("play", () => {
        if (copy.ourPlay) {
          copy.ourPlay = false;
          return;
        }
        if (media.paused && copy === active) void ws.play();
      });
      on("waiting", () => {
        if (copy !== active) return;
        clearTimeout(copy.stall);
        copy.stall = setTimeout(() => {
          if (copy === active && !media.paused && copy.el.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) fallBack();
        }, 500);
      });
      on("playing", () => clearTimeout(copy.stall));
    }

    // Safari: start each copy once inside a real tap, or it may not play later
    // from the segment engine's timers. It also starts their download, which
    // Safari otherwise postpones.
    const unlock = () => {
      for (const copy of all.values()) {
        if (copy.unlocked || copy === active) continue;
        copy.unlocked = true;
        copy.el.muted = true;
        copy.ourPlay = true;
        copy.el
          .play()
          .then(() => {
            if (copy !== active) stop(copy);
            copy.el.muted = false;
          })
          .catch(() => {
            copy.el.muted = false;
            copy.ourPlay = false;
            copy.unlocked = false;
          });
      }
    };
    const unlockEvents = needsTapToUnlock(navigator.userAgent, navigator.maxTouchPoints, navigator.platform)
      ? ["click", "touchend", "keydown"]
      : [];
    for (const type of unlockEvents) document.addEventListener(type, unlock, { capture: true });

    return () => {
      for (const type of unlockEvents) document.removeEventListener(type, unlock, { capture: true });
      for (const [type, fn] of mediaListeners) media.removeEventListener(type, fn);
      for (const [el, type, fn] of copyListeners) el.removeEventListener(type, fn);
      for (const copy of all.values()) {
        clearTimeout(copy.stall);
        copy.el.pause();
        copy.el.removeAttribute("src");
        copy.el.load();
      }
      media.muted = false;
      setPreservesPitch(media, true);
      copiesRef.current = new Map();
      prepareRef.current = () => {};
    };
  }, [isInitialized, wavesurfer, copiesKey]);
}
