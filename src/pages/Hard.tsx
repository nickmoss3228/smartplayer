import { useProgress } from '../context/ProgressContext';
import LevelProgress from '../pages/LevelProgress';
import LoadingSpinner from '../modules/LoadingSpinner';

const Hard = () => {
  const { progressData, refreshProgress, isInitialLoad } = useProgress();
  const hardData = progressData.hard;

  if (isInitialLoad) {
    return (
      <LoadingSpinner/>
    );
  }

  return (
    <LevelProgress 
      difficulty="hard"
      completedLevels={hardData.completedLevels}
      currentLevel={hardData.currentLevel}
      totalLevels={hardData.totalLevels}
      onRefresh={() => refreshProgress('hard')}
    />
  );
};

export default Hard;