import React from "react";
// import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { TimeMarkers } from "./Controls/TimeMarkers";
import { MobileProgressBar } from "./Controls/MobileProgressBar";
import { TimeMarker } from "../../types";

interface MobilePrevNext {
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

interface WaveformDisplayProps {
  waveformRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  isInitialized: boolean;
  currentTime: string;
  duration: string;
  durationSeconds: number;
  timeMarkers: TimeMarker[];
  subtitlesVisible: boolean;
  activeSubtitle: string;
  onMarkerClick: (time: number) => void;
  isMobile?: boolean;
  mobilePrevNext?: MobilePrevNext;
  // ── New: only needed for the mobile layout ──
  onSeek?: (progress: number) => void;
  getAudioTime?: () => number;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = React.memo(
  ({
    waveformRef,
    isLoading,
    isInitialized,
    currentTime,
    duration,
    durationSeconds,
    timeMarkers,
    onMarkerClick,
    isMobile = false,
    onSeek,
    getAudioTime,
  }) => {

     {/*
          ════════════════════════════════════════════════════════
          DESKTOP WAVEFORM (WaveSurfer renders here)

          Both WaveformDisplay instances share the same waveformRef.
          Because the desktop instance is second in JSX, React assigns
          the ref to IT last, so WaveSurfer always mounts here — even
          on mobile viewports (audio still works; it's just display:none).
          ════════════════════════════════════════════════════════
        */}

    return (
      <>
        {!isMobile && (
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-white text-sm">Loading audio...</span>
                </div>
              </div>
            )}

            {/* ── Waveform canvas ── */}
            <div
              ref={waveformRef}
              className="w-full mx-auto rounded-full overflow-hidden relative px-1 group
                         bg-black/40 h-[48px]
                         md:bg-white/60 md:h-8 md:rounded-lg md:px-0.5"
            >
              <div
                id="hover"
                className="absolute left-0 top-0 z-10 pointer-events-none h-full w-0
                           mix-blend-overlay bg-white/20 opacity-0
                           transition-opacity duration-200 group-hover:opacity-100"
              />

              {isInitialized && !isLoading && timeMarkers?.length > 0 && (
                <TimeMarkers
                  timeMarkers={timeMarkers}
                  durationSeconds={durationSeconds}
                  onMarkerClick={onMarkerClick}
                />
              )}
            </div>

            {/*
              ── Time labels live OUTSIDE waveformRef ──
              Positioned against the outer `relative` div, so overflow-hidden
              on the waveform canvas can never clip or bury them.
            */}
            <div
              id="time"
              className="absolute z-20 top-1/2 -translate-y-1/2 left-2
                         text-[11px] bg-black/75 px-1.5 py-0.5 text-[#ddd]
                         rounded-[3px] pointer-events-none
                         md:top-auto md:translate-y-0 md:bottom-[-15px] md:left-[-10px]
                         md:text-[10px] md:px-1 md:py-[1px]"
            >
              {currentTime}
            </div>
            <div
              id="duration"
              className="absolute z-20 top-1/2 -translate-y-1/2 right-2
                         text-[11px] bg-black/75 px-1.5 py-0.5 text-[#ddd]
                         rounded-[3px] pointer-events-none
                         md:top-auto md:translate-y-0 md:bottom-[-15px] md:right-[-10px]
                         md:text-[10px] md:px-1 md:py-[1px]"
            >
              {duration}
            </div>
          </div>
        )}

        {/*
          ════════════════════════════════════════════════════════
          MOBILE LAYOUT

          WaveSurfer lives on the desktop div above, so we skip
          re-mounting it here entirely. Instead we render:
            1. A Spotify-style thin progress bar (MobileProgressBar)
            2. The existing Prev / Next segment buttons below it

          The hidden ref placeholder keeps waveformRef semantically
          attached to something in this instance just in case render
          order ever changes.
          ════════════════════════════════════════════════════════
        */}
        {isMobile && (
          <>
            {/* Invisible ref placeholder — WaveSurfer never uses this */}
            <div ref={waveformRef} className="sr-only" aria-hidden="true" />

            {/* Custom progress bar */}
            {onSeek && getAudioTime && (
              <MobileProgressBar
                getAudioTime={getAudioTime}
                durationSeconds={durationSeconds}
                timeMarkers={timeMarkers}
                onSeek={onSeek}
                onMarkerClick={onMarkerClick}
                currentTime={currentTime}
                duration={duration}
                isLoading={isLoading}
              />
            )}

            {/* Prev / Next segment navigation
            <div className="flex items-center justify-between mt-1">
              <button
                onClick={mobilePrevNext.onPrev}
                disabled={!mobilePrevNext.canGoPrev}
                className="w-11 h-11 rounded-full bg-black/80 text-white
                           flex items-center justify-center
                           disabled:opacity-30 disabled:pointer-events-none
                           active:scale-95 transition shadow"
                aria-label="Previous segment"
              >
                <IoChevronBack className="w-5 h-5" />
              </button>

              <button
                onClick={mobilePrevNext.onNext}
                disabled={!mobilePrevNext.canGoNext}
                className="w-11 h-11 rounded-full bg-black/80 text-white
                           flex items-center justify-center
                           disabled:opacity-30 disabled:pointer-events-none
                           active:scale-95 transition shadow"
                aria-label="Next segment"
              >
                <IoChevronForward className="w-5 h-5" />
              </button>
            </div> */}
          </>
        )}
      </>
    );
  }
);

WaveformDisplay.displayName = "WaveformDisplay";