import React, { useRef, useState, useEffect, useCallback } from "react";
import { TimeMarker } from "../../../types";

interface MobileProgressBarProps {
  getAudioTime: () => number;          // polls wavesurfer.getCurrentTime()
  durationSeconds: number;
  timeMarkers: TimeMarker[];
  onSeek: (progress: number) => void;  // 0 – 1
  onMarkerClick: (time: number) => void;
  currentTime: string;                 // formatted "M:SS" for display
  duration: string;
  isLoading: boolean;
}

export const MobileProgressBar: React.FC<MobileProgressBarProps> = ({
  getAudioTime,
  durationSeconds,
  timeMarkers,
  onSeek,
  onMarkerClick,
  currentTime,
  duration,
  isLoading,
}) => {
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const rafRef = useRef<number>(0);
  const barRef = useRef<HTMLDivElement>(null);

  // ── Smooth ~60fps sync with WaveSurfer position ──────────────────────────
  useEffect(() => {
    const tick = () => {
      if (durationSeconds > 0) {
        const next = Math.min(1, Math.max(0, getAudioTime() / durationSeconds));
        // Skip re-render if change is imperceptible (perf guard during pause)
        setProgress((prev) => (Math.abs(prev - next) < 0.0005 ? prev : next));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [durationSeconds, getAudioTime]);

  // ── Pointer interactions ──────────────────────────────────────────────────
  const getProgressFromX = useCallback((clientX: number) => {
    if (!barRef.current) return 0;
    const { left, width } = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - left) / width));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      onSeek(getProgressFromX(e.clientX));
    },
    [onSeek, getProgressFromX]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      onSeek(getProgressFromX(e.clientX));
    },
    [isDragging, onSeek, getProgressFromX]
  );

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center gap-2 py-6">
        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
        <span className="text-white/50 text-xs font-['Montserrat']">Loading audio…</span>
      </div>
    );
  }

  const pct = `${progress * 100}%`;

  return (
    <div className="w-full select-none">
      {/*
        Tall hit-area (py-5) so the thin 3px rail is easy to tap on mobile.
        touch-none prevents the browser from hijacking touch to scroll
        while the user is dragging across the bar.
      */}
      <div
        ref={barRef}
        role="slider"
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        tabIndex={0}
        className="relative w-full py-5 cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* ── Rail ── */}
        <div className="relative h-[3px] w-full rounded-full bg-white/20">

          {/* Played portion */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/90"
            style={{ width: pct }}
          />

          {/* ── Segment / time-marker dots ── */}
          {durationSeconds > 0 &&
            timeMarkers.map((marker, idx) => {
              const t =
                typeof marker === "object"
                  ? marker.time
                  : (marker as unknown as number);
              return (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Jump to segment ${idx + 1}`}
                  // Stop the bar's seek handler from also firing
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkerClick(t);
                  }}
                  className="absolute z-30 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10
                             w-[4px] h-[4px] rounded-full
                             bg-red/30 ring-1 ring-red/25
                             active:bg-red active:scale-125
                             transition-transform touch-manipulation"
                  style={{ left: `${(t / durationSeconds) * 100}%` }}
                />
              );
            })}

          {/* ── Playhead thumb ── */}
          <div
            aria-hidden="true"
            className={[
              "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-20",
              "rounded-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.35)]",
              "transition-[width,height] duration-75",
              isDragging ? "w-[18px] h-[18px]" : "w-[13px] h-[13px]",
            ].join(" ")}
            style={{ left: pct }}
          />
        </div>
      </div>

      {/* ── Time labels ── */}
      <div
        className="flex justify-between -mt-2 px-0.5
                   text-[11px] font-medium font-['Montserrat']
                   tabular-nums text-white/45"
      >
        <span>{currentTime}</span>
        <span>{duration}</span>
      </div>
    </div>
  );
};