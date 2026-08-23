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
// MediaError codes, per the HTML spec.
//
// Treated as a HINT, not a verdict. Chromium reports a load that never got
// started as SRC_NOT_SUPPORTED (4) rather than NETWORK (2), so code 4 alone
// cannot tell "this is not really an mp3" from "the connection died". Reading
// it as the former produced a confidently wrong message — a perfectly good
// clip was reported as corrupt on a flaky link.
const MEDIA_ERR = { ABORTED: 1, NETWORK: 2, DECODE: 3, SRC_NOT_SUPPORTED: 4 } as const;

/**
 * Works out why a clip would not play, by doing what the player does: fetch the
 * WHOLE object and try to decode it.
 *
 * An earlier version probed with `Range: bytes=0-0`. That is cheap, but it only
 * proves the object is reachable — a one-byte request can succeed on a link
 * that cannot sustain a full download, which is exactly the case that produced
 * a false "the file is not really an mp3". Decoding the real bytes is the only
 * answer that distinguishes a damaged file from a bad connection, and this runs
 * only after a failure, so the extra download is not on the happy path.
 */
async function diagnose(url: string, mediaErrorCode?: number): Promise<Failure> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    return {
      short: "network",
      detail:
        "The file could not be downloaded at all, so nothing can be said about the file " +
        "itself — this is the connection to the bucket, which drops intermittently. " +
        `Click to retry. (${err instanceof Error ? err.message : String(err)})`,
    };
  }

  if (!res.ok && res.status !== 206) {
    const code = /<Code>([^<]+)<\/Code>/.exec(await res.text().catch(() => ""))?.[1] ?? "";
    const hint =
      res.status === 404
        ? " Nothing is stored at this key. Check the audioKey's spelling and case against the object in the bucket — the path is built from it verbatim."
        : res.status === 403
        ? " The object is there but not readable. Check that it was uploaded public-read."
        : "";
    return { short: String(res.status), detail: `HTTP ${res.status}${code ? ` — ${code}` : ""}.${hint}` };
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await res.arrayBuffer();
  } catch (err) {
    return {
      short: "network",
      detail:
        "The download started but did not finish, so the file itself is probably fine. " +
        `Click to retry. (${err instanceof Error ? err.message : String(err)})`,
    };
  }

  if (bytes.byteLength === 0) {
    return { short: "empty", detail: "The object exists but is zero bytes. Re-upload it." };
  }

  // Compare what arrived against what the server said it was sending, BEFORE
  // trying to decode. A cut-short transfer produces bytes that cannot be
  // decoded, which is indistinguishable from a damaged file if you only look
  // at the decode result — and blaming the file for a dropped connection is
  // the worst answer this control can give, because it sends you off to
  // re-upload something that was never wrong.
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > 0 && bytes.byteLength < declared) {
    return {
      short: "truncated",
      detail:
        `Only ${bytes.byteLength} of ${declared} bytes arrived, so the transfer was cut ` +
        `short. That says nothing about the file itself — the stored object is the full ` +
        `${declared} bytes. Click to retry.`,
    };
  }

  // decodeAudioData is the authority: it either turns these exact bytes into
  // audio or it does not.
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    return {
      short: "failed",
      detail: `Downloaded ${bytes.byteLength} bytes, but this browser cannot be asked to decode them.`,
    };
  }

  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(bytes.slice(0));
    return {
      short: "flaky",
      detail:
        `The file is fine — ${bytes.byteLength} bytes decoded to ${decoded.duration.toFixed(1)}s ` +
        `at ${decoded.sampleRate} Hz. The player failed to load it anyway, which means the ` +
        `connection dropped mid-request rather than anything being wrong with the audio. ` +
        `Click to retry.`,
    };
  } catch {
    return {
      short: "corrupt",
      detail:
        `All ${bytes.byteLength} bytes arrived` +
        (Number.isFinite(declared) && declared > 0 ? ` (the full ${declared} the server declared)` : "") +
        `, and they still could not be decoded as audio. This one really is damaged or is not ` +
        `an mp3 — re-upload it.` +
        (mediaErrorCode === MEDIA_ERR.DECODE ? " The player reported a decode error too." : ""),
    };
  } finally {
    void ctx.close();
  }
}

// Only one preview plays at a time. Dozens of these render at once (every
// word in a part, both speeds of every question), and without a single
// owner, clicking down a list just stacks overlapping playback.
// Each instance also listens to its own element's `pause` event, so whoever
// gets stopped here updates its own button without needing a callback registry.
// Probing is queued, not fired all at once.
//
// A single part can render 30+ of these — 10 quiz questions at two speeds each,
// plus every vocabulary and phrasal word — and each one used to request its
// metadata the moment it mounted. Browsers open only about six connections per
// host, so the rest queued in the network stack, and under any latency some
// were dropped. The element reports that as a load failure indistinguishable
// from a corrupt file, so perfectly good clips were labelled broken, seemingly
// at random, while the very same files played fine in the player — which only
// ever loads one at a time.
//
// Four at a time keeps every row's verdict trustworthy, which is the entire
// point of the control: a red row has to mean the file is wrong, not that it
// lost a race against its neighbours.
const MAX_CONCURRENT_PROBES = 4;
let activeProbes = 0;
const probeQueue: (() => void)[] = [];

function acquireProbeSlot(): Promise<void> {
  if (activeProbes < MAX_CONCURRENT_PROBES) {
    activeProbes++;
    return Promise.resolve();
  }
  return new Promise((resolve) => probeQueue.push(resolve));
}

function releaseProbeSlot() {
  const next = probeQueue.shift();
  if (next) next();
  else activeProbes--;
}

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
    audioRef.current = audio;

    // Released as soon as this clip has an answer, so the next queued row
    // starts immediately rather than waiting for the whole list.
    let slotReleased = false;
    const releaseSlot = () => {
      if (slotReleased) return;
      slotReleased = true;
      releaseProbeSlot();
    };

    const onLoaded = () => {
      releaseSlot();
      setStatus("ready");
      setDuration(audio.duration);
    };
    const onError = () => {
      releaseSlot();
      if (cancelled) return;
      setStatus("error");
      // Read the code BEFORE awaiting: the element can be reset or replaced
      // while the diagnostic request is in flight.
      const mediaErrorCode = audio.error?.code;
      // Also logged, not just shown in the tooltip: with a long word list the
      // console is the only place you can see every failure at once, and its
      // URLs are clickable straight into the Network tab.
      diagnose(url, mediaErrorCode).then((f) => {
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

    // Assigning src is what starts the request, so it happens only once a
    // slot is free. A row unmounted while still queued never requests at all.
    acquireProbeSlot().then(() => {
      if (cancelled) {
        releaseSlot();
        return;
      }
      audio.src = url;
    });

    return () => {
      cancelled = true;
      releaseSlot();
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
