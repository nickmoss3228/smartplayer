import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useProgress } from '../../context/ProgressContext';
import { useLevelProgress } from '../../hooks/useLevelProgress';
import { usePreloadStoryAssets } from '../../hooks/usePreloadStoryAssets';
import {
  loadLastListened,
  saveLastListened,
} from '../../modules/levelprogress/levelprogress.module';
import { getAudioTracksByDifficulty } from '../../modules/audiodata/audioDataByDiffculty';
import { themes } from '../../modules/levelprogress/themes.levelprogress';
import {
  storyPreviewData,
  StoryPreview,
} from '../../modules/storypreview/storyPreviewData';
import { getOrderedComics } from '../Player/Comics/ComicsDisplay';
import { preloadImages } from '../../services/preload';
import { FREE_TRIAL_STORIES } from '../../constants/trial';
import type { LevelProgressProps } from '../../types/LevelProgress';
import type { Difficulty } from '../../types/Player';

// ── Congrats localStorage helpers ─────────────────────────────────────────
const getCongratsKey = (diff: string) => `congrats_shown_${diff}`;
const hasShownCongrats = (diff: string) =>
  localStorage.getItem(getCongratsKey(diff)) === 'true';
const markCongratsShown = (diff: string) =>
  localStorage.setItem(getCongratsKey(diff), 'true');

export function useLevelProgressPage(props: LevelProgressProps) {
  const location = useLocation();
  const { user } = useAuth();

  // ── Modal state ───────────────────────────────────────────────────────
  const [showCongrats, setShowCongrats] = useState(false);
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<StoryPreview | null>(null);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [lastListenedLevel, setLastListenedLevel] = useState<number | null>(
    () => loadLastListened(props.difficulty ?? 'easy'),
  );

  useEffect(() => {
    setLastListenedLevel(loadLastListened(props.difficulty ?? 'easy'));
  }, [props.difficulty]);

  // ── Progress data ─────────────────────────────────────────────────────
  const { getStoryData, isInitialLoad } = useProgress();
  const storyData = getStoryData(
    props.difficulty ?? 'easy',
    props.storySlug ?? 'leo',
  );

  const isLoading = !!user && storyData.loading && isInitialLoad;

  const completedLevels = props.completedLevels?.length
    ? props.completedLevels
    : storyData.completedParts;
  const currentLevel = props.currentLevel ?? storyData.currentPart;

  const audioTracks = getAudioTracksByDifficulty(props.difficulty ?? 'easy');
  const totalLevels =
    props.totalLevels ?? (storyData.totalParts || audioTracks.length);

  const {
    difficulty,
    handleLevelClick,
    goToDifficulty,
    getLevelData,
    progressPercentage,
    navigationState,
  } = useLevelProgress({ ...props, completedLevels, currentLevel, totalLevels });

  const theme = themes[difficulty] || themes.easy;
  const { preloadAudioAssets } = usePreloadStoryAssets(difficulty as Difficulty);
  const comics = getOrderedComics(difficulty);

  const isAllCompleted =
    completedLevels.length === totalLevels ||
    (completedLevels.length === totalLevels - 1 && currentLevel > totalLevels);

  // ── Effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const previewUrls = audioTracks
      .map((track) => {
        const data = storyPreviewData[`${difficulty}-${track.id}`];
        return (data as any)?.coverImage as string | undefined;
      })
      .filter((url): url is string => Boolean(url));
    preloadImages(previewUrls);

    const comicUrls = (comics as any[])
      .map((c) => (typeof c === 'string' ? c : c?.src ?? c?.cover ?? c?.image))
      .filter((url): url is string => typeof url === 'string' && url.length > 0);
    preloadImages(comicUrls);
  }, [difficulty]);

  useEffect(() => {
    if (isAllCompleted && !hasShownCongrats(difficulty)) {
      const timer = setTimeout(() => {
        setShowCongrats(true);
        markCongratsShown(difficulty);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAllCompleted, difficulty]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const isTrialLocked = (level: number): boolean =>
    !user && level > FREE_TRIAL_STORIES;

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleLevelCardClick = (level: number) => {
    if (isTrialLocked(level)) {
      setShowRegisterPrompt(true);
      return;
    }
    setPreviewLevel(level);
    setPreviewData(storyPreviewData[`${difficulty}-${level}`] ?? null);
    preloadAudioAssets(level);
  };

  const handleStartListening = () => {
    if (previewLevel !== null) {
      setLastListenedLevel(previewLevel);
      saveLastListened(difficulty, previewLevel);
      handleLevelClick(previewLevel);
    }
    setPreviewLevel(null);
    setPreviewData(null);
  };

  const handleNextDifficulty = () => {
    setShowCongrats(false);
    if (navigationState.nextDifficulty) {
      goToDifficulty(navigationState.nextDifficulty);
    }
  };

  return {
    // data
    user,
    difficulty,
    theme,
    audioTracks,
    comics,
    completedLevels,
    totalLevels,
    lastListenedLevel,
    progressPercentage,
    navigationState,
    isLoading,
    getLevelData,
    isTrialLocked,
    // modal state
    showCongrats,
    previewLevel,
    previewData,
    showRegisterPrompt,
    // handlers
    handleLevelCardClick,
    handleStartListening,
    handleClosePreview: () => { setPreviewLevel(null); setPreviewData(null); },
    handleCloseCongrats: () => setShowCongrats(false),
    handleNextDifficulty,
    handleCloseRegisterPrompt: () => setShowRegisterPrompt(false),
  };
}