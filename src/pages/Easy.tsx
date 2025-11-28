import { useProgress } from '../context/ProgressContext';
import LevelProgress from '../pages/LevelProgress';
// import LoadingSpinner from '../modules/LoadingSpinner';

const Easy = () => {
  const { progressData, refreshProgress, isInitialLoad } = useProgress();
  const easyData = progressData.easy;

  // Only show loading on initial app load, not on navigation
  if (isInitialLoad) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
      // <LoadingSpinner/>
    );
  }

  return (
    <LevelProgress 
      difficulty="easy"
      completedLevels={easyData.completedLevels}
      currentLevel={easyData.currentLevel}
      totalLevels={easyData.totalLevels}
      onRefresh={() => refreshProgress('easy')}
    />
  );
};

export default Easy;