import { useParams } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import LevelProgress from '../pages/LevelProgress';
import { getStoryGroup } from '../types/storyGroups';
import { Navigate } from 'react-router-dom';

const Medium = () => {
  const { storySlug } = useParams<{ storySlug: string }>();
  const { progressData, refreshProgress, isInitialLoad } = useProgress();
  const mediumData = progressData.medium;

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
      storySlug={storySlug || 'maya'}
      storyTitle={storyGroup?.title}
      completedLevels={mediumData.completedLevels}
      currentLevel={mediumData.currentLevel}
      totalLevels={storyGroup?.totalTracks || mediumData.totalLevels}
      onRefresh={() => refreshProgress('medium')}
    />
  );
};

export default Medium;