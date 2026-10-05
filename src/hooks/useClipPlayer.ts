import { useCallback, useEffect, useRef, useState } from "react";

/**
 * idle    — nothing playing (also where a blocked autoplay lands: tap to play)
 * loading — waiting for the audio's metadata before it can seek
 * playing — the stretch is sounding
 * played  — it reached its end
 * error   — the audio would not load or play
 */
export type ClipState = "idle" | "loading" | "playing" | "played" | "error";

/**
 * Plays stretches of one audio file: seek to `start`, stop at `end`.
 *
 * One <audio> element for the whole session, on purpose. iOS lets a page play
 * sound only from a tap — but an element that has played once from a tap may
 * be played again from code. Reusing it is what lets the next line start by
 * itself after an answer instead of asking for another tap every round.
 *
 * The end is watched per frame rather than with `timeupdate`, which fires only
 * about four times a second and would let a quarter-second of the next line
 * through — enough to hear which panel comes next.
 */
export function useClipPlayer(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef(0);
  const endRef = useRef(0);
  const pendingRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<ClipState>("idle");
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const el = new Audio();
    el.preload = "auto";
    el.src = src;
    audioRef.current = el;
    setState("idle");
    setDuration(null);

    const onMeta = () => setDuration(Number.isFinite(el.duration) ? el.duration : null);
    const onError = () => setState("error");
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("error", onError);
    return () => {
      cancelAnimationFrame(frameRef.current);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("error", onError);
      if (pendingRef.current) el.removeEventListener("loadedmetadata", pendingRef.current);
      el.pause();
      // Abort the download too; an orphaned element keeps fetching otherwise.
      el.removeAttribute("src");
      el.load();
      audioRef.current = null;
    };
  }, [src]);

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    audioRef.current?.pause();
    setState((s) => (s === "playing" || s === "loading" ? "idle" : s));
  }, []);

  const play = useCallback((start: number, end: number, rate = 1) => {
    const el = audioRef.current;
    if (!el) return;
    cancelAnimationFrame(frameRef.current);
    if (pendingRef.current) el.removeEventListener("loadedmetadata", pendingRef.current);
    endRef.current = end;
    setState("loading");

    const watch = () => {
      if (el.currentTime >= endRef.current || el.ended) {
        el.pause();
        setState("played");
        return;
      }
      frameRef.current = requestAnimationFrame(watch);
    };
    const go = () => {
      pendingRef.current = null;
      el.playbackRate = rate;
      el.currentTime = start;
      el.play()
        .then(() => {
          setState("playing");
          frameRef.current = requestAnimationFrame(watch);
        })
        // NotAllowedError is a blocked autoplay, not a broken file: back to
        // idle, where the play button asks for the tap the browser wants.
        .catch((err: unknown) =>
          setState(err instanceof DOMException && err.name === "NotAllowedError" ? "idle" : "error"),
        );
    };

    if (el.readyState >= HTMLMediaElement.HAVE_METADATA) go();
    else {
      pendingRef.current = go;
      el.addEventListener("loadedmetadata", go, { once: true });
    }
  }, []);

  return { state, duration, play, stop };
}
