import { useParams, Navigate } from 'react-router-dom';
import { useProgress } from '../../context/ProgressContext';
import LevelProgress from '../../components/LevelProgress';
import { getStoryGroup } from '../../types/storyGroups';
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

  // ← use new context shape
  const { getStoryData, refreshStoryProgress, isInitialLoad } = useProgress();

  // Validate difficulty
  if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty as DifficultySlug)) {
    return <Navigate to="/levels" replace />;
  }

  const diff = difficulty as DifficultySlug;
  const resolvedSlug = storySlug || DEFAULT_SLUGS[diff];
  const storyGroup = storySlug ? getStoryGroup(diff, storySlug) : undefined;

  // Validate story slug if one was provided in the URL
  if (storySlug && !storyGroup) {
    return <Navigate to={`/levels/${diff}`} replace />;
  }

  // Get story-level progress from the new context
  const storyData = getStoryData(diff, resolvedSlug);

  if (isInitialLoad) {
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
      completedLevels={storyData.completedParts}      // ← was diffData.completedLevels
      currentLevel={storyData.currentPart}            // ← was diffData.currentLevel
      totalLevels={storyGroup?.totalTracks ?? storyData.totalParts}  // ← was diffData.totalLevels
      onRefresh={() => refreshStoryProgress(diff, resolvedSlug)}     // ← was refreshProgress(diff)
    />
  );
};

export default DifficultyDetail;