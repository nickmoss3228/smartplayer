import { useParams } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import LevelProgress from '../pages/LevelProgress';
import { getStoryGroup } from '../types/storyGroups';
import { Navigate } from 'react-router-dom';

const Easy = () => {
  const { storySlug } = useParams<{ storySlug: string }>();
  const { progressData, refreshProgress, isInitialLoad } = useProgress();
  const easyData = progressData.easy;

  // Validate the story slug
  const storyGroup = storySlug ? getStoryGroup('easy', storySlug) : undefined;
  
  if (storySlug && !storyGroup) {
    return <Navigate to="/levels/easy" replace />;
  }

  if (isInitialLoad) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <LevelProgress
      difficulty="easy"
      storySlug={storySlug || 'leo'}
      storyTitle={storyGroup?.title}
      completedLevels={easyData.completedLevels}
      currentLevel={easyData.currentLevel}
      totalLevels={storyGroup?.totalTracks || easyData.totalLevels}
      onRefresh={() => refreshProgress('easy')}
    />
  );
};

export default Easy;