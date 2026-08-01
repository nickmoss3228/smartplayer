import React, { useRef, useCallback, useEffect } from "react";
import { WaveformPlayerProps } from "../../types";
import { useAppSelector } from "../../hooks/hooks";
import { useListeningTimer } from "../../hooks/useListeningTimer";

import { useWavesurferInit } from "./hooks/useWavesurferInit";
import { useSegmentEngine } from "./hooks/useSegmentEngine";
import { usePlayerControls } from "./hooks/usePlayerControls";
import { useVocabAudio } from "./hooks/useVocabAudio";
import { usePlaybackSettings } from "./hooks/usePlaybackSettings";
import { useEnhancedMode } from "./hooks/useEnhancedMode";
import { useStoryTitles } from "./hooks/useStoryTitles";
import { useTrackVocabulary } from "./hooks/useTrackVocabulary";
import { useMarkerNavigation } from "./hooks/useMarkerNavigation";
import { useTrackReset } from "./hooks/useTrackReset";
import { usePausableModal } from "./hooks/usePausableModal";
import { useVolumeControl } from "./hooks/useVolumeControl";

import HelpModal from "./HelpModal/HelpModal";
import FeedbackModal from "../Feedback/FeedbackModal";
import { WaveformDisplay } from "./WaveformDisplay";
import { PlayerControls } from "./Controls/PlayerControls";
import { VolumeControl } from "./Controls/VolumeControl";
import { VocabChip } from "./Vocabulary/VocabChip";
import { VocabularyRow } from "./Vocabulary/VocabularyRow";
import ComicsDisplay from "./Comics/ComicsDisplay";
import { useTranslation } from "react-i18next";
import { submitPhraseRepeat } from "../../services/walletServices";

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
    hasListenedFully,
    onOpenQuiz,
    onOpenVocabQuiz,
    learnedWords,
  }) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const userPlaybackRateRef = useRef<number>(1.0);
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

    const { repeatCount, setRepeatCount, isControlledMode, setIsControlledMode } =
      usePlaybackSettings();
    const playbackRateRef = useRef(playbackRate);

    const {
      isEnhancedMode,
      isEnhancedSessionActive,
      setIsEnhancedSessionActive,
      handleToggleEnhancedMode,
    } = useEnhancedMode();

    // ── Wrap onAudioComplete so completion resets the session ─────────────────
    const handleAudioComplete = useCallback(() => {
      setIsEnhancedSessionActive(false);
      onAudioComplete?.();
    }, [onAudioComplete, setIsEnhancedSessionActive]);

    const storyTitles = useStoryTitles(difficulty, storySlug);

    // BitPhrase: fired by useSegmentEngine whenever a segment finishes its
    // full auto-repeat cycle. Guests simply don't earn currency yet — no
    // guest-side accrual/migration exists for the wallet (see currency plan).
    const handleSegmentRepeatComplete = useCallback((repeatCount: number) => {
      const token = localStorage.getItem("token");
      if (!token) return;
      submitPhraseRepeat(token, repeatCount).catch(() => {});
    }, []);

    console.log("[Player] level:", level, "difficulty:", difficulty);

    // Reset marker/time/subtitle state (and the enhanced-mode session) on track change
    useTrackReset(audioUrl, setIsEnhancedSessionActive);

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
      onSegmentRepeatComplete: handleSegmentRepeatComplete,
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
    const { currentVocabulary, currentPhrasalVerbs } = useTrackVocabulary(
      difficulty,
      storySlug,
      trackId,
    );

    const handleVolumeChange = useVolumeControl(wavesurfer);

    const { canGoPrev, canGoNext, handlePrevMarker, handleNextMarker } =
      useMarkerNavigation(currentMarkerIndex, timeMarkers, handleMarkerClick);

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

    const help = usePausableModal(wavesurfer, setIsEnhancedSessionActive);
    const feedback = usePausableModal(wavesurfer, setIsEnhancedSessionActive);

    return (
      <div className="waveform-overlay h-full min-h-0">
        <div className="md:hidden flex flex-col h-full min-h-0">
          {/* MIDDLE ZONE — scrollable content, no more huge bottom padding.
              justify-between puts any leftover vertical space (tall viewports,
              e.g. iPhone 14+) between the comics block and the vocab+progress-bar
              group below — keeping vocab chips tight against the progress bar
              (easy thumb reach) instead of spreading evenly and pushing them apart.
              Has no effect once content overflows (shorter viewports keep
              scrolling as before). */}
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-3 px-4 overflow-y-auto">
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

            <div className="shrink-0 flex flex-col gap-2">
              {currentVocabulary.length > 0 && (
                <div className="shrink-0" data-tour="tour-vocabulary">
                  <VocabularyRow
                    words={currentVocabulary}
                    onPlay={(fileName) => playVocabWord(fileName, "vocab")}
                    volume={isMuted ? 0 : volume}
                    learnedWords={learnedWords}
                  />
                </div>
              )}

              {currentPhrasalVerbs.length > 0 && (
                <div className="shrink-0" data-tour="tour-phrasal-verbs">
                  <VocabularyRow
                    words={currentPhrasalVerbs}
                    onPlay={(fileName) => playVocabWord(fileName, "phrasal")}
                    volume={isMuted ? 0 : volume}
                    learnedWords={learnedWords}
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
              onOpenHelp={help.open}
              onOpenFeedback={feedback.open}
            />

            {hasListenedFully && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={onOpenQuiz}
                  className="px-5 py-2 rounded-lg text-sm font-semibold
                   bg-gray-500/25 text-white border border-white/20 shadow-lg backdrop-blur-sm
                   hover:bg-gray-500/40 transition-all duration-200 active:scale-95"
                >
                  {t("player.quiz-incomp")}
                </button>
                <button
                  onClick={onOpenVocabQuiz}
                  className="px-5 py-2 rounded-lg text-sm font-semibold
                   bg-gray-500/25 text-white border border-white/20 shadow-lg backdrop-blur-sm
                   hover:bg-gray-500/40 transition-all duration-200 active:scale-95"
                >
                  {t("player.vocab-quiz")}
                </button>
              </div>
            )}
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
              onOpenHelp={help.open}
            />
            <VolumeControl
              isMuted={isMuted}
              volume={volume}
              onMuteToggle={handleMuteToggle}
              onVolumeChange={handleVolumeChange}
            />
          </div>

          {hasListenedFully && (
            <div className="max-w-[1100px] mx-auto flex justify-center pt-3 gap-3 mt-6">
              <button
                onClick={onOpenQuiz}
                className="px-5 py-2 rounded-lg text-sm font-semibold
                 bg-gray-500/25 text-white border border-white/20 shadow-lg backdrop-blur-sm
                 hover:bg-gray-500/40 transition-all duration-200 active:scale-95"
              >
                {t("player.quiz-incomp")}
              </button>
              <button
                onClick={onOpenVocabQuiz}
                className="px-5 py-2 rounded-lg text-sm font-semibold
                 bg-gray-500/25 text-white border border-white/20 shadow-lg backdrop-blur-sm
                 hover:bg-gray-500/40 transition-all duration-200 active:scale-95"
              >
                {t("player.vocab-quiz")}
              </button>
            </div>
          )}

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
                    isLearned={learnedWords?.has((audioKey ?? word).toLowerCase())}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <HelpModal
          isOpen={help.isOpen}
          onClose={help.close}
          helpAudioUrls={helpAudioUrls}
          timeMarkers={timeMarkers}
          initialMarkerIndex={currentMarkerIndex}
        />

        {feedback.isOpen && <FeedbackModal onClose={feedback.close} />}
      </div>
    );
  },
);

WaveformPlayer.displayName = "WaveformPlayer";
export default WaveformPlayer;
