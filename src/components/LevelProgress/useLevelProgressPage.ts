import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useEntitlements } from '../../context/EntitlementsContext';
import { storyKey } from '../../config/priceCatalog';
import { useCatalog } from '../../context/CatalogContext';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { owns } = useEntitlements();

  // ── Modal state ───────────────────────────────────────────────────────
  const [showCongrats, setShowCongrats] = useState(false);
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<StoryPreview | null>(null);
  // Opens on arrival when the player or a sign-in round trip sent the learner
  // back here to buy — that is the whole point of the trip.
  const [showPaywall, setShowPaywall] = useState(
    () => Boolean((location.state as { openPaywall?: boolean } | null)?.openPaywall),
  );
  const [lastListenedLevel, setLastListenedLevel] = useState<number | null>(
    () => loadLastListened(props.difficulty ?? 'easy'),
  );

  // Consume the flag, so a reload or a back-navigation does not re-open it.
  useEffect(() => {
    if ((location.state as { openPaywall?: boolean } | null)?.openPaywall) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

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

  // ── Access ────────────────────────────────────────────────────────────
  /**
   * Mirrors accessFor() in backend/src/config/entitlements.js. The server is
   * still the authority — it returns locked parts stripped of audio whatever
   * this says — but the grid has to draw a padlock before any request is made.
   *
   * A story nobody sells is open; an unowned long story opens its first parts;
   * an unowned short story opens a timed preview of part 1.
   *
   * While the paywall is off there IS a "sign up to continue" gate, and it is
   * the only one: a guest keeps the taster, and an account opens the rest.
   */
  const { getCatalogStory, paywallEnabled } = useCatalog();
  const catalogEntry = getCatalogStory(storyKey(difficulty, storySlug));
  // A story the catalog does not list is NOT open. This read `!catalogEntry ||
  // owns(...)`, which called every unlisted story owned — the client half of
  // the same fail-open bug the server had, and what let Story Builder stories
  // play their whole grid for a guest. While the catalog is still loading
  // nothing is known, so nothing is unlocked.
  const storyOwned = catalogEntry
    ? !catalogEntry.paid ||
      owns(difficulty, storySlug) ||
      // Nothing is sold: an account is what opens the catalogue. Without this
      // the grid padlocks a signed-in user out of parts the server will serve,
      // because owns() is false for everyone — nobody has bought anything.
      (!paywallEnabled && Boolean(user))
    : false;
  // The row's own allowance, which may override the length-derived default.
  const allowance =
    catalogEntry && !storyOwned
      ? { freeParts: catalogEntry.freeParts, previewSeconds: catalogEntry.previewSeconds }
      : null;
  const freeParts = allowance ? allowance.freeParts : storyOwned ? Infinity : 0;
  const previewSeconds = allowance ? allowance.previewSeconds : null;

  const isPartLocked = (level: number): boolean =>
    !(level <= freeParts || (previewSeconds !== null && level === 1));

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleLevelCardClick = (level: number) => {
    if (isPartLocked(level)) {
      // While nothing is sold, the only thing standing between this learner and
      // the rest of the story is an account — so ask for one, rather than
      // opening an offer for something that is not for sale. `returnTo` brings
      // them back to this exact grid once they are in.
      if (!paywallEnabled) {
        if (!user) navigate('/login', { state: { returnTo: location.pathname } });
        return;
      }
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
    isPartLocked,
    storyOwned,
    freeParts,
    previewSeconds,
    showPaywall,
    setShowPaywall,
    // modal state
    showCongrats,
    previewLevel,
    previewData,
    // handlers
    handleLevelCardClick,
    handleStartListening,
    handleClosePreview: () => { setPreviewLevel(null); setPreviewData(null); },
    handleCloseCongrats: () => setShowCongrats(false),
    handleNextDifficulty,
  };
}
