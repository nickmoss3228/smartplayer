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

  // Mirrors `markers` so the post-upload auto-save (below) always persists
  // whatever markers exist by then, even ones added while the upload was
  // still in flight — reading `markers` directly from the async closure
  // would capture a stale snapshot from before the upload started.
  const markersRef = useRef(markers);
  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

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
      height: 80,
      normalize: true,
      fillParent: true,
    });
    wsRef.current = instance;

    const poll = () => {
      setCurrentTime(instance.getCurrentTime());
      rafRef.current = requestAnimationFrame(poll);
    };

    instance.on("ready", () => setDuration(instance.getDuration()));
    instance.on("interaction", () => setCurrentTime(instance.getCurrentTime()));
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
            className="bg-gray-50 rounded-lg border border-gray-200"
          />
          <div className="relative h-2 mt-1">
            {duration > 0 &&
              markers.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 w-0.5 h-2 bg-red-500"
                  style={{ left: `${(m.time / duration) * 100}%` }}
                />
              ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => wsRef.current?.playPause()}
              className="text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded px-3 py-1.5"
            >
              Play / Pause
            </button>
            <button
              type="button"
              onClick={addMarkerAtCurrentTime}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white rounded px-3 py-1.5"
            >
              Add marker at {formatTime(currentTime)}
            </button>
          </div>
        </div>
      )}

      {markers.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-semibold text-black">Markers ({markers.length})</div>
          {markers.map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-2 py-1">
              <button
                type="button"
                onClick={() => wsRef.current?.setTime(m.time)}
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
