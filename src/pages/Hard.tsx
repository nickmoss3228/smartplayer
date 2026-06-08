import { useParams, Navigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import LevelProgress from '../components/LevelProgress/LevelProgress';
import { getStoryGroup } from '../types/storyGroups';

const Hard = () => {
  const { storySlug } = useParams<{ storySlug: string }>();
  const { getStoryData, refreshStoryProgress, isInitialLoad } = useProgress();

  const slug = storySlug || 'daniel';
  const hardData = getStoryData('hard', slug);
  const storyGroup = storySlug ? getStoryGroup('hard', storySlug) : undefined;

  if (storySlug && !storyGroup) {
    return <Navigate to="/levels/hard" replace />;
  }

  if (isInitialLoad) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <LevelProgress
      difficulty="hard"
      storySlug={slug}
      storyTitle={storyGroup?.title}
      completedLevels={hardData.completedParts}
      currentLevel={hardData.currentPart}
      totalLevels={storyGroup?.totalTracks || hardData.totalParts}
      onRefresh={() => refreshStoryProgress('hard', slug)}
    />
  );
};

export default Hard;