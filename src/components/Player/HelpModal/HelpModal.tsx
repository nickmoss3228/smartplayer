import React, { useRef, useState, useEffect, useCallback } from "react";
import { TimeMarker } from "../../../types";
import { createPortal } from "react-dom"; 

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  helpAudioUrls?: string[];
  timeMarkers: TimeMarker[];
  initialMarkerIndex: number;
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────
const fmt = (s: number): string => {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const mTime = (m: TimeMarker): number =>
  typeof m === "object" ? m.time : (m as unknown as number);

const mLabel = (m: TimeMarker, i: number): string =>
  typeof m === "object" && m.label ? m.label : `Part ${i + 1}`;
// ─────────────────────────────────────────────────────────────────────────────

const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  helpAudioUrls,
  timeMarkers,
  initialMarkerIndex,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef   = useRef<number | null>(null);

  const [markerIdx,  setMarkerIdx]  = useState(initialMarkerIndex);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [elapsed,    setElapsed]    = useState(0);
  const [segDur,     setSegDur]     = useState(0);
  const [isLoaded,   setIsLoaded]   = useState(false);
  const [loadError,  setLoadError]  = useState(false);

  const currentUrl = helpAudioUrls?.[markerIdx];

  // ── DIAGNOSTIC: log every time the key values change ──────────────────────
  useEffect(() => {
    console.log("[HelpModal] isOpen:", isOpen);
    console.log("[HelpModal] helpAudioUrls:", helpAudioUrls);
    console.log("[HelpModal] initialMarkerIndex:", initialMarkerIndex);
  }, [isOpen, helpAudioUrls, initialMarkerIndex]);

  useEffect(() => {
    console.log("[HelpModal] markerIdx changed to:", markerIdx);
    console.log("[HelpModal] currentUrl for this segment:", currentUrl);
  }, [markerIdx, currentUrl]);

  // ── reset when modal opens / closes ───────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setMarkerIdx(initialMarkerIndex);
      setIsPlaying(false);
      setProgress(0);
      setElapsed(0);
    } else {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isOpen, initialMarkerIndex]);

  // ── reset state when the url array reference changes ─────────────────────
  useEffect(() => {
    console.log("[HelpModal] helpAudioUrls reference changed, resetting state");
    setIsLoaded(false);
    setIsPlaying(false);
    setProgress(0);
    setElapsed(0);
  }, [helpAudioUrls]);

  // ── swap src and reload whenever the segment changes ──────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      console.warn("[HelpModal] audioRef.current is null — cannot load");
      return;
    }
    console.log("[HelpModal] Loading segment. src will be:", currentUrl);
    audio.pause();
    setIsPlaying(false);
    setIsLoaded(false);
    setLoadError(false);
    setProgress(0);
    setElapsed(0);
    setSegDur(0);
    audio.load(); // picks up the new src React already set on the DOM element
  }, [markerIdx, currentUrl]);

  // ── RAF progress loop ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const audio = audioRef.current;
      if (!audio) return;
      const dur = audio.duration || 0;
      const now = audio.currentTime;
      setElapsed(now);
      setProgress(dur > 0 ? now / dur : 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying]);

  const canInteract = isLoaded && !loadError && !!currentUrl;

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    console.log("[HelpModal] handlePlayPause — canInteract:", canInteract, "isPlaying:", isPlaying);
    if (!audio || !canInteract) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => {
          console.log("[HelpModal] audio.play() resolved OK");
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("[HelpModal] audio.play() rejected:", err);
        });
    }
  }, [isPlaying, canInteract]);

  const handleReplay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !canInteract) return;
    audio.pause();
    audio.currentTime = 0;
    setProgress(0);
    setElapsed(0);
    setTimeout(() => {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }, 30);
  }, [canInteract]);

  const handlePrev = useCallback(() => {
    if (markerIdx > 0) setMarkerIdx((i) => i - 1);
  }, [markerIdx]);

  const handleNext = useCallback(() => {
    if (markerIdx < timeMarkers.length - 1) setMarkerIdx((i) => i + 1);
  }, [markerIdx, timeMarkers.length]);

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !canInteract) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * (audio.duration || 0);
      setProgress(ratio);
    },
    [canInteract],
  );

  if (!isOpen) return null;

  const canPrev = markerIdx > 0;
  const canNext = markerIdx < timeMarkers.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-9 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-6 pt-5 pb-8 flex flex-col gap-5">
          {/* header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-lg select-none">
                🎧
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 leading-tight">Listening Aid</p>
                <p className="text-xs text-gray-400">
                  Segment{" "}
                  <span className="font-semibold text-gray-600">{markerIdx + 1}</span>
                  {" "}/ {timeMarkers.length}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* segment label
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl px-4 py-2.5 text-center min-h-[42px] flex items-center justify-center">
            <p className="text-sm font-semibold text-indigo-700 truncate">
              {mLabel(timeMarkers[markerIdx], markerIdx)}
            </p>
          </div> */}

          {/* ── KEY: audio element — src is driven by React state ── */}
          <audio
            ref={audioRef}
            src={currentUrl || undefined}
            preload="auto"
            onLoadedMetadata={(e) => {
              const dur = (e.currentTarget as HTMLAudioElement).duration;
              console.log("[HelpModal] onLoadedMetadata fired. duration:", dur, "src:", e.currentTarget.src);
              setSegDur(isFinite(dur) ? dur : 0);
              setIsLoaded(true);
              setLoadError(false);
            }}
            onEnded={() => {
              console.log("[HelpModal] onEnded fired");
              setIsPlaying(false);
              setProgress(0);
              setElapsed(0);
              if (audioRef.current) audioRef.current.currentTime = 0;
            }}
            onError={(e) => {
              console.error("[HelpModal] onError fired. src was:", (e.currentTarget as HTMLAudioElement).src, e);
              setIsLoaded(false);
              setLoadError(true);
            }}
          />

          {/* status messages */}
          {!currentUrl && (
            <p className="text-center text-xs text-amber-500">
              No help audio for this segment yet.
            </p>
          )}
          {loadError && (
            <p className="text-center text-xs text-red-500">
              Could not load: <code className="text-[10px]">{currentUrl}</code>
            </p>
          )}

          {/* progress bar */}
          <div className="flex flex-col gap-1.5">
            <div
              className="relative h-2 bg-gray-100 rounded-full cursor-pointer group overflow-visible"
              onClick={handleBarClick}
            >
              <div
                className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full transition-none"
                style={{ width: `${progress * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-indigo-600 shadow ring-2 ring-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `calc(${progress * 100}% - 7px)` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 tabular-nums">
              <span>{fmt(elapsed)}</span>
              <span>{segDur > 0 ? fmt(segDur) : "--:--"}</span>
            </div>
          </div>

          {/* transport */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={!canPrev}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 text-[13px] font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </button>

            {/* <button 
              onClick={handleReplay}
              disabled={!canInteract}
              className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button> */}

            <button
              onClick={handlePlayPause}
              disabled={!canInteract}
              className="w-14 h-14 rounded-full bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="5" width="4" height="14" rx="1.5" />
                  <rect x="14" y="5" width="4" height="14" rx="1.5" />
                </svg>
              ) : (
                <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={!canNext}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 text-[13px] font-medium"
            >
              Next
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {!canInteract && !loadError && currentUrl && (
            <p className="text-center text-xs text-gray-400 animate-pulse -mt-1">
              Loading audio…
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default HelpModal;