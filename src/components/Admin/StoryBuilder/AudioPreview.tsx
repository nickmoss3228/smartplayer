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

// The pass/fail verdict comes from a media element, not from fetch():
// `loadedmetadata` means the browser actually decoded the container and knows
// the duration, where a 200 only means some bytes came back. But a media
// element is uselessly vague about *why* it failed — every cause collapses
// into one MediaError, so a typo in an audioKey and a file with a broken ACL
// look identical.
//
// So on failure we ask the bucket directly. Yandex sends
// `access-control-allow-origin: *` on error responses as well as successful
// ones, and answers with an S3 XML body naming the real cause, which turns
// "won't load" into "404 NoSuchKey" or "403 AccessDenied".
type Status = "empty" | "loading" | "ready" | "error";

interface Failure {
  /** Compact enough for the inline button, e.g. "404". */
  short: string;
  /** Full explanation for the tooltip and the console. */
  detail: string;
}

// Range: bytes=0-0 so a healthy file costs one byte instead of the whole clip.
// S3 ignores Range on an error and returns the full XML body regardless, which
// is exactly the case we need the body for.
async function diagnose(url: string): Promise<Failure> {
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
  } catch (err) {
    return {
      short: "network",
      detail:
        "The request failed outright — no response at all. Usually the bucket " +
        `being unreachable, or the request being blocked: ${
          err instanceof Error ? err.message : String(err)
        }`,
    };
  }

  if (res.ok || res.status === 206) {
    return {
      short: "no decode",
      detail:
        `The file downloads fine (HTTP ${res.status}) but the browser cannot decode it. ` +
        "The object is probably not really an mp3, or it is truncated.",
    };
  }

  const code = /<Code>([^<]+)<\/Code>/.exec(await res.text().catch(() => ""))?.[1] ?? "";
  const hint =
    res.status === 404
      ? " Nothing is stored at this key. Check the audioKey's spelling and case against the object in the bucket — the path is built from it verbatim."
      : res.status === 403
      ? " The object is there but not readable. Check that it was uploaded public-read."
      : "";
  return {
    short: String(res.status),
    detail: `HTTP ${res.status}${code ? ` — ${code}` : ""}.${hint}`,
  };
}

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
  const [failure, setFailure] = useState<Failure | null>(null);
  // Bumped by the retry click to re-run the probe effect. A freshly uploaded
  // object can 404 for a moment, and re-mounting the whole editor to recheck
  // one row would be a silly thing to ask of the admin.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPlaying(false);
    setDuration(null);
    setFailure(null);

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
    const onError = () => {
      if (cancelled) return;
      setStatus("error");
      // Also logged, not just shown in the tooltip: with a long word list the
      // console is the only place you can see every failure at once, and its
      // URLs are clickable straight into the Network tab.
      diagnose(url).then((f) => {
        if (cancelled) return;
        setFailure(f);
        console.error(`[AudioPreview] "${label ?? url}" did not load — ${f.detail}\n  ${url}`);
      });
    };
    const onPlay = () => setPlaying(true);
    const onStop = () => setPlaying(false);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("error", onError);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onStop);
    audio.addEventListener("ended", onStop);

    return () => {
      cancelled = true;
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onStop);
      audio.removeEventListener("ended", onStop);
      if (nowPlaying === audio) nowPlaying = null;
      audio.pause();
      audioRef.current = null;
    };
  }, [url, attempt, label]);

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
        title={[
          label ? `"${label}"` : null,
          url,
          "",
          failure?.detail ?? "Working out why…",
          "",
          "Click to retry. The same message is in the browser console.",
        ]
          .filter((line) => line !== null)
          .join("\n")}
        className="text-xs text-red-600 hover:text-red-700 underline whitespace-nowrap"
      >
        ✗ {failure?.short ?? "…"}
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
