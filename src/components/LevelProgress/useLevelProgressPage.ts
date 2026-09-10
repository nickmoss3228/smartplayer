import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useEntitlements } from '../../context/EntitlementsContext';
import { isPaidStory, storyKey } from '../../config/priceCatalog';
import { useProgress } from '../../context/ProgressContext';
import { useLevelProgress } from '../../hooks/useLevelProgress';
import { usePreloadStoryAssets } from '../../hooks/usePreloadStoryAssets';

import {
  loadLastListened,
  saveLastListened,
} from '../../modules/levelprogress/levelprogress.module';
import { themes } from '../../modules/levelprogress/themes.levelprogress';
import {
  storyPreviewData,
  StoryPreview,
} from '../../modules/storypreview/storyPreviewData';
import { preloadImages } from '../../services/preload';
import { FREE_TRIAL_STORIES } from '../../constants/trial';
import type { LevelProgressProps } from '../../types/LevelProgress';
import type { Difficulty } from '../../types/Player';
import { resolveStory } from '../../modules/story/resolveStory';

// ── Congrats localStorage helpers ─────────────────────────────────────────
const getCongratsKey = (diff: string) => `congrats_shown_${diff}`;
const hasShownCongrats = (diff: string) =>
  localStorage.getItem(getCongratsKey(diff)) === 'true';
const markCongratsShown = (diff: string) =>
  localStorage.setItem(getCongratsKey(diff), 'true');

export function useLevelProgressPage(props: LevelProgressProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { owns, paidPreviewParts } = useEntitlements();

  // ── Modal state ───────────────────────────────────────────────────────
  const [showCongrats, setShowCongrats] = useState(false);
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<StoryPreview | null>(null);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
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

  const storySlug = props.storySlug ?? 'leo';

  // Resolved the same way the player resolves it. This used to call the static
  // track list directly, which returned [] for a DB-backed story — so the grid
  // fell back to generic "Level N" labels for exactly the stories whose names
  // the admin had just edited.
  const resolvedStory = resolveStory(props.difficulty ?? 'easy', storySlug, null);
  const audioTracks = resolvedStory.tracks;
  const totalLevels =
    props.totalLevels ?? (storyData.totalParts || audioTracks.length);

  const {
    difficulty,
    storyTitle,
    handleLevelClick,
    goToDifficulty,
    getLevelData,
    progressPercentage,
    navigationState,
  } = useLevelProgress({ ...props, completedLevels, currentLevel, totalLevels });

  const theme = themes[difficulty] || themes.easy;
const { preloadAudioAssets } = usePreloadStoryAssets(difficulty as Difficulty, storySlug);
  // Per-track, from the resolver, so a second story on a level can no longer
  // show the level's built-in character's artwork.
  const comics = resolvedStory.tracks.map((track) => track.comicUrl ?? '');

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
  /**
   * Why a part is closed, or null if it is open. Two different locks that used
   * to be one boolean:
   *
   *   'trial'   — a signed-out visitor past the free preview. Ask them to make
   *               an account; the starter pack really is free, so it is both
   *               the cheaper ask and the honest one.
   *   'paywall' — signed in, but has not bought this story. Show a price.
   *
   * Mirrors accessFor() in backend/src/config/entitlements.js. The server is
   * still the authority — it returns locked parts stripped of audio whatever
   * this says — but the grid has to draw a padlock before any request is made.
   */
  // Mirrors accessFor() branch for branch, and the order matters.
  //
  // A story nobody sells is free to anyone signed in — including a story the
  // catalog has never heard of, which is what the Story Builder produces until
  // someone prices it. Asking `owns()` first would padlock exactly those,
  // because ownedStories only ever lists the starter pack and real purchases.
  const paid = isPaidStory(storyKey(difficulty, storySlug));
  const storyOwned = paid ? owns(difficulty, storySlug) : Boolean(user);

  // And a guest's preview depends on WHICH story: two parts of a free one (the
  // trial that predates the paywall), but only the paid preview of one that is
  // for sale. Collapsing these to a single number silently shortened the guest
  // trial on every free story.
  const previewParts = storyOwned
    ? Infinity
    : paid
      ? paidPreviewParts
      : FREE_TRIAL_STORIES;

  const lockReasonFor = (level: number): 'trial' | 'paywall' | null => {
    if (storyOwned || level <= previewParts) return null;
    return user ? 'paywall' : 'trial';
  };

  const isTrialLocked = (level: number): boolean => lockReasonFor(level) !== null;

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleLevelCardClick = (level: number) => {
    const reason = lockReasonFor(level);
    if (reason === 'trial') {
      setShowRegisterPrompt(true);
      return;
    }
    if (reason === 'paywall') {
      setShowPaywall(true);
      return;
    }
    setPreviewLevel(level);
    setPreviewData(storyPreviewData[`${difficulty}-${storySlug}-${level}`] ?? null);
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
    storyTitle,
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
    lockReasonFor,
    storyOwned,
    previewParts,
    showPaywall,
    setShowPaywall,
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