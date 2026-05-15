import { useParams } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import LevelProgress from '../pages/LevelProgress';
import { getStoryGroup } from '../types/storyGroups';
import { Navigate } from 'react-router-dom';

const Hard = () => {
  const { storySlug } = useParams<{ storySlug: string }>();
  const { progressData, refreshProgress, isInitialLoad } = useProgress();
  const hardData = progressData.hard;

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
      storySlug={storySlug || 'daniel'}
      storyTitle={storyGroup?.title}
      completedLevels={hardData.completedLevels}
      currentLevel={hardData.currentLevel}
      totalLevels={storyGroup?.totalTracks || hardData.totalLevels}
      onRefresh={() => refreshProgress('hard')}
    />
  );
};

export default Hard;