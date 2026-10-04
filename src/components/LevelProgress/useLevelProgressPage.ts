import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { partPreviewCard, type StoryPreview } from '../../modules/storypreview/partPreview';
import { preloadImages } from '../../services/preload';
import { fetchPublishedStory, type PublishedStory } from '../../services/storyServices';
import type { LevelProgressProps } from '../../types/LevelProgress';
import { useAppLocale } from '../../types/storyGroups';
import { resolveStory, withLocalizedTitles } from '../../modules/story/resolveStory';
import { castCards as buildCastCards, reachedPart } from '../../modules/cast/castReveal';

/** Just past the preview dialog's 320ms entrance (App.css dialog-panel-in). */
const PRELOAD_AFTER_OPEN_MS = 400;

// ── Congrats localStorage helpers ─────────────────────────────────────────
const getCongratsKey = (diff: string) => `congrats_shown_${diff}`;
const hasShownCongrats = (diff: string) =>
  localStorage.getItem(getCongratsKey(diff)) === 'true';
const markCongratsShown = (diff: string) =>
  localStorage.setItem(getCongratsKey(diff), 'true');

export function useLevelProgressPage(props: LevelProgressProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const locale = useAppLocale();
  const { user } = useAuth();
  const { owns } = useEntitlements();

  // ── Modal state ───────────────────────────────────────────────────────
  const [showCongrats, setShowCongrats] = useState(false);
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
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

  const progressLoading = !!user && storyData.loading && isInitialLoad;

  const completedLevels = props.completedLevels?.length
    ? props.completedLevels
    : storyData.completedParts;
  const currentLevel = props.currentLevel ?? storyData.currentPart;

  const storySlug = props.storySlug ?? 'leo';
  const difficultyKey = props.difficulty ?? 'easy';

  // The published story — every story is one now. Re-asked per user: the
  // server decides which parts come back unlocked from who is asking.
  const [dbStory, setDbStory] = useState<PublishedStory | null>(null);
  const [dbChecked, setDbChecked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setDbStory(null);
    setDbChecked(false);
    const load = async () => {
      // Never throws: a missing or unpublished story comes back as null.
      const story = await fetchPublishedStory(difficultyKey, storySlug);
      if (cancelled) return;
      setDbStory(story);
      setDbChecked(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [difficultyKey, storySlug, user?.id]);

  const resolvedStory = useMemo(
    () => resolveStory(difficultyKey, storySlug, dbStory),
    [difficultyKey, storySlug, dbStory],
  );
  // What each card is called, in the reader's language.
  const audioTracks = useMemo(
    () => withLocalizedTitles(resolvedStory, dbStory, locale),
    [dbStory, resolvedStory, locale],
  );
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
  const { preloadAudioAssets } = usePreloadStoryAssets(audioTracks);
  // Nothing to draw until the server has answered — the same wait Player.tsx
  // makes (dbStoryLoading).
  const isLoading = progressLoading || !dbChecked;
  // Per-track, from the resolver, so a second story on a level can no longer
  // show the level's built-in character's artwork.
  const comics = useMemo(() => audioTracks.map((track) => track.comicUrl ?? ''), [audioTracks]);

  const isAllCompleted =
    completedLevels.length === totalLevels ||
    (completedLevels.length === totalLevels - 1 && currentLevel > totalLevels);

  // ── Effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Warm the grid's comic pages. Keyed on the list itself rather than the
  // level: a published story's pages arrive with the database answer, after
  // the first render, and keying on the level preloaded the static list only.
  useEffect(() => {
    preloadImages(comics.filter(Boolean));
  }, [comics]);

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
  const { getCatalogStory, paywallEnabled, signupWallEnabled } = useCatalog();
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
      // With the sign-up wall off as well, guests get everything too.
      (!paywallEnabled && (Boolean(user) || !signupWallEnabled))
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

  // ── Preview card ──────────────────────────────────────────────────────
  /**
   * The card for the tapped part, derived rather than stored so it follows
   * the language switch. Built from what the admin wrote (partPreview.ts),
   * with the grid's name and picture for the part so the card and the card
   * that was tapped agree.
   */
  const previewData = useMemo<StoryPreview | null>(() => {
    if (previewLevel === null || !dbStory) return null;
    const part = dbStory.parts.find((p) => p.partNumber === previewLevel);
    if (!part) return null;
    const track = audioTracks.find((tr) => tr.id === String(previewLevel));
    return partPreviewCard({
      difficulty,
      story: dbStory,
      part: { ...part, title: part.title?.trim() || track?.title, comicUrl: track?.comicUrl ?? part.comicUrl },
      locale,
      t,
    });
  }, [previewLevel, dbStory, audioTracks, difficulty, locale, t]);

  // ── Cast ──────────────────────────────────────────────────────────────
  // The characters, revealed up to the part this student has reached in THIS
  // story. Recomputed from progress, so finishing a part reveals whoever
  // arrives in the next one without a reload.
  const castCards = useMemo(
    () =>
      buildCastCards(
        dbStory?.cast ?? [],
        reachedPart({ completedParts: completedLevels, currentPart: currentLevel, totalParts: totalLevels }),
        locale,
      ),
    [dbStory, completedLevels, currentLevel, totalLevels, locale],
  );
  // Open sheet: undefined = closed, null = opened from "All", a key = that character.
  const [castFocus, setCastFocus] = useState<string | null | undefined>(undefined);

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
    // Warm the audio only once the preview dialog has finished opening: the
    // preload creates an <audio> element per clip at once, and doing that in
    // the click frame is what made the dialog's entrance stutter on phones.
    window.setTimeout(() => preloadAudioAssets(level), PRELOAD_AFTER_OPEN_MS);
  };

  const handleStartListening = () => {
    if (previewLevel !== null) {
      setLastListenedLevel(previewLevel);
      saveLastListened(difficulty, previewLevel);
      handleLevelClick(previewLevel);
    }
    setPreviewLevel(null);
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
    castCards,
    castFocus,
    // modal state
    showCongrats,
    previewLevel,
    previewData,
    // handlers
    handleLevelCardClick,
    handleStartListening,
    handleClosePreview: () => setPreviewLevel(null),
    handleCloseCongrats: () => setShowCongrats(false),
    handleNextDifficulty,
    handleOpenCast: (key: string | null) => setCastFocus(key),
    handleCloseCast: () => setCastFocus(undefined),
  };
}
