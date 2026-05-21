import { useParams } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import LevelProgress from '../pages/LevelProgress';
import { getStoryGroup } from '../types/storyGroups';
import { Navigate } from 'react-router-dom';

const Easy = () => {
  const { storySlug } = useParams<{ storySlug: string }>();
  const { getStoryData, refreshStoryProgress, isInitialLoad } = useProgress();
 const slug = storySlug || 'leo';
  const easyData = getStoryData('easy', slug);
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
      storySlug={slug}
      storyTitle={storyGroup?.title}
      completedLevels={easyData.completedParts}
      currentLevel={easyData.currentPart}
      totalLevels={storyGroup?.totalTracks || easyData.totalParts}
      onRefresh={() => refreshStoryProgress('easy', slug)}
    />
  );
};

export default Easy;