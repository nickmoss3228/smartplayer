import { useParams, Navigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import LevelProgress from '../components/LevelProgress/LevelProgress';
import { getStoryGroup } from '../types/storyGroups';

const Medium = () => {
  const { storySlug } = useParams<{ storySlug: string }>();
  const { getStoryData, refreshStoryProgress, isInitialLoad } = useProgress();

  const slug = storySlug || 'maya';
  const mediumData = getStoryData('medium', slug);
  const storyGroup = storySlug ? getStoryGroup('medium', storySlug) : undefined;

  if (storySlug && !storyGroup) {
    return <Navigate to="/levels/medium" replace />;
  }

  if (isInitialLoad) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <LevelProgress
      difficulty="medium"
      storySlug={slug}
      storyTitle={storyGroup?.title}
      completedLevels={mediumData.completedParts}
      currentLevel={mediumData.currentPart}
      totalLevels={storyGroup?.totalTracks || mediumData.totalParts}
      onRefresh={() => refreshStoryProgress('medium', slug)}
    />
  );
};

export default Medium;