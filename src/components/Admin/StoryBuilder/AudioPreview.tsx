import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Inline "does this clip actually work?" control for the Story Builder.
 *
 * Used for every vocab/phrasal word and every quiz fast/slow recording. It
 * answers two different questions at once:
 *
 *   - did the file really load?  (status, resolved on its own at mount)
 *   - what does it sound like?   (click to play)
 *
 * The status half matters because a saved `audioUrl` proves only that an
 * upload once returned a URL — not that the object is still there, still
 * public, or decodable. A draft imported from the static files is exactly
 * that case: its URLs are *derived* from Vocabulary.ts's folder convention
 * without anything ever checking that the mp3 exists at the other end.
 */

// Probing deliberately uses a media element rather than fetch()/HEAD.
// Two reasons:
//   1. The bucket serves audio without CORS headers. Audio elements don't
//      need them (they're not subject to the same-origin read rules unless
//      you set crossOrigin), but a fetch probe would fail on files that play
//      perfectly — a false alarm on every single row.
//   2. `loadedmetadata` is the stronger signal anyway: it means the browser
//      decoded the container and knows the duration, not merely that some
//      URL answered 200.
type Status = "empty" | "loading" | "ready" | "error";

// Only one preview plays at a time. Dozens of these render at once (every
// word in a part, both speeds of every question), and without a single
// owner, clicking down a list just stacks overlapping playback.
// Each instance also listens to its own element's `pause` event, so whoever
// gets stopped here updates its own button without needing a callback registry.
let nowPlaying: HTMLAudioElement | null = null;

const stopCurrent = () => {
  if (!nowPlaying) return;
  nowPlaying.pause();
  nowPlaying.currentTime = 0;
  nowPlaying = null;
};

const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds)) return "--:--";
  // Most clips here are a single word — "a tournament" is 0.9s. Flooring that
  // to "0:00" makes a perfectly good file look like an empty one, which is
  // precisely the confusion this control exists to remove, so anything under
  // a minute is shown in seconds with a decimal instead.
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
};

interface AudioPreviewProps {
  /** May be empty/undefined — nothing uploaded for this slot yet. */
  url?: string | null;
  /** Identifies the clip in the failure tooltip, e.g. "flat" or "Q3 fast". */
  label?: string;
}

const AudioPreview = ({ url, label }: AudioPreviewProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<Status>("empty");
  const [duration, setDuration] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  // Bumped by the retry click to re-run the probe effect. A freshly uploaded
  // object can 404 for a moment, and re-mounting the whole editor to recheck
  // one row would be a silly thing to ask of the admin.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setDuration(null);

    if (!url) {
      setStatus("empty");
      audioRef.current = null;
      return;
    }

    setStatus("loading");
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = url;
    audioRef.current = audio;

    const onLoaded = () => {
      setStatus("ready");
      setDuration(audio.duration);
    };
    const onError = () => setStatus("error");
    const onPlay = () => setPlaying(true);
    const onStop = () => setPlaying(false);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("error", onError);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onStop);
    audio.addEventListener("ended", onStop);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onStop);
      audio.removeEventListener("ended", onStop);
      if (nowPlaying === audio) nowPlaying = null;
      audio.pause();
      audioRef.current = null;
    };
  }, [url, attempt]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || status !== "ready") return;

    if (playing) {
      stopCurrent();
      return;
    }
    stopCurrent();
    nowPlaying = audio;
    audio.currentTime = 0;
    audio.play().catch(() => setStatus("error"));
  }, [playing, status]);

  if (status === "empty") {
    return <span className="text-xs text-gray-400 whitespace-nowrap">no audio</span>;
  }

  if (status === "loading") {
    return <span className="text-xs text-gray-400 whitespace-nowrap">checking…</span>;
  }

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={() => setAttempt((n) => n + 1)}
        title={`${label ? `"${label}": ` : ""}${url}\n\nThis file did not load. Click to retry.`}
        className="text-xs text-red-600 hover:text-red-700 underline whitespace-nowrap"
      >
        ✗ won't load
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={`${label ? `"${label}": ` : ""}${url}`}
      className="text-xs text-green-700 hover:text-green-800 whitespace-nowrap tabular-nums"
    >
      {playing ? "■" : "▶"} {duration === null ? "" : formatDuration(duration)}
    </button>
  );
};

export default AudioPreview;
