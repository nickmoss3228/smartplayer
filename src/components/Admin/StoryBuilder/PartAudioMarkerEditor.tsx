import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Trans, useTranslation } from "react-i18next";
import {
  IoAdd,
  IoArrowUndoOutline,
  IoCloudUploadOutline,
  IoPause,
  IoPlay,
  IoPlaySkipBack,
  IoPlaySkipForward,
  IoSparklesOutline,
  IoTrashOutline,
  IoWarningOutline,
} from "react-icons/io5";
import {
  AdminStory,
  StoryPart,
  TimeMarker,
  uploadPartAsset,
  saveMarkers,
} from "../../../services/adminStoryServices";
import { computeSegmentBounds, findMarkerIndexAt } from "../../../lib/segmentBounds";
import {
  buildEnvelope,
  findOnsets,
  markerIssues,
  snapToOnset,
  suggestMarkers,
} from "./audioAnalysis";
import MarkerTrack from "./MarkerTrack";
import PartSlowCopies from "./PartSlowCopies";

interface PartAudioMarkerEditorProps {
  token: string;
  story: AdminStory;
  part: StoryPart;
  onPartUpdated: (part: StoryPart) => void;
  active?: boolean;
  layout?: "classic" | "desk";
}

/** How long after the last edit the markers save themselves. */
const AUTOSAVE_MS = 1200;
/** One tap of the nudge buttons, and of Shift+Arrow. */
const NUDGE_SECONDS = 0.05;
/** Two markers closer than this are the same marker; the second is refused. */
const MIN_MARKER_GAP = 0.12;

const ZOOM_LEVELS = [0, 60, 140, 300];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00.0";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}

/** Markers go to the server renumbered by time, so the labels never disagree
 *  with the order a student hears them in. */
const toMarkers = (times: readonly number[]): TimeMarker[] =>
  times.map((time, i) => ({ time, label: String(i + 1), color: "red" }));

const insertTime = (times: readonly number[], time: number): number[] =>
  [...times, time].sort((a, b) => a - b);

type SaveState = "saved" | "dirty" | "saving" | "error";

/**
 * Audio and sentence markers for one part.
 *
 * Markers are the whole product: everything the player does — replay this
 * sentence, slow it down, move to the next one — is a window between two of
 * them, so a part with audio and no markers is a file, not a lesson.
 *
 * The editor is built around that being a LISTENING job, not a clicking one.
 * You play the recording, tap a key each time a sentence starts, and every tap
 * snaps back to the boundary the ear was aiming at (audioAnalysis.ts), because
 * a person tapping along lands a quarter of a second late every time. Nothing
 * here needs to be got right first time: markers drag, nudge, and undo.
 */
const PartAudioMarkerEditor = ({ token, story, part, onPartUpdated, active = true, layout = "classic" }: PartAudioMarkerEditorProps) => {
  const { t } = useTranslation("studio");
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const rafRef = useRef<number | null>(null);

  // What is persisted, kept apart from what the wave is showing. During an
  // upload the wave plays a local blob so you can start work immediately, and
  // that blob URL must never reach the database — it means nothing anywhere
  // else, and it would read as "this part has audio" forever.
  const [remoteUrl, setRemoteUrl] = useState<string | null>(part.audioUrl ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(part.audioUrl ?? null);

  const [times, setTimes] = useState<number[]>(() =>
    [...part.timeMarkers].map((m) => m.time).sort((a, b) => a - b),
  );
  const [history, setHistory] = useState<number[][]>([]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(-1);
  const [zoom, setZoom] = useState(0);

  const [uploading, setUploading] = useState(false);
  // A recording uploaded in this editor gets its slow copies without a click.
  const [justUploaded, setJustUploaded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState("");

  // Speech onsets from the decoded audio, computed once per file. Empty until
  // the wave is ready, and empty forever if decoding is refused — every
  // feature that uses it degrades to placing markers exactly where you tapped.
  const [onsets, setOnsets] = useState<number[]>([]);
  const [snap, setSnap] = useState(true);

  const timesRef = useRef(times);
  const historyRef = useRef(history);
  const remoteUrlRef = useRef(remoteUrl);
  const stopAtRef = useRef<number | null>(null);
  useEffect(() => {
    timesRef.current = times;
    historyRef.current = history;
    remoteUrlRef.current = remoteUrl;
  }, [times, history, remoteUrl]);

  /**
   * The only way the marker list changes.
   *
   * It writes `timesRef` before the state update rather than reading `times`
   * from a state updater: StrictMode invokes updaters twice, so pushing onto
   * the undo stack from inside one would record every edit twice. Writing the
   * ref eagerly also makes two commits in the same tick safe.
   */
  const commit = useCallback((next: number[] | ((prev: number[]) => number[])) => {
    const prev = timesRef.current;
    const resolved = typeof next === "function" ? next(prev) : next;
    if (resolved.length === prev.length && resolved.every((t, i) => t === prev[i])) return;
    timesRef.current = resolved;
    setTimes(resolved);
    setHistory((h) => [...h.slice(-49), prev]);
    setSaveState("dirty");
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.length === 0) return;
    const restored = h[h.length - 1];
    timesRef.current = restored;
    setTimes(restored);
    setHistory(h.slice(0, -1));
    setSaveState("dirty");
    setSelected(-1);
  }, []);

  // ── the wave ──────────────────────────────────────────────────────────────

  const [wrapper, setWrapper] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || !previewUrl) {
      setWrapper(null);
      return;
    }

    const instance = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#cbd5e1",
      progressColor: "#94a3b8",
      cursorColor: "#0f172a",
      cursorWidth: 2,
      height: 128,
      normalize: true,
      fillParent: true,
    });
    wsRef.current = instance;
    setWrapper(instance.getWrapper());

    // One RAF loop drives the clock and the segment stop. `stopAtRef` is null
    // for ordinary listening — which is the mode you tap markers in, and which
    // the old editor made impossible by always halting at the next marker.
    const poll = () => {
      const now = instance.getCurrentTime();
      setCurrentTime(now);
      const stopAt = stopAtRef.current;
      if (stopAt !== null && now >= stopAt - 0.03) {
        instance.pause();
        instance.setTime(stopAt);
        stopAtRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(poll);
    };

    instance.on("ready", () => {
      setDuration(instance.getDuration());
      // Decoding is what makes tap-to-snap and Detect sentences possible. It
      // is also the one step that can fail on its own (a codec the browser
      // will play but not decode), so everything downstream treats an empty
      // onset list as normal rather than as an error.
      try {
        const decoded = instance.getDecodedData();
        if (decoded) {
          const envelope = buildEnvelope(decoded.getChannelData(0), decoded.sampleRate);
          setOnsets(findOnsets(envelope));
        }
      } catch (err) {
        console.warn("Could not analyse audio for sentence boundaries:", err);
      }
    });
    instance.on("play", () => {
      setPlaying(true);
      rafRef.current = requestAnimationFrame(poll);
    });
    instance.on("pause", () => {
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setCurrentTime(instance.getCurrentTime());
    });
    instance.on("finish", () => setPlaying(false));
    // Clicking the wave means "listen from here", so it also cancels a segment
    // audition and re-points the selection at the sentence you landed in.
    instance.on("interaction", () => {
      stopAtRef.current = null;
      const now = instance.getCurrentTime();
      setCurrentTime(now);
      if (timesRef.current.length > 0) setSelected(findMarkerIndexAt(timesRef.current, now));
    });
    instance.on("error", (err) => console.error("WaveSurfer error:", err));

    instance.load(previewUrl).catch((err: Error) => {
      if (err?.name !== "AbortError") {
        console.error("WaveSurfer load error:", err);
        setError(t("audio.editor.loadFailed"));
      }
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      instance.unAll();
      instance.destroy();
      wsRef.current = null;
      setWrapper(null);
    };
  }, [previewUrl, t]);

  useEffect(() => {
    const instance = wsRef.current;
    if (!instance || duration <= 0) return;
    instance.zoom(zoom);
  }, [zoom, duration]);

  // The desk stays mounted behind its overview/settings so drafts and undo survive.
  // Hidden audio must never keep playing or consume another screen's shortcuts.
  useEffect(() => {
    if (!active) {
      wsRef.current?.pause();
      stopAtRef.current = null;
    }
  }, [active]);

  // ── saving ────────────────────────────────────────────────────────────────

  const persist = useCallback(
    async (next: readonly number[]) => {
      const url = remoteUrlRef.current;
      if (!url) return; // markers without a stored recording have nothing to point at
      setSaveState("saving");
      try {
        const updated = await saveMarkers(token, story._id, part.partNumber, toMarkers(next), url);
        onPartUpdated(updated);
        setSaveState((state) => (state === "saving" ? "saved" : state));
      } catch (err) {
        setSaveState("error");
        setError(err instanceof Error ? err.message : t("audio.editor.saveFailed"));
      }
    },
    [token, story._id, part.partNumber, onPartUpdated, t],
  );

  // Autosave, because the old explicit Save button meant an afternoon of
  // marker work was one stray click away from gone, and nothing on screen said
  // so. The status chip beside the transport is the replacement for the button.
  useEffect(() => {
    if (saveState !== "dirty") return;
    const timer = setTimeout(() => void persist(timesRef.current), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [saveState, times, persist]);

  // Leaving the part (or the panel) with an unsaved edit still in the debounce
  // window would lose it silently, so the last write goes out on the way out.
  const persistRef = useRef(persist);
  const saveStateRef = useRef(saveState);
  useEffect(() => {
    persistRef.current = persist;
    saveStateRef.current = saveState;
  });
  useEffect(
    () => () => {
      if (saveStateRef.current === "dirty") void persistRef.current(timesRef.current);
    },
    [],
  );

  // ── marker actions ────────────────────────────────────────────────────────

  const tooClose = useCallback(
    (time: number) => timesRef.current.some((t) => Math.abs(t - time) < MIN_MARKER_GAP),
    [],
  );

  /** The core action: mark a sentence start at the playhead. */
  const mark = useCallback(() => {
    const instance = wsRef.current;
    if (!instance) return;
    const raw = instance.getCurrentTime();
    const time = snap ? snapToOnset(onsets, raw) : raw;
    if (tooClose(time)) return;
    commit((prev) => insertTime(prev, time));
    setSelected(-1);
  }, [commit, onsets, snap, tooClose]);

  /** Seek to sentence `index` and play exactly that sentence. */
  const audition = useCallback(
    (index: number) => {
      const instance = wsRef.current;
      if (!instance || times.length === 0) return;
      const clamped = Math.max(0, Math.min(index, times.length - 1));
      const { start, end } = computeSegmentBounds(times, clamped, duration);
      setSelected(clamped);
      instance.setTime(start);
      setCurrentTime(start);
      stopAtRef.current = Number.isFinite(end) ? end : null;
      void instance.play();
    },
    [times, duration],
  );

  const togglePlay = useCallback(() => {
    // Plain play never stops at a marker: this is the mode you tap markers in.
    stopAtRef.current = null;
    void wsRef.current?.playPause();
  }, []);

  // A drag fires dozens of times a second, so it moves the marker without
  // touching the undo stack or the save state; `dragFrom` remembers where the
  // list was when the gesture began, and settleMarker records that once.
  const dragFrom = useRef<number[] | null>(null);

  const moveMarker = useCallback(
    (index: number, time: number) => {
      const prev = timesRef.current;
      if (!dragFrom.current) dragFrom.current = prev;
      const next = [...prev];
      next[index] = Math.max(0, Math.min(duration || Infinity, time));
      timesRef.current = next;
      setTimes(next);
    },
    [duration],
  );

  /** Re-sorts and records the move — called once a drag or nudge settles. */
  const settleMarker = useCallback(() => {
    const before = dragFrom.current;
    dragFrom.current = null;
    if (!before) return;
    const moved = timesRef.current;
    const sorted = [...moved].sort((a, b) => a - b);
    timesRef.current = sorted;
    setTimes(sorted);
    setHistory((h) => [...h.slice(-49), before]);
    setSaveState("dirty");
    // Dragging one marker past another renumbers both; follow the one in hand.
    setSelected((s) => (s < 0 ? s : sorted.indexOf(moved[s])));
  }, []);

  const nudge = useCallback(
    (seconds: number) => {
      if (selected < 0) return;
      moveMarker(selected, (timesRef.current[selected] ?? 0) + seconds);
      settleMarker();
    },
    [selected, moveMarker, settleMarker],
  );

  const removeMarker = useCallback(
    (index: number) => {
      commit((prev) => prev.filter((_, i) => i !== index));
      setSelected(-1);
    },
    [commit],
  );

  const detect = useCallback(() => {
    const instance = wsRef.current;
    if (!instance) return;
    try {
      const decoded = instance.getDecodedData();
      if (!decoded) return;
      const envelope = buildEnvelope(decoded.getChannelData(0), decoded.sampleRate);
      commit(suggestMarkers(envelope));
      setSelected(0);
    } catch (err) {
      console.warn("Sentence detection failed:", err);
      setError(t("audio.editor.detectFailed"));
    }
  }, [commit, t]);

  // ── the recording ─────────────────────────────────────────────────────────

  const acceptFile = useCallback(
    async (file: File) => {
      setError("");
      if (!file.type.startsWith("audio/")) {
        setError(t("audio.editor.notAudio", { name: file.name }));
        return;
      }

      // Play from a local blob immediately, so markers can be placed while the
      // real upload is still going. `remoteUrl` deliberately stays behind.
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      setUploading(true);
      try {
        const url = await uploadPartAsset(token, story._id, part.partNumber, file, "audio");
        setRemoteUrl(url);
        remoteUrlRef.current = url;
        // Swapping the wave's source to the uploaded copy would reload it and
        // throw away the playhead, so the blob keeps playing for this session
        // and is revoked on unmount instead.
        const updated = await saveMarkers(
          token,
          story._id,
          part.partNumber,
          toMarkers(timesRef.current),
          url,
        );
        onPartUpdated(updated);
        setSaveState("saved");
        setJustUploaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("audio.editor.uploadFailed"));
      } finally {
        setUploading(false);
      }
    },
    [token, story._id, part.partNumber, onPartUpdated, t],
  );

  useEffect(
    () => () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  // ── keyboard ──────────────────────────────────────────────────────────────

  // The whole point of the shortcuts: tapping a key in time with the audio is
  // the only way to place forty markers without it being an afternoon's work.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // The student preview has its own transport shortcuts. A modal must
      // never let those keys play or edit the waveform behind it.
      if (!active || document.querySelector('[aria-modal="true"]')) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      // Enter/Space on a focused navigation button must activate that button.
      if (target?.closest("button") && (event.key === "Enter" || event.key === " ")) return;
      if (!wsRef.current) return;

      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if (meta) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          togglePlay();
          break;
        case "m":
        case "M":
        case "Enter":
          event.preventDefault();
          mark();
          break;
        case "ArrowLeft":
          event.preventDefault();
          if (event.shiftKey) nudge(-NUDGE_SECONDS);
          else audition(selected < 0 ? 0 : selected - 1);
          break;
        case "ArrowRight":
          event.preventDefault();
          if (event.shiftKey) nudge(NUDGE_SECONDS);
          else audition(selected < 0 ? 0 : selected + 1);
          break;
        case "Backspace":
        case "Delete":
          if (selected < 0) return;
          event.preventDefault();
          removeMarker(selected);
          break;
        default:
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, mark, togglePlay, audition, nudge, removeMarker, undo, selected]);

  // ── derived ───────────────────────────────────────────────────────────────

  const issues = useMemo(() => markerIssues(times, duration), [times, duration]);
  const flagged = useMemo(() => new Set(issues.map((i) => i.index)), [issues]);

  const selectedBounds =
    selected >= 0 ? computeSegmentBounds(times, selected, duration) : null;

  const statusChip = {
    saved: { text: t("common.saved"), className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    saving: { text: t("common.saving"), className: "text-gray-500 bg-gray-50 border-gray-200" },
    dirty: { text: t("audio.editor.unsaved"), className: "text-amber-700 bg-amber-50 border-amber-200" },
    error: { text: t("audio.editor.notSaved"), className: "text-red-700 bg-red-50 border-red-200" },
  }[saveState];

  // ── the recording is missing ──────────────────────────────────────────────

  if (!previewUrl) {
    return (
      <div className="space-y-3">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void acceptFile(file);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-[3px] border-2 border-dashed px-6 py-12 cursor-pointer transition-colors ${
            dragOver
              ? "border-amber-400 bg-amber-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
          }`}
        >
          <IoCloudUploadOutline className="text-3xl text-gray-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-black">
            {t("audio.editor.dropTitle", { n: part.partNumber })}
          </span>
          <span className="text-xs text-gray-500">{t("audio.editor.dropHint")}</span>
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void acceptFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {uploading && <p className="text-xs text-gray-500">{t("common.uploading")}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <p className="text-xs text-gray-500 leading-relaxed">
          {t("audio.editor.recordingFirst")}
        </p>
      </div>
    );
  }

  // ── the working view ──────────────────────────────────────────────────────

  return (
    <div className={layout === "desk" ? "grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_220px]" : "space-y-3"}>
      <div className="min-w-0 space-y-3">
      <div className="rounded-[3px] border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 flex-wrap">
          <button
            type="button"
            onClick={() => audition(selected < 0 ? 0 : selected - 1)}
            disabled={times.length === 0}
            title={t("audio.editor.prevSentenceTitle")}
            className="w-8 h-8 grid place-items-center rounded-[3px] text-gray-600 hover:bg-gray-100 disabled:opacity-30"
          >
            <IoPlaySkipBack aria-hidden="true" />
            <span className="sr-only">{t("audio.editor.prevSentence")}</span>
          </button>
          <button
            type="button"
            onClick={togglePlay}
            title={t("audio.editor.playPauseTitle")}
            className="w-9 h-9 grid place-items-center rounded-[3px] bg-black text-white hover:bg-gray-800"
          >
            {playing ? <IoPause aria-hidden="true" /> : <IoPlay aria-hidden="true" />}
            <span className="sr-only">{playing ? t("audio.editor.pause") : t("audio.editor.play")}</span>
          </button>
          <button
            type="button"
            onClick={() => audition(selected < 0 ? 0 : selected + 1)}
            disabled={times.length === 0}
            title={t("audio.editor.nextSentenceTitle")}
            className="w-8 h-8 grid place-items-center rounded-[3px] text-gray-600 hover:bg-gray-100 disabled:opacity-30"
          >
            <IoPlaySkipForward aria-hidden="true" />
            <span className="sr-only">{t("audio.editor.nextSentence")}</span>
          </button>

          <span className="ml-1 text-sm tabular-nums text-black font-medium">
            {formatTime(currentTime)}
            <span className="text-gray-400"> / {formatTime(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={history.length === 0}
              title={t("audio.editor.undoTitle")}
              className="w-8 h-8 grid place-items-center rounded-[3px] text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            >
              <IoArrowUndoOutline aria-hidden="true" />
              <span className="sr-only">{t("audio.editor.undo")}</span>
            </button>
            <div className="flex rounded-[3px] border border-gray-200 overflow-hidden">
              {ZOOM_LEVELS.map((level, i) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setZoom(level)}
                  title={level === 0 ? t("audio.editor.zoomFitTitle") : t("audio.editor.zoomTitle", { n: i })}
                  className={`px-2 py-1 text-[11px] font-semibold ${
                    zoom === level ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {level === 0 ? t("audio.editor.zoomFit") : `${i}×`}
                </button>
              ))}
            </div>
            <span
              className={`text-[11px] font-semibold rounded-[2px] border px-2 py-1 ${statusChip.className}`}
            >
              {statusChip.text}
            </span>
          </div>
        </div>

        <div className="px-3 py-3 bg-slate-50">
          <div ref={containerRef} className="relative" />
        </div>
      </div>

      <MarkerTrack
        wrapper={wrapper}
        duration={duration}
        times={times}
        selected={selected}
        onSelect={setSelected}
        onDrag={moveMarker}
        onDragEnd={settleMarker}
        flagged={flagged}
      />

      {/* The two ways to get markers, side by side, because which one is right
          depends on the recording and a newcomer cannot know that in advance. */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={mark}
          className="inline-flex items-center gap-1.5 bg-ink hover:bg-gray-800 text-white text-sm font-semibold rounded-[3px] px-4 py-2"
        >
          <IoAdd aria-hidden="true" />
          {t("audio.editor.markSentence")}
          <kbd className="ml-1 text-[10px] font-mono bg-white/25 rounded-[3px] px-1 py-0.5">M</kbd>
        </button>
        <button
          type="button"
          onClick={detect}
          disabled={duration === 0}
          title={t("audio.editor.detectTitle")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-[3px] px-3 py-2 hover:bg-gray-50 disabled:opacity-40"
        >
          <IoSparklesOutline aria-hidden="true" />
          {times.length > 0 ? t("audio.editor.detectAgain") : t("audio.editor.detect")}
        </button>
        <label
          title={t("audio.editor.snapTitle")}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none"
        >
          <input
            type="checkbox"
            checked={snap}
            onChange={(e) => setSnap(e.target.checked)}
            className="accent-ink"
          />
          {t("audio.editor.snap")}
          {onsets.length === 0 && duration > 0 && (
            <span className="text-gray-400">{t("audio.editor.noPauses")}</span>
          )}
        </label>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {uploading && <p className="text-xs text-gray-500">{t("audio.editor.uploadingRecording")}</p>}

      <details open={layout === "classic" ? true : undefined} className="rounded-tile border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink">{t("audio.editor.recordingAndSlow")}</summary>
        <div className="mt-3 space-y-3">
          {layout === "desk" && <label className="block text-xs text-dim">{t("audio.editor.replaceRecording")}
            <input type="file" accept="audio/*" disabled={uploading} className="mt-2 block max-w-full text-sm text-ink" onChange={event => { const file = event.target.files?.[0]; if (file) void acceptFile(file); event.target.value = ""; }} />
          </label>}
      <PartSlowCopies
        token={token}
        storyId={story._id}
        part={part}
        onPartUpdated={onPartUpdated}
        autoStart={justUploaded}
      />
        </div>
      </details>

      {issues.length > 0 && (
        <ul className="rounded-[3px] border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
          {issues.slice(0, 4).map((issue, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-amber-900">
              <IoWarningOutline className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="flex-1">
                {issue.kind === "no-start"
                  ? t("audio.editor.issueNoStart", { time: `${issue.seconds.toFixed(1)}s` })
                  : issue.kind === "too-close"
                    ? t("audio.editor.issueTooClose", { a: issue.index, b: issue.index + 1, time: `${issue.seconds.toFixed(1)}s` })
                    : t("audio.editor.issueLong", { n: issue.index + 1, time: `${issue.seconds.toFixed(1)}s` })}
              </span>
              {issue.kind === "no-start" ? (
                <button
                  type="button"
                  onClick={() => {
                    commit((prev) => [0, ...prev.slice(1)]);
                    setSelected(0);
                  }}
                  className="shrink-0 font-semibold underline hover:no-underline"
                >
                  {t("audio.editor.moveIt")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => audition(issue.index)}
                  className="shrink-0 font-semibold underline hover:no-underline"
                >
                  {t("audio.editor.listen")}
                </button>
              )}
            </li>
          ))}
          {issues.length > 4 && (
            <li className="text-xs text-amber-700 pl-6">{t("audio.editor.andMore", { count: issues.length - 4 })}</li>
          )}
        </ul>
      )}

      {/* The sentences themselves. Chips rather than rows: forty of them is a
          normal part, and forty rows is a page of scrolling to answer the only
          question worth asking, which is whether you reached the end. */}
      {times.length === 0 ? (
        <div className="rounded-[3px] border border-dashed border-gray-300 px-4 py-6 text-center">
          <p className="text-sm text-gray-600 font-medium">{t("audio.editor.noSentences")}</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            {t("audio.editor.noSentencesHint")}
            <br />
            <Trans t={t} i18nKey="audio.editor.noSentencesTry" components={{ b: <strong /> }} />
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {times.map((time, i) => (
              <button
                key={i}
                type="button"
                onClick={() => audition(i)}
                title={t("audio.editor.playSentenceTitle", { n: i + 1 })}
                className={`inline-flex items-baseline gap-1.5 rounded-[3px] px-2 py-1 text-[11px] tabular-nums transition-colors ${
                  i === selected
                    ? "bg-ink text-white"
                    : flagged.has(i)
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span className="font-bold">{i + 1}</span>
                <span className={i === selected ? "text-white/80" : "text-gray-400"}>
                  {formatTime(time)}
                </span>
              </button>
            ))}
          </div>

          {layout === "classic" && selected >= 0 && selectedBounds && (
            <div className="flex items-center gap-2 flex-wrap rounded-[3px] bg-gray-50 border border-gray-200 px-3 py-2">
              <span className="text-xs text-black font-semibold">{t("audio.editor.sentenceN", { n: selected + 1 })}</span>
              <span className="text-xs text-gray-500 tabular-nums">
                {formatTime(selectedBounds.start)} &rarr;{" "}
                {formatTime(Math.min(selectedBounds.end, duration))}
                <span className="text-gray-400">
                  {" "}
                  ({(Math.min(selectedBounds.end, duration) - selectedBounds.start).toFixed(1)}s)
                </span>
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() => nudge(-NUDGE_SECONDS)}
                  title={t("audio.editor.earlierTitle")}
                  className="text-xs text-gray-600 bg-white border border-gray-300 rounded-[3px] px-2 py-1 hover:bg-gray-100 tabular-nums"
                >
                  &minus;50ms
                </button>
                <button
                  type="button"
                  onClick={() => nudge(NUDGE_SECONDS)}
                  title={t("audio.editor.laterTitle")}
                  className="text-xs text-gray-600 bg-white border border-gray-300 rounded-[3px] px-2 py-1 hover:bg-gray-100 tabular-nums"
                >
                  +50ms
                </button>
                <button
                  type="button"
                  onClick={() => removeMarker(selected)}
                  title={t("audio.editor.removeTitle")}
                  className="inline-flex items-center gap-1 text-xs text-red-600 bg-white border border-red-200 rounded-[3px] px-2 py-1 hover:bg-red-50"
                >
                  <IoTrashOutline aria-hidden="true" />
                  {t("common.remove")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <details className="group">
        <summary className="cursor-pointer list-none text-xs text-gray-500 hover:text-black select-none inline-flex items-center gap-1">
          <span className="text-gray-400 group-open:rotate-90 transition-transform">&#9656;</span>
          {t("audio.editor.howTitle")}
        </summary>
        <div className="mt-2 text-xs text-gray-600 leading-relaxed bg-gray-50 border border-gray-200 rounded-[3px] p-3 space-y-1.5">
          <p>
            <Trans t={t} i18nKey="audio.editor.how1" components={{ b: <strong /> }} />
          </p>
          <p>
            <Trans t={t} i18nKey="audio.editor.how2" components={{ b: <strong /> }} />
          </p>
          <p>
            <Trans t={t} i18nKey="audio.editor.how3" components={{ k: <kbd className="font-mono bg-white border rounded-[3px] px-1" /> }} />
          </p>
          <p className="text-gray-500">{t("audio.editor.how4")}</p>
        </div>
      </details>
      </div>
      {layout === "desk" && <aside aria-label={t("audio.editor.inspectorAria")} className="h-fit min-w-0 rounded-tile border border-line bg-room p-4 xl:sticky xl:top-4">
        <h4 className="mb-4 text-sm font-bold text-ink">{selected >= 0 ? t("audio.editor.sentenceN", { n: selected + 1 }) : t("audio.editor.inspector")}</h4>
        {selected >= 0 && selectedBounds ? <div className="space-y-4">
          <label className="block text-xs text-dim">{t("audio.editor.startsAt")}
            <input key={`${selected}:${times[selected]}`} type="number" min={0} max={duration || undefined} step={0.05} defaultValue={times[selected].toFixed(2)}
              className="mt-1 w-full rounded-[3px] border border-line-strong bg-white px-3 py-2 text-sm tabular-nums text-ink"
              onBlur={event => { const value = event.target.valueAsNumber; if (Number.isFinite(value) && value !== times[selected]) { moveMarker(selected, value); settleMarker(); } }}
              onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
          </label>
          <p className="text-xs text-dim">{t("audio.editor.endsAt")} <span className="block text-sm tabular-nums text-ink">{formatTime(Math.min(selectedBounds.end, duration))}</span><span className="mt-1 block">{t("audio.editor.seconds", { value: (Math.min(selectedBounds.end, duration) - selectedBounds.start).toFixed(2) })}</span></p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => nudge(-NUDGE_SECONDS)} title={t("audio.editor.inspectorEarlierTitle")} className="min-h-10 flex-1 rounded-[3px] border border-line-strong bg-white px-2 text-xs text-ink">−50 ms</button>
            <button type="button" onClick={() => nudge(NUDGE_SECONDS)} title={t("audio.editor.inspectorLaterTitle")} className="min-h-10 flex-1 rounded-[3px] border border-line-strong bg-white px-2 text-xs text-ink">+50 ms</button>
          </div>
          <button type="button" onClick={() => audition(selected)} className="min-h-10 w-full rounded-[3px] bg-ink px-3 text-sm font-semibold text-white">{t("audio.editor.audition")}</button>
          <button type="button" onClick={() => removeMarker(selected)} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-[3px] border border-line-strong bg-white px-3 text-xs text-red-700"><IoTrashOutline aria-hidden="true" />{t("audio.editor.removeMarker")}</button>
        </div> : <p className="text-sm text-dim">{t("audio.editor.selectHint")}</p>}
        <p className="mt-5 border-t border-line pt-3 text-xs text-dim">{t("audio.editor.autosaveHint")}</p>
        {saveState === "error" && <button type="button" onClick={() => void persist(timesRef.current)} className="mt-3 min-h-10 w-full rounded-[3px] bg-ink px-3 text-sm text-white">{t("audio.editor.retrySave")}</button>}
      </aside>}
    </div>
  );
};

export default PartAudioMarkerEditor;
