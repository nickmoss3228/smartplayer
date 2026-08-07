import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import {
  AdminStory,
  StoryPart,
  TimeMarker,
  uploadPartAsset,
  saveMarkers,
} from "../../../services/adminStoryServices";

interface PartAudioMarkerEditorProps {
  token: string;
  story: AdminStory;
  part: StoryPart;
  onPartUpdated: (part: StoryPart) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
}

// Standalone marker editor — deliberately not reusing the player's
// useWavesurferInit/useSegmentEngine hooks, since those are wired to Redux
// and the sentence-repeat playback engine. This just needs: load audio,
// click/play to find a sentence boundary, record its time as a marker.
const PartAudioMarkerEditor = ({ token, story, part, onPartUpdated }: PartAudioMarkerEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const rafRef = useRef<number | null>(null);

  const [audioUrl, setAudioUrl] = useState(part.audioUrl);
  const [markers, setMarkers] = useState<TimeMarker[]>(part.timeMarkers);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // -1 = the segment before the first marker. i (>=0) = the segment that
  // starts at markers[i] and runs to markers[i+1] (or the end of the track).
  // Playback auto-stops at the end of whichever segment is "current" so an
  // arrow-click always previews exactly one marker-to-marker span.
  const [currentSegment, setCurrentSegment] = useState(-1);
  const currentSegmentRef = useRef(currentSegment);
  useEffect(() => {
    currentSegmentRef.current = currentSegment;
  }, [currentSegment]);

  const segmentIndexForTime = (time: number, markerList: TimeMarker[]): number => {
    let idx = -1;
    for (let i = 0; i < markerList.length; i++) {
      if (markerList[i].time <= time) idx = i;
      else break;
    }
    return idx;
  };

  const getSegmentBounds = (idx: number, markerList: TimeMarker[], dur: number) => {
    const start = idx < 0 ? 0 : markerList[idx]?.time ?? 0;
    const end = idx + 1 < markerList.length ? markerList[idx + 1].time : dur || Infinity;
    return { start, end };
  };

  // Mirrors `markers` so the post-upload auto-save (below) always persists
  // whatever markers exist by then, even ones added while the upload was
  // still in flight — reading `markers` directly from the async closure
  // would capture a stale snapshot from before the upload started.
  const markersRef = useRef(markers);
  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  // Keeps currentSegment pointing at a real marker after one is removed.
  useEffect(() => {
    setCurrentSegment((prev) => Math.max(-1, Math.min(prev, markers.length - 1)));
  }, [markers.length]);

  useEffect(() => {
    setAudioUrl(part.audioUrl);
    setMarkers(part.timeMarkers);
  }, [part]);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    const instance = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#c7c7c7",
      progressColor: "#f59e0b",
      cursorColor: "#111827",
      height: 130,
      normalize: true,
      fillParent: true,
    });
    wsRef.current = instance;

    const poll = () => {
      const now = instance.getCurrentTime();
      setCurrentTime(now);

      // Auto-stop at the current segment's end so Prev/Next + Play always
      // previews exactly the span between two markers, not the whole track.
      const { end } = getSegmentBounds(currentSegmentRef.current, markersRef.current, instance.getDuration());
      if (now >= end - 0.03) {
        instance.pause();
        instance.setTime(end === Infinity ? now : end);
      } else {
        rafRef.current = requestAnimationFrame(poll);
      }
    };

    instance.on("ready", () => setDuration(instance.getDuration()));
    instance.on("interaction", () => {
      const now = instance.getCurrentTime();
      setCurrentTime(now);
      setCurrentSegment(segmentIndexForTime(now, markersRef.current));
    });
    instance.on("play", () => {
      rafRef.current = requestAnimationFrame(poll);
    });
    instance.on("pause", () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setCurrentTime(instance.getCurrentTime());
    });
    instance.on("error", (err) => console.error("WaveSurfer error:", err));

    instance.load(audioUrl).catch((err: Error) => {
      if (err?.name !== "AbortError") console.error("WaveSurfer load error:", err);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      instance.unAll();
      instance.destroy();
      wsRef.current = null;
    };
  }, [audioUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    // Preview instantly from a local blob URL — no need to wait for the
    // network upload to Yandex before you can listen and start placing
    // markers; the real upload happens in the background underneath.
    const localUrl = URL.createObjectURL(file);
    setAudioUrl(localUrl);

    setUploading(true);
    try {
      const url = await uploadPartAsset(token, story._id, part.partNumber, file, "audio");
      URL.revokeObjectURL(localUrl);
      setAudioUrl(url);
      const updated = await saveMarkers(token, story._id, part.partNumber, markersRef.current, url);
      onPartUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const addMarkerAtCurrentTime = () => {
    const nextLabel = String(markers.length + 1);
    const next = [...markers, { time: currentTime, label: nextLabel, color: "red" }].sort(
      (a, b) => a.time - b.time
    );
    setMarkers(next);
  };

  const removeMarker = (index: number) => {
    setMarkers(markers.filter((_, i) => i !== index));
  };

  // Seeks to the start of segment `idx` and plays it, auto-stopping at the
  // segment's end (enforced by the poll loop above) — the core "audition
  // this marker-to-marker span" action behind the arrows and marker list.
  const goToSegment = (idx: number, autoplay = true) => {
    const instance = wsRef.current;
    if (!instance) return;
    const clamped = Math.max(-1, Math.min(idx, markers.length - 1));
    const { start } = getSegmentBounds(clamped, markers, duration);
    setCurrentSegment(clamped);
    instance.setTime(start);
    setCurrentTime(start);
    if (autoplay) instance.play();
  };

  const canGoPrevSegment = currentSegment > -1;
  const canGoNextSegment = currentSegment < markers.length - 1;

  const handleSaveMarkers = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await saveMarkers(token, story._id, part.partNumber, markers, audioUrl ?? undefined);
      onPartUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save markers.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-black mb-1">
          Part {part.partNumber} audio
        </label>
        <input type="file" accept="audio/*" onChange={handleUpload} disabled={uploading} />
        {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {audioUrl && (
        <div>
          <div
            ref={containerRef}
            className="bg-gray-50 rounded-lg border border-gray-200 p-2"
          />
          <div className="relative h-3 mt-1">
            {duration > 0 && (
              <div
                className="absolute top-0 h-3 bg-amber-200/60 rounded-sm"
                style={{
                  left: `${(getSegmentBounds(currentSegment, markers, duration).start / duration) * 100}%`,
                  width: `${
                    ((Math.min(getSegmentBounds(currentSegment, markers, duration).end, duration) -
                      getSegmentBounds(currentSegment, markers, duration).start) /
                      duration) *
                    100
                  }%`,
                }}
              />
            )}
            {duration > 0 &&
              markers.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 w-0.5 h-3 bg-red-500"
                  style={{ left: `${(m.time / duration) * 100}%` }}
                />
              ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => goToSegment(currentSegment - 1)}
              disabled={!canGoPrevSegment}
              title="Previous marker"
              className="text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded px-2.5 py-1.5 disabled:opacity-40"
            >
              ◀ Prev
            </button>
            <button
              type="button"
              onClick={() => wsRef.current?.playPause()}
              className="text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded px-3 py-1.5"
            >
              Play / Pause
            </button>
            <button
              type="button"
              onClick={() => goToSegment(currentSegment + 1)}
              disabled={!canGoNextSegment}
              title="Next marker"
              className="text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded px-2.5 py-1.5 disabled:opacity-40"
            >
              Next ▶
            </button>
            <button
              type="button"
              onClick={addMarkerAtCurrentTime}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white rounded px-3 py-1.5"
            >
              Add marker at {formatTime(currentTime)}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Prev/Next jump to a marker and play just that segment, stopping at the next one — use it to check each sentence sounds complete.
          </p>
        </div>
      )}

      {markers.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-semibold text-black">Markers ({markers.length})</div>
          {markers.map((m, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-sm rounded px-2 py-1 ${
                currentSegment === i ? "bg-amber-100" : "bg-gray-50"
              }`}
            >
              <button
                type="button"
                onClick={() => goToSegment(i)}
                title="Play this segment"
                className="text-amber-600 hover:underline"
              >
                {formatTime(m.time)}
              </button>
              <span className="text-gray-400">#{m.label}</span>
              <button
                type="button"
                onClick={() => removeMarker(i)}
                className="ml-auto text-red-500 text-xs hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleSaveMarkers}
        disabled={saving || !audioUrl}
        className="text-sm bg-black text-white rounded-lg px-4 py-2 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save markers"}
      </button>
    </div>
  );
};

export default PartAudioMarkerEditor;
