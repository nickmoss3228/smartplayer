import React, { useRef, useState, useEffect, useCallback } from "react";
import { WaveformPlayerProps } from "../../types";
import { useAppSelector, useAppDispatch } from "../../hooks/hooks";
import { trackVocabulary } from "../../modules/vocabulary/Vocabulary";
import { useListeningTimer } from "../../hooks/useListeningTimer";
import {
  setCurrentMarkerIndex,
  setIsPlaying,
  setVolume,
  setIsMuted,
  setCurrentTime,
  setDurationSeconds,
  setDuration,
  setActiveSubtitle,
} from "../../store/playerslice";
import HelpModal from "./HelpModal/HelpModal";
import FeedbackModal from "../Feedback/FeedbackModal";

import { useWavesurferInit } from "./hooks/useWavesurferInit";
import { useSegmentEngine } from "./hooks/useSegmentEngine";
import { usePlayerControls } from "./hooks/usePlayerControls";
import { useVocabAudio } from "./hooks/useVocabAudio";
import { WaveformDisplay } from "./WaveformDisplay";
import { PlayerControls } from "./Controls/PlayerControls";
import { VolumeControl } from "./Controls/VolumeControl";
import { VocabChip } from "./Vocabulary/VocabChip";
import { VocabularyRow } from "./Vocabulary/VocabularyRow";
import ComicsDisplay from "./Comics/ComicsDisplay";
import { trackFolderMap } from "../../modules/vocabulary/Vocabulary";
import { useTranslation } from "react-i18next";

const WaveformPlayer: React.FC<WaveformPlayerProps> = React.memo(
  ({
    audioUrl,
    trackId,
    subtitles,
    timeMarkers,
    onAudioComplete,
    onWavesurferMount,
    level,
    difficulty,
    storySlug,
    helpAudioUrls,
  }) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const userPlaybackRateRef = useRef<number>(1.0);
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const {
      currentMarkerIndex,
      isPlaying,
      volume,
      isMuted,
      playbackRate,
      subtitlesVisible,
      currentTime,
      durationSeconds,
      duration,
      activeSubtitle,
    } = useAppSelector((state) => state.player);

    const [repeatCount, setRepeatCount] = useState(2);
    const [isControlledMode, setIsControlledMode] = useState(false);
    const playbackRateRef = useRef(playbackRate);
    const [isEnhancedMode, setIsEnhancedMode] = useState(true);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isEnhancedSessionActive, setIsEnhancedSessionActive] =
      useState(false);
    // const [isUserPaused, setIsUserPaused] = useState(false);
    // ── Updated toggle — reset session when switching modes ───────────────────
    const handleToggleEnhancedMode = () => {
      setIsEnhancedMode((prev) => !prev);
      setIsEnhancedSessionActive(false); // ← NEW
    };

    // ── Wrap onAudioComplete so completion resets the session ─────────────────
    const handleAudioComplete = useCallback(() => {
      setIsEnhancedSessionActive(false); // ← NEW
      onAudioComplete?.();
    }, [onAudioComplete]);

    // ── inside the component (replaces the old STORY_TITLES constant) ─────────────
    const storyTitles = Object.entries(trackFolderMap[difficulty]?.[storySlug] ?? {}).reduce<
      Record<number, string>
    >((acc, [key, folderName]) => {
      acc[Number(key)] = formatStoryTitle(folderName);
      return acc;
    }, {});

    // ── helper: folder name → readable title ─────────────────────────────────────
    function formatStoryTitle(folderName: string): string {
      return folderName
        .replace(/^\d+\.\s*/, "") // strip "1. " or "1."
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "); // "leo's life" → "Leo's Life"
    }

    console.log("[Player] level:", level, "difficulty:", difficulty);

    const previousAudioUrl = useRef<string | null>(null);
    useEffect(() => {
      if (previousAudioUrl.current !== audioUrl) {
        dispatch(setCurrentMarkerIndex(0));
        dispatch(setIsPlaying(false));
        dispatch(setCurrentTime("0:00"));
        dispatch(setDuration("0:00"));
        dispatch(setDurationSeconds(0));
        dispatch(setActiveSubtitle(""));
        setIsEnhancedSessionActive(false);
        previousAudioUrl.current = audioUrl;
      }
    }, [audioUrl, dispatch]);

    const { wavesurfer, isInitialized, isLoading } = useWavesurferInit({
      audioUrl,
      waveformRef,
      volume,
      isMuted,
      playbackRate,
      onWavesurferMount,
      onAudioComplete: handleAudioComplete,
    });

    const {
      getSegmentBounds,
      currentRepeatRef,
      isSegmentTransitioningRef,
      currentMarkerIndexRef,
      repeatCountRef,
      timeMarkersRef,
      isEnhancedModeRef,
    } = useSegmentEngine({
      wavesurfer,
      isInitialized,
      isPlaying,
      subtitles,
      timeMarkers,
      durationSeconds,
      currentMarkerIndex,
      repeatCount,
      isControlledMode,
      playbackRateRef,
      onAudioComplete: handleAudioComplete,
      isEnhancedMode,
      userPlaybackRateRef,
    });

    const {
      handlePlayPause,
      handleMuteToggle,
      changePlaybackRate,
      handleSetRepeatCount,
      toggleControlledMode,
      handleMarkerClick,
    } = usePlayerControls({
      wavesurfer,
      isInitialized,
      isPlaying,
      isMuted,
      volume,
      playbackRateRef,
      currentMarkerIndexRef,
      repeatCountRef,
      timeMarkersRef,
      currentRepeatRef,
      isSegmentTransitioningRef,
      getSegmentBounds,
      repeatCount,
      setRepeatCount,
      setIsControlledMode,
      isControlledMode,
      isEnhancedModeRef,
      userPlaybackRateRef,
      onEnhancedSessionChange: setIsEnhancedSessionActive,
    });

    const { startTimer, stopTimer } = useListeningTimer();
    useEffect(() => {
      if (isPlaying) startTimer();
      else stopTimer();
    }, [isPlaying, startTimer, stopTimer]);

    const { playVocabWord } = useVocabAudio(trackId, difficulty, storySlug);
   const currentVocabulary =
      trackVocabulary[difficulty]?.[storySlug]?.[String(trackId)] ?? [];

    // console.log("[vocab]", { level, trackId, result: currentVocabulary });

    const handleVolumeChange = (stepped: number) => {
      const normalized = stepped / 10;
      dispatch(setVolume(normalized));
      dispatch(setIsMuted(stepped === 0));
      wavesurfer.current?.setVolume(normalized);
    };

    // Prev/Next segment nav — uses existing handleMarkerClick (expects seconds)
    const canGoPrev = currentMarkerIndex > 0;
    const canGoNext = currentMarkerIndex < timeMarkers.length - 1;

    const getMarkerTime = (idx: number): number => {
      const m = timeMarkers[idx];
      return typeof m === "object" ? m.time : (m as unknown as number);
    };

    const handlePrevMarker = () => {
      if (canGoPrev) handleMarkerClick(getMarkerTime(currentMarkerIndex - 1));
    };
    const handleNextMarker = () => {
      if (canGoNext) handleMarkerClick(getMarkerTime(currentMarkerIndex + 1));
    };

    // Seek WaveSurfer to a 0–1 progress value.
    // Works even though WaveSurfer is mounted on the hidden desktop div.
    const handleSeek = useCallback(
      (progress: number) => wavesurfer.current?.seekTo(progress),
      [], // wavesurfer is a stable ref
    );

    // Poll WaveSurfer's current position — used by MobileProgressBar's RAF loop.
    const getAudioTime = useCallback(
      () => wavesurfer.current?.getCurrentTime() ?? 0,
      [],
    );

    const handleOpenHelp = useCallback(() => {
      // Pause the main track before opening
      if (wavesurfer.current?.isPlaying()) {
        wavesurfer.current.pause();
        setIsEnhancedSessionActive(false);
        // the wavesurfer 'pause' event fires → dispatches setIsPlaying(false) automatically
      }
      setIsHelpOpen(true);
    }, [wavesurfer]);

    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    const handleOpenFeedback = useCallback(() => {
      if (wavesurfer.current?.isPlaying()) {
        wavesurfer.current.pause();
        setIsEnhancedSessionActive(false);
      }
      setIsFeedbackOpen(true);
    }, [wavesurfer]);

    return (
      <div className="waveform-overlay">
  <div className="md:hidden flex flex-col h-full min-h-0">
    {/* MIDDLE ZONE — scrollable content, no more huge bottom padding */}
    <div className="flex-1 min-h-0 flex flex-col gap-7 px-4 overflow-y-auto">
      <div
        data-tour="tour-comics"
        className="max-h-[32vh] flex items-center justify-center py-1"
      >
        <ComicsDisplay
          storyIndex={Number(trackId)}
          title={storyTitles[Number(trackId)]}
          difficulty={difficulty}
        />
      </div>

      {currentVocabulary.length > 0 && (
        <div className="shrink-0" data-tour="tour-vocabulary">
          <VocabularyRow
            words={currentVocabulary}
            onPlay={playVocabWord}
            volume={isMuted ? 0 : volume}
          />
        </div>
      )}

      <div className="shrink-0" data-tour="tour-player">
        <WaveformDisplay
          waveformRef={waveformRef}
          isLoading={isLoading}
          isInitialized={isInitialized}
          currentTime={currentTime}
          duration={duration}
          durationSeconds={durationSeconds}
          timeMarkers={timeMarkers}
          subtitlesVisible={subtitlesVisible}
          activeSubtitle={activeSubtitle}
          onMarkerClick={handleMarkerClick}
          onSeek={handleSeek}
          getAudioTime={getAudioTime}
          isMobile
        />
      </div>
    </div>

    {/* BOTTOM ZONE — normal flex child now, sits right under the content, no more fixed positioning */}
    <div
      className="shrink-0
       px-[clamp(1rem,5vw,2rem)] pt-[clamp(0.25rem,1vh,0.75rem)]
       pb-[max(1rem,env(safe-area-inset-bottom))]
       mt-4
       flex flex-col
       min-h-[180px]"
      data-tour="tour-controls"
    >
      <PlayerControls
        isPlaying={isPlaying}
        isControlledMode={isControlledMode}
        onPlayPause={handlePlayPause}
        onToggleControlledMode={toggleControlledMode}
        repeatCount={repeatCount}
        onRepeatCountChange={handleSetRepeatCount}
        playbackRate={playbackRate}
        onSpeedChange={changePlaybackRate}
        isEnhancedMode={isEnhancedMode}
        onToggleEnhancedMode={handleToggleEnhancedMode}
        isEnhancedSessionActive={isEnhancedSessionActive}
        layout="mobile"
        onPrev={handlePrevMarker}
        onNext={handleNextMarker}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onOpenHelp={handleOpenHelp}
        onOpenFeedback={handleOpenFeedback}
      />
    </div>
  </div>

        {/* ═══════════ DESKTOP LAYOUT (≥ md) — UNCHANGED ═══════════ */}
        <div className="hidden md:block">
          <div data-tour="tour-player">
            <WaveformDisplay
              waveformRef={waveformRef}
              isLoading={isLoading}
              isInitialized={isInitialized}
              currentTime={currentTime}
              duration={duration}
              durationSeconds={durationSeconds}
              timeMarkers={timeMarkers}
              subtitlesVisible={subtitlesVisible}
              activeSubtitle={activeSubtitle}
              onMarkerClick={handleMarkerClick}
            />
          </div>

          <div
            className="max-w-[1100px] bg-white/60 mx-auto p-[35px] rounded-2xl md:p-5 sm:p-4 flex flex-col justify-between items-center gap-5 md:gap-4 sm:gap-3 mt-[15px]"
            data-tour="tour-controls"
          >
            <PlayerControls
              isPlaying={isPlaying}
              isControlledMode={isControlledMode}
              onPlayPause={handlePlayPause}
              onToggleControlledMode={toggleControlledMode}
              repeatCount={repeatCount}
              onRepeatCountChange={handleSetRepeatCount}
              playbackRate={playbackRate}
              onSpeedChange={changePlaybackRate}
              isEnhancedMode={isEnhancedMode}
              onToggleEnhancedMode={handleToggleEnhancedMode}
              isEnhancedSessionActive={isEnhancedSessionActive} // ← NEW
              layout="desktop"
              storyIndex={Number(trackId)}
              comicsTitle={storyTitles[Number(trackId)]}
              difficulty={difficulty}
            />
            <VolumeControl
              isMuted={isMuted}
              volume={volume}
              onMuteToggle={handleMuteToggle}
              onVolumeChange={handleVolumeChange}
            />

            <button
              onClick={handleOpenHelp}
              className="flex items-center gap-2 px-5 py-2 rounded-lg
             bg-red-500 hover:bg-red-600 text-white text-sm font-semibold
             transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            >
              Help!
            </button>
          </div>

          {currentVocabulary.length > 0 && (
            <div
              className="max-w-[1100px] mx-auto px-5 pb-6 mt-2"
              data-tour="tour-vocabulary"
            >
              <p className="text-white/50 text-[10px] uppercase tracking-widest font-semibold font-['Montserrat'] mb-3">
                {t("player.vocabulary")}
              </p>
              <div className="flex flex-wrap gap-2">
                {currentVocabulary.map(({ word, audioKey }) => (
                  <VocabChip
                    key={word}
                    word={word}
                    audioKey={audioKey}
                    onPlay={playVocabWord}
                    volume={isMuted ? 0 : volume}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <HelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          helpAudioUrls={helpAudioUrls}
          timeMarkers={timeMarkers}
          initialMarkerIndex={currentMarkerIndex}
        />

        {isFeedbackOpen && (
          <FeedbackModal onClose={() => setIsFeedbackOpen(false)} />
        )}
      </div>
    );
  },
);

WaveformPlayer.displayName = "WaveformPlayer";
export default WaveformPlayer;
