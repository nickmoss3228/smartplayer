import { useProgress } from '../context/ProgressContext';
import LevelProgress from '../pages/LevelProgress';
import LoadingSpinner from '../modules/LoadingSpinner';

const Medium = () => {
  const { progressData, refreshProgress, isInitialLoad } = useProgress();
  const mediumData = progressData.medium;

  if (isInitialLoad) {
    return (
      <LoadingSpinner/>
    );
  }

  return (
    <LevelProgress 
      difficulty="medium"
      completedLevels={mediumData.completedLevels}
      currentLevel={mediumData.currentLevel}
      totalLevels={mediumData.totalLevels}
      onRefresh={() => refreshProgress('medium')}
    />
  );
};

export default Medium;