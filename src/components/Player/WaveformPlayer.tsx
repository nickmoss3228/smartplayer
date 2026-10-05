import React, { useRef, useCallback, useEffect, useMemo } from "react";
import { WaveformPlayerProps } from "../../types";
import { useAppSelector } from "../../hooks/hooks";
import { useListeningTimer } from "../../hooks/useListeningTimer";

import { useWavesurferInit } from "./hooks/useWavesurferInit";
import { useSegmentEngine } from "./hooks/useSegmentEngine";
import { usePlayerControls } from "./hooks/usePlayerControls";
import { useVocabAudio } from "./hooks/useVocabAudio";
import { usePlaybackSettings } from "./hooks/usePlaybackSettings";
import { useEnhancedMode } from "./hooks/useEnhancedMode";
import { useMarkerNavigation } from "./hooks/useMarkerNavigation";
import { useTrackReset } from "./hooks/useTrackReset";
import { usePausableModal } from "./hooks/usePausableModal";
import { useVolumeControl } from "./hooks/useVolumeControl";

import HelpModal from "./HelpModal/HelpModal";
import FeedbackModal from "../Feedback/FeedbackModal";
import { WaveformDisplay } from "./WaveformDisplay";
import { PlayerControls } from "./Controls/PlayerControls";
import { VolumeControl } from "./Controls/VolumeControl";
import { VocabularyRow } from "./Vocabulary/VocabularyRow";
import { WordRail } from "./Vocabulary/WordRail";
import ComicsDisplay from "./Comics/ComicsDisplay";
import { useTranslation } from "react-i18next";
import {
  IoChevronForward,
  IoGridOutline,
  IoListOutline,
  IoLockClosedOutline,
  IoVolumeHighOutline,
} from "react-icons/io5";
import type { PracticeKind } from "./Practice/PracticeModal";
import { submitPhraseRepeat } from "../../services/walletServices";
import { useWallet } from "../../context/WalletContext";

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
    comicUrl,
    trackTitle,
    vocabulary,
    phrasalVerbs,
    helpAudioUrls,
    hasListenedFully,
    practices = [],
    onOpenPractice,
    practicesDone = 0,
    learnedWords,
  }) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const userPlaybackRateRef = useRef<number>(1.0);
    const { t } = useTranslation();
    const { setWalletDirect } = useWallet();

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


    // BitPhrase: fired by useSegmentEngine whenever a segment finishes its
    // full auto-repeat cycle. Guests simply don't earn currency yet — no
    // guest-side accrual/migration exists for the wallet (see currency plan).
    // The endpoint returns the updated wallet directly, so push it into the
    // shared cache instead of letting the display go stale until next fetch.
    const handleSegmentRepeatComplete = useCallback((repeatCount: number) => {
      const token = localStorage.getItem("token");
      if (!token) return;
      submitPhraseRepeat(token, repeatCount).then(setWalletDirect).catch(() => {});
    }, [setWalletDirect]);

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

    // Words arrive already resolved, from modules/story/resolveStory.ts. This
    // component used to look them up itself via useTrackVocabulary, which read
    // the STATIC table regardless of whether the story was DB-backed — so the
    // chips here and the Vocab Quiz in Player.tsx could show different word
    // lists for the same track, and editing vocabulary in the Story Builder
    // changed one but not the other.
    const { playVocabWord } = useVocabAudio(trackId);
    const currentVocabulary = vocabulary;
    const currentPhrasalVerbs = phrasalVerbs;

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

    // Help is only ever as good as the per-marker explanation clips behind it.
    // A track with none — a Story Builder story published without them, or a
    // static one whose bucket folder is empty — used to open an empty modal
    // with a dead play button, which reads as a broken feature rather than as
    // an absent one. Grey the button out instead.
    //
    // .filter(Boolean): the array can be present but padded with "" for the
    // markers that were never recorded, and length alone would call that help.
    const hasHelpAudio = (helpAudioUrls ?? []).filter(Boolean).length > 0;

    // Once the part has been heard to the end, one button opens everything
    // there is to do with it — the quiz and the practice games — in the
    // practice window (Practice/PracticeModal.tsx), which also opens by itself
    // the moment the part ends. It used to be one button per game, and a
    // third game no longer fit a phone's width.
    const showPractice = hasListenedFully && practices.length > 0 && onOpenPractice;
    const practiceIcon: Record<PracticeKind, React.ReactNode> = {
      quiz: <IoListOutline key="quiz" size={16} />,
      words: <IoVolumeHighOutline key="words" size={16} />,
      comic: <IoGridOutline key="comic" size={16} />,
    };
    const practiceButton = (
      <button
        type="button"
        onClick={onOpenPractice}
        aria-label={
          practicesDone > 0
            ? t("practice.buttonProgress", { done: practicesDone, total: practices.length })
            : undefined
        }
        className="inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-[3px] border border-white/20 bg-gray-500/25 px-6 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-gray-500/40 active:scale-95"
      >
        <span className="inline-flex gap-1" aria-hidden="true">
          {practices.map((kind) => practiceIcon[kind])}
        </span>
        {t("practice.button")}
        {/* What is left, at a glance: "3" when nothing is done yet, "2/3" after.
            Not green icons — on the easy level's green gradient they vanish. */}
        <span className="rounded-[2px] bg-black/25 px-1.5 font-mono text-[11px] tabular-nums" aria-hidden="true">
          {practicesDone > 0 ? `${practicesDone}/${practices.length}` : practices.length}
        </span>
      </button>
    );

    // ── Desktop pieces ────────────────────────────────────────────────────
    // Stable, so the rail's memoised rows don't redraw on every time tick.
    const playWord = useCallback(
      (_key: string, url: string) => playVocabWord(url),
      [playVocabWord],
    );

    const volumeControl = useMemo(
      () => (
        <VolumeControl
          isMuted={isMuted}
          volume={volume}
          onMuteToggle={handleMuteToggle}
          onVolumeChange={handleVolumeChange}
        />
      ),
      [isMuted, volume, handleMuteToggle, handleVolumeChange],
    );

    // Desktop keeps «Практика» in one place from the start: locked until the
    // part has been heard, then the way into the practice window. (The phone
    // button above still appears only once the part is heard.) A part with
    // nothing to practise shows no card at all.
    const hasPractices = practices.length > 0 && Boolean(onOpenPractice);
    const practiceIcons = practices.map((kind) => practiceIcon[kind]);
    const practiceCard = !hasPractices ? null : hasListenedFully ? (
      <button
        type="button"
        onClick={onOpenPractice}
        className="flex w-full cursor-pointer items-center gap-3.5 rounded-card bg-ink px-4 py-3.5 text-left text-panel-text shadow-lg transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      >
        <span className="inline-flex gap-1.5 text-panel-dim" aria-hidden="true">
          {practiceIcons}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-bold">{t("practice.button")}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-panel-dim">
            {practicesDone > 0
              ? t("practice.cardProgress", { done: practicesDone, total: practices.length })
              : t("practice.cardCount", { count: practices.length })}
          </span>
        </span>
        <IoChevronForward size={18} className="ml-auto shrink-0 text-panel-dim" aria-hidden="true" />
      </button>
    ) : (
      <div
        aria-disabled="true"
        className="flex items-center gap-3.5 rounded-card bg-black/15 px-4 py-3.5 text-white/90"
      >
        <IoLockClosedOutline size={18} className="shrink-0" aria-hidden="true" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-bold">{t("practice.button")}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/70">
            {t("practice.locked")}
          </span>
        </span>
        <span className="ml-auto inline-flex gap-1.5 text-white/60" aria-hidden="true">
          {practiceIcons}
        </span>
      </div>
    );

    const hasRail = currentVocabulary.length + currentPhrasalVerbs.length > 0 || practiceCard !== null;

    return (
      <div className="waveform-overlay h-full min-h-0">
        <div className="md:hidden flex flex-col h-full min-h-0">
          {/* MIDDLE ZONE — scrollable content, no more huge bottom padding.
              justify-between puts any leftover vertical space (tall viewports,
              e.g. iPhone 14+) between the comics block and the vocab+progress-bar
              group below — keeping vocab chips tight against the progress bar
              (easy thumb reach) instead of spreading evenly and pushing them apart.
              Comics still keeps an explicit min-h (overriding the flex-item default
              min-height:auto, which otherwise pins it to its content size) so it can
              shrink first under pressure on short viewports — that's what stops it
              from squeezing the vocab rows/progress bar off-screen — but no longer
              flex-1, so it doesn't force itself to consume the leftover space that
              justify-between needs to push the group down. */}
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-3 px-4 overflow-y-auto">
            <div
              data-tour="tour-comics"
              className="min-h-[56px] max-h-[32vh] flex items-center justify-center py-1"
            >
              <ComicsDisplay
                storyIndex={Number(trackId)}
                src={comicUrl}
                title={trackTitle}
                difficulty={difficulty}
              />
            </div>

            <div className="shrink-0 flex flex-col gap-2">
              {currentVocabulary.length > 0 && (
                <div className="shrink-0" data-tour="tour-vocabulary">
                  <VocabularyRow
                    words={currentVocabulary}
                    onPlay={(_key, audioUrl) => playVocabWord(audioUrl)}
                    volume={isMuted ? 0 : volume}
                    learnedWords={learnedWords}
                  />
                </div>
              )}

              {currentPhrasalVerbs.length > 0 && (
                <div className="shrink-0" data-tour="tour-phrasal-verbs">
                  <VocabularyRow
                    words={currentPhrasalVerbs}
                    onPlay={(_key, audioUrl) => playVocabWord(audioUrl)}
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
              hasHelpAudio={hasHelpAudio}
              onOpenFeedback={feedback.open}
            />

            {/* min-h reserved even when hidden — appearing shouldn't grow this
                zone and shrink everything above it a second time on top of
                the comics-flex change above; total bottom-zone height now
                stays constant whether or not hasListenedFully is true. */}
            <div className="mt-6 flex min-h-[44px] flex-col">{showPractice && practiceButton}</div>
          </div>
        </div>

        {/* ═══════════ DESKTOP LAYOUT (≥ md) ═══════════
            From lg: the player on the left (comic, waveform, controls) and the
            word rail on the right, each fitting the panel's height — the rail's
            list scrolls inside itself, so a long part never runs off screen.
            Between md and lg the two stack and the whole area scrolls. */}
        <div className="hidden md:flex h-full min-h-0 flex-col text-left">
          <div
            className={`flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto lg:grid lg:grid-rows-[minmax(0,1fr)] lg:gap-8 lg:overflow-visible ${
              hasRail
                ? "lg:grid-cols-[minmax(0,1fr)_360px]"
                : "lg:mx-auto lg:w-full lg:max-w-[720px] lg:grid-cols-1"
            }`}
          >
            {/* With a comic the column starts level with the rail; without
                one, the waveform and controls sit in the middle instead of
                hugging the top over empty space. */}
            <div className={`flex shrink-0 flex-col gap-4 lg:min-h-0 ${comicUrl ? "lg:justify-start" : "lg:justify-center"}`}>
              {comicUrl && (
                <div
                  data-tour="tour-comics"
                  className="h-[clamp(120px,20vh,200px)] shrink-0 lg:h-auto lg:min-h-24 lg:max-h-[236px] lg:flex-1 lg:shrink"
                >
                  <ComicsDisplay variant="banner" src={comicUrl} title={trackTitle} />
                </div>
              )}

              <div data-tour="tour-player" className="shrink-0">
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
                  activeMarkerIndex={isEnhancedMode ? currentMarkerIndex : null}
                />
              </div>

              <div data-tour="tour-controls" className="shrink-0">
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
                  layout="desktop"
                  onPrev={handlePrevMarker}
                  onNext={handleNextMarker}
                  canGoPrev={canGoPrev}
                  canGoNext={canGoNext}
                  onOpenHelp={help.open}
                  hasHelpAudio={hasHelpAudio}
                  volumeControl={volumeControl}
                />
              </div>
            </div>

            {hasRail && (
              <aside className="flex min-h-[280px] flex-1 flex-col lg:min-h-0 lg:border-l lg:border-white/25 lg:pl-7">
                <WordRail
                  vocabulary={currentVocabulary}
                  phrasalVerbs={currentPhrasalVerbs}
                  onPlay={playWord}
                  volume={isMuted ? 0 : volume}
                  learnedWords={learnedWords}
                  footer={practiceCard}
                />
              </aside>
            )}
          </div>
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
