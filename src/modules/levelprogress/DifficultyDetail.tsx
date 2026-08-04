import { useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useProgress } from '../../context/ProgressContext';
import { getGuestStoryProgress } from '../../services/guestProgress';
import LevelProgress from '../../components/LevelProgress';
import { useStoryGroup } from '../../types/storyGroups';
import { DifficultySlug } from '../../types/storyGroups';

const VALID_DIFFICULTIES: DifficultySlug[] = ['easy', 'medium', 'hard'];

const DEFAULT_SLUGS: Record<DifficultySlug, string> = {
  easy: 'leo',
  medium: 'maya',
  hard: 'daniel',
};

const SPINNER_COLORS: Record<DifficultySlug, string> = {
  easy: 'border-green-500',
  medium: 'border-yellow-500',
  hard: 'border-red-500',
};

const DifficultyDetail = () => {
  const { difficulty, storySlug } = useParams<{
    difficulty: string;
    storySlug: string;
  }>();
  const { t } = useTranslation();
  const { user } = useAuth();

  // ← use new context shape
  const { getStoryData, refreshStoryProgress, isInitialLoad } = useProgress();

  // Falls back to 'easy' when the URL difficulty is invalid — the hook below
  // must run unconditionally on every render (rules of hooks), so the actual
  // "invalid difficulty" redirect happens after it, once we have a safe diff.
  const diff = (
    difficulty && VALID_DIFFICULTIES.includes(difficulty as DifficultySlug) ? difficulty : 'easy'
  ) as DifficultySlug;
  const resolvedSlug = storySlug || DEFAULT_SLUGS[diff];
  const { storyGroup, loading: storyGroupLoading } = useStoryGroup(diff, resolvedSlug, t);

  // Validate difficulty
  if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty as DifficultySlug)) {
    return <Navigate to="/levels" replace />;
  }

  // Validate story slug if one was provided in the URL — wait for the DB
  // fallback lookup to resolve before concluding it doesn't exist (static
  // stories resolve this synchronously, so they're never affected).
  if (storySlug && !storyGroupLoading && !storyGroup) {
    return <Navigate to={`/levels/${diff}`} replace />;
  }

  // Get story-level progress from the new context — for guests this is
  // always empty (ProgressContext never fetches without a user), so fall
  // back to the locally-saved trial progress instead.
  const storyData = getStoryData(diff, resolvedSlug);
  const guestStoryData = !user ? getGuestStoryProgress(diff, resolvedSlug) : null;

  if (isInitialLoad || (!!storySlug && storyGroupLoading)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div
          className={`animate-spin rounded-full h-32 w-32 border-b-2 ${SPINNER_COLORS[diff]}`}
        />
      </div>
    );
  }

  return (
    <LevelProgress
      difficulty={diff}
      storySlug={resolvedSlug}
      storyTitle={storyGroup?.title}
      completedLevels={guestStoryData ? guestStoryData.completedParts : storyData.completedParts}
      currentLevel={guestStoryData ? guestStoryData.currentPart : storyData.currentPart}
      totalLevels={storyGroup?.totalTracks ?? storyData.totalParts}  // ← was diffData.totalLevels
      onRefresh={() => refreshStoryProgress(diff, resolvedSlug)}     // ← was refreshProgress(diff)
    />
  );
};

export default DifficultyDetail;