import React, { useRef, useState, useEffect, useCallback } from "react";
import { TimeMarker } from "../../../types";

interface MobileProgressBarProps {
  getAudioTime: () => number;  // polls wavesurfer.getCurrentTime()
  durationSeconds: number;
  timeMarkers: TimeMarker[];
  onSeek: (progress: number) => void;  // 0 – 1
  onMarkerClick: (time: number) => void;
  currentTime: string; // formatted "M:SS" for display
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
  const [isDragging, setIsDragging] = useState(false);
  const rafRef = useRef<number>(0);
  const barRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbTrackRef = useRef<HTMLDivElement>(null);

  // ── ~60fps sync with WaveSurfer position ─────────────────────────────────
  // Written straight to the DOM, not through state: a setState per frame
  // re-rendered the whole bar (every marker button included) 60 times a
  // second, and moving the fill by `width` and the thumb by `left` re-ran
  // layout on each of those frames — the playhead visibly stuttered on phones.
  // Now the fill scales and the thumb translates, both composite-only.
  useEffect(() => {
    let last = -1;
    let lastPct = -1;
    let lastWidth = -1;
    // The bar unmounts while loading; a fresh one starts at scaleX(0), so a
    // new element has to be written even if the position hasn't moved.
    let lastFill: HTMLDivElement | null = null;
    const tick = () => {
      if (durationSeconds > 0) {
        const next = Math.min(1, Math.max(0, getAudioTime() / durationSeconds));
        // Read before any write this frame, so it never forces a layout; it
        // also re-places a paused thumb when the bar changes width.
        const width = railRef.current?.offsetWidth ?? 0;
        if (next !== last || width !== lastWidth || fillRef.current !== lastFill) {
          if (fillRef.current !== lastFill) lastPct = -1;
          last = next;
          lastWidth = width;
          lastFill = fillRef.current;
          if (fillRef.current) fillRef.current.style.transform = `scaleX(${next})`;
          if (thumbTrackRef.current) thumbTrackRef.current.style.transform = `translateX(${next * width}px)`;
          const pct = Math.round(next * 100);
          if (pct !== lastPct && barRef.current) {
            lastPct = pct;
            barRef.current.setAttribute("aria-valuenow", String(pct));
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [durationSeconds, getAudioTime]);

  // Pointer interactions 
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

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center gap-2 py-6">
        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
        <span className="text-white/50 text-xs">Loading audio…</span>
      </div>
    );
  }

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
        aria-valuenow={0}
        tabIndex={0}
        className="relative w-full py-5 cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* ── Rail ── */}
        <div ref={railRef} className="relative h-[3px] w-full rounded-full bg-white/20">

          {/* Played portion — full width, scaled from the left by the rAF loop */}
          <div
            ref={fillRef}
            className="absolute inset-0 rounded-full bg-white/90 origin-left will-change-transform"
            style={{ transform: "scaleX(0)" }}
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
                  // White is set explicitly. These used `bg-red/30 ring-red/25`,
                  // which are not Tailwind classes (red needs a shade), so the
                  // dot painted only `ring-1` in the inherited text colour —
                  // white until the root colour became ink, then black.
                  className="absolute z-30 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10
                             w-[4px] h-[4px] rounded-full
                             ring-1 ring-white/80
                             active:bg-white active:scale-125
                             transition-transform touch-manipulation"
                  style={{ left: `${(t / durationSeconds) * 100}%` }}
                />
              );
            })}

          {/* ── Playhead thumb ──
              A zero-width track at the rail's left edge, moved by N% of the
              rail in pixels; the thumb is centred on it. It used to span the
              whole rail and move by N% of its own width, which slid a
              transparent rail-wide box past the right end — the scroll area
              around the bar grew a sideways scrollbar that crept along with
              the playhead. The thumb grows on drag by scale, not width/height. */}
          <div
            ref={thumbTrackRef}
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-0 z-20 pointer-events-none will-change-transform"
            style={{ transform: "translateX(0px)" }}
          >
            <div
              className={[
                "absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
                "w-[18px] h-[18px] rounded-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.35)]",
                "transition-transform duration-100 ease-out",
                isDragging ? "scale-100" : "scale-[0.72]",
              ].join(" ")}
            />
          </div>
        </div>
      </div>

      {/* ── Time labels ── */}
      <div
        className="flex justify-between -mt-2 px-0.5
                   text-[11px] font-medium
                   tabular-nums text-white/45"
      >
        <span>{currentTime}</span>
        <span>{duration}</span>
      </div>
    </div>
  );
};