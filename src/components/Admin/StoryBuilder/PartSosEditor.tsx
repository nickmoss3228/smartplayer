import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IoCloudUploadOutline,
  IoPause,
  IoPlay,
  IoTrashOutline,
  IoSwapHorizontalOutline,
  IoWarningOutline,
} from "react-icons/io5";
import { MdSos } from "react-icons/md";
import {
  AdminStory,
  StoryPart,
  uploadPartAsset,
  saveHelpAudio,
} from "../../../services/adminStoryServices";
import { clipSlots, matchFilesToSlots } from "./sosClips";
import { smallButton } from "./studioStyles";

interface PartSosEditorProps {
  token: string;
  story: AdminStory;
  part: StoryPart;
  onPartUpdated: (part: StoryPart) => void;
  /** Opens the Audio & markers tool, for a part whose markers are not set yet. */
  onEditMarkers: () => void;
}

/** Uploads running at once during a bulk drop. */
const PARALLEL_UPLOADS = 4;

const isMp3 = (file: File) =>
  ["audio/mpeg", "audio/mp3"].includes(file.type) || /\.mp3$/i.test(file.name);

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

type Playing = { kind: "clip" | "original"; index: number } | null;

// The SOS button: for each sentence of the part (one per marker), the same
// sentence recorded again in short phrases at normal speed. A student who
// presses SOS inside sentence N hears clip N. The markers decide the sentences,
// so they have to be settled before any clip goes in.
const PartSosEditor = ({ token, story, part, onPartUpdated, onEditMarkers }: PartSosEditorProps) => {
  const { t } = useTranslation("studio");
  const times = [...part.timeMarkers].map((m) => m.time).sort((a, b) => a - b);
  const markerCount = times.length;

  const [clips, setClips] = useState<string[]>(() => clipSlots(part.helpAudio, markerCount));
  const clipsRef = useRef(clips);
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<Playing>(null);
  const clipAudio = useRef<HTMLAudioElement>(null);
  const originalAudio = useRef<HTMLAudioElement>(null);
  const segmentEnd = useRef<number | null>(null);
  const rowInput = useRef<HTMLInputElement>(null);
  const rowTarget = useRef<number | null>(null);

  // Clips stored past the last marker: the markers were cut after the clips
  // went in. The player never reaches them, and the next save drops them.
  // Blank slots don't count: older parts were seeded with 16 "" placeholders.
  const extra = (part.helpAudio ?? []).slice(markerCount).filter(Boolean).length;
  const busy = pending.size > 0 || saving;
  const filledCount = clips.filter(Boolean).length;

  useEffect(() => {
    const next = clipSlots(part.helpAudio, markerCount);
    clipsRef.current = next;
    setClips(next);
  }, [part.helpAudio, markerCount]);

  const setSlot = (index: number, url: string) => {
    const next = [...clipsRef.current];
    next[index] = url;
    clipsRef.current = next;
    setClips(next);
  };

  const persist = async () => {
    setSaving(true);
    try {
      const updated = await saveHelpAudio(token, story._id, part.partNumber, clipsRef.current);
      onPartUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("content.sos.saveFailed"));
      const saved = clipSlots(part.helpAudio, markerCount);
      clipsRef.current = saved;
      setClips(saved);
    } finally {
      setSaving(false);
    }
  };

  const uploadAll = async (files: File[]) => {
    setError("");
    if (files.length === 0) return;
    const wrong = files.find((file) => !isMp3(file));
    if (wrong) {
      setError(t("content.sos.notMp3", { name: wrong.name }));
      return;
    }
    const match = matchFilesToSlots(files, markerCount);
    if (!match.ok) {
      setError(t("content.sos.tooMany", { picked: match.picked, markers: match.markers }));
      return;
    }

    const queue = [...match.assignments];
    setPending(new Set(queue.map((a) => a.index)));
    const failed: string[] = [];
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        try {
          const url = await uploadPartAsset(token, story._id, part.partNumber, next.file, "help", { index: next.index });
          setSlot(next.index, url);
        } catch {
          failed.push(next.file.name);
        }
        const done = next.index;
        setPending((current) => {
          const left = new Set(current);
          left.delete(done);
          return left;
        });
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL_UPLOADS, queue.length) }, worker));

    await persist();
    if (failed.length) setError(t("content.sos.someFailed", { names: failed.join(", ") }));
  };

  const remove = async (index: number) => {
    setError("");
    stop();
    setSlot(index, "");
    await persist();
  };

  const removeAll = async () => {
    if (!confirm(t("content.sos.confirmRemoveAll", { n: part.partNumber }))) return;
    setError("");
    stop();
    clipsRef.current = clipSlots([], markerCount);
    setClips(clipsRef.current);
    await persist();
  };

  // ── listening ──────────────────────────────────────────────────────────────
  const stop = () => {
    clipAudio.current?.pause();
    originalAudio.current?.pause();
    segmentEnd.current = null;
    setPlaying(null);
  };

  const toggle = (kind: "clip" | "original", index: number) => {
    const same = playing?.kind === kind && playing.index === index;
    stop();
    if (same) return;
    if (kind === "clip") {
      const audio = clipAudio.current;
      if (!audio || !clips[index]) return;
      audio.src = clips[index];
      void audio.play().then(() => setPlaying({ kind, index })).catch(() => setError(t("content.sos.playFailed")));
    } else {
      const audio = originalAudio.current;
      if (!audio) return;
      audio.currentTime = times[index];
      segmentEnd.current = times[index + 1] ?? null;
      void audio.play().then(() => setPlaying({ kind, index })).catch(() => setError(t("content.sos.playFailed")));
    }
  };

  // timeupdate fires a few times a second, which overshoots into the next
  // sentence; a frame loop stops the original on its marker.
  useEffect(() => {
    if (playing?.kind !== "original") return;
    let frame = requestAnimationFrame(function tick() {
      const audio = originalAudio.current;
      const end = segmentEnd.current;
      if (audio && end !== null && audio.currentTime >= end) {
        audio.pause();
        segmentEnd.current = null;
        setPlaying(null);
        return;
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  // ── empty state: the markers come first ─────────────────────────────────────
  if (!part.audioUrl || markerCount === 0) {
    return (
      <div className="rounded-[3px] border border-dashed border-line-strong bg-room p-8 text-center">
        <MdSos className="mx-auto text-3xl text-dim" aria-hidden="true" />
        <p className="mt-2 text-sm font-semibold text-ink">{t("content.sos.needMarkers")}</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-dim">{t("content.sos.needMarkersHint")}</p>
        <button type="button" onClick={onEditMarkers} className={smallButton + " mt-4"}>
          {t("content.sos.goToMarkers")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-dim">{t("content.sos.intro", { markers: markerCount })}</p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!busy) void uploadAll(Array.from(e.dataTransfer.files ?? []));
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[3px] border-2 border-dashed px-6 py-6 transition-colors ${
          dragOver ? "border-amber-400 bg-amber-50" : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        } ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <IoCloudUploadOutline className="text-2xl text-gray-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-black">{t("content.sos.drop", { markers: markerCount })}</span>
        <span className="text-xs text-gray-500">{t("content.sos.dropHint")}</span>
        <input
          type="file"
          accept="audio/mpeg,.mp3"
          multiple
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            void uploadAll(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {extra > 0 && (
        <p className="flex items-start gap-2 rounded-[3px] bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <IoWarningOutline className="mt-0.5 shrink-0" aria-hidden="true" />
          {t("content.sos.extra", { count: extra, markers: markerCount })}
        </p>
      )}

      {/* One hidden picker shared by every row's Upload / Replace. */}
      <input
        ref={rowInput}
        type="file"
        accept="audio/mpeg,.mp3"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const index = rowTarget.current;
          e.target.value = "";
          if (!file || index === null) return;
          void (async () => {
            setError("");
            if (!isMp3(file)) {
              setError(t("content.sos.notMp3", { name: file.name }));
              return;
            }
            setPending(new Set([index]));
            try {
              setSlot(index, await uploadPartAsset(token, story._id, part.partNumber, file, "help", { index }));
            } catch (err) {
              setPending(new Set());
              setError(err instanceof Error ? err.message : t("content.sos.uploadFailed"));
              return;
            }
            setPending(new Set());
            await persist();
          })();
        }}
      />

      <ol className="divide-y divide-line rounded-[3px] border border-line">
        {times.map((start, index) => {
          const end = times[index + 1];
          const url = clips[index];
          const uploading = pending.has(index);
          const clipOn = playing?.kind === "clip" && playing.index === index;
          const originalOn = playing?.kind === "original" && playing.index === index;
          return (
            <li key={index} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
              <span className="w-7 shrink-0 text-sm font-bold tabular-nums text-ink">{index + 1}</span>
              <button
                type="button"
                onClick={() => toggle("original", index)}
                aria-pressed={originalOn}
                title={t("content.sos.playOriginal")}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-[3px] px-2 text-xs tabular-nums text-dim hover:bg-room hover:text-ink"
              >
                {originalOn ? <IoPause aria-hidden="true" /> : <IoPlay aria-hidden="true" />}
                {formatTime(start)}–{end !== undefined ? formatTime(end) : t("content.sos.end")}
              </button>
              <span className="ml-auto flex flex-wrap items-center gap-2">
                {uploading ? (
                  <span className="text-xs text-dim">{t("common.uploading")}</span>
                ) : url ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggle("clip", index)}
                      aria-pressed={clipOn}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-[3px] bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                    >
                      {clipOn ? <IoPause aria-hidden="true" /> : <IoPlay aria-hidden="true" />}
                      {t("content.sos.playClip")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        rowTarget.current = index;
                        rowInput.current?.click();
                      }}
                      aria-label={t("content.sos.replaceN", { n: index + 1 })}
                      title={t("content.sos.replace")}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[3px] text-dim hover:bg-room hover:text-ink disabled:opacity-40"
                    >
                      <IoSwapHorizontalOutline aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(index)}
                      aria-label={t("content.sos.removeN", { n: index + 1 })}
                      title={t("common.remove")}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[3px] text-dim hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                    >
                      <IoTrashOutline aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      rowTarget.current = index;
                      rowInput.current?.click();
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-[3px] border border-dashed border-line-strong px-3 text-xs font-semibold text-dim hover:border-ink hover:text-ink disabled:opacity-40"
                  >
                    <IoCloudUploadOutline aria-hidden="true" />
                    {t("content.sos.addClip")}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <audio ref={clipAudio} preload="none" onEnded={() => setPlaying(null)} className="hidden" />
      <audio
        ref={originalAudio}
        src={part.audioUrl}
        preload="metadata"
        onEnded={() => setPlaying(null)}
        // Backstop for the frame loop, which a background tab throttles.
        onTimeUpdate={(e) => {
          const end = segmentEnd.current;
          if (end !== null && e.currentTarget.currentTime >= end) stop();
        }}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <p className="text-xs text-dim">
          {saving ? t("common.saving") : t("content.sos.summary", { count: filledCount, total: markerCount })}
        </p>
        {filledCount > 0 && (
          <button type="button" onClick={() => void removeAll()} disabled={busy} className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50">
            {t("content.sos.removeAll")}
          </button>
        )}
      </div>
    </div>
  );
};

export default PartSosEditor;
