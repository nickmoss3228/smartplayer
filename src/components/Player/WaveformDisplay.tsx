import React from "react";
import { useTranslation } from "react-i18next";
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
  /** Desktop: the phrase being drilled, shaded and counted. null in free play. */
  activeMarkerIndex?: number | null;
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
    activeMarkerIndex = null,
  }) => {
    const { t } = useTranslation();

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
          // Only ever shown inside WaveformPlayer's desktop branch, so these
          // classes need no md: prefixes — the phone never sees this instance.
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 rounded-tile">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-white text-sm">Loading audio...</span>
                  </div>
                </div>
              )}

              {/* ── Waveform canvas ── (px-2 here must match TimeMarkers' inset) */}
              <div
                ref={waveformRef}
                className="w-full overflow-hidden relative group rounded-tile bg-black/15 px-2 py-1"
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
                    activeIndex={activeMarkerIndex}
                  />
                )}
              </div>
            </div>

            {/* Under the waveform rather than hung off its corners. */}
            <div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-white/80">
              <span id="time">{currentTime}</span>
              {activeMarkerIndex != null && timeMarkers.length > 0 && (
                <span className="text-white/65">
                  {t("player.phraseOf", { n: activeMarkerIndex + 1, total: timeMarkers.length })}
                </span>
              )}
              <span id="duration">{duration}</span>
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

          </>
        )}
      </>
    );
  }
);

WaveformDisplay.displayName = "WaveformDisplay";


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