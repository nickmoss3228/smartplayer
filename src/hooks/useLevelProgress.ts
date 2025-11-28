import { useNavigate } from "react-router";
import { DifficultyType, LevelProgressProps } from '../types/LevelProgress';
import {
    getLevelStatus,
    getLevelIcon,
    getLevelStyles,
    getNavigationState,
    getRouteByDifficulty,
    canClickLevel
} from '../modules/levelprogress.module';

export const useLevelProgress = (props: LevelProgressProps) => {
  const {
    difficulty = "easy" as DifficultyType,
    completedLevels = [],
    currentLevel = 1,
    totalLevels = 10,
    // onRefresh = () => {},
    onNavigate,
    debugMode = false,
  } = props;

  const navigate = useNavigate();
  
  const handleLevelClick = (level: number): void => {
    if (canClickLevel(level, currentLevel, debugMode)) {
      navigate(`/player?difficulty=${difficulty}&level=${level}`);
    }
  };

  const goToDifficulty = (targetDifficulty: DifficultyType | null): void => {
    if (!targetDifficulty) return;
    
    if (onNavigate) {
      onNavigate(targetDifficulty);
      return;
    }
    
    navigate(getRouteByDifficulty(targetDifficulty));
  };

  const getLevelData = (level: number) => {
    const status = getLevelStatus(level, completedLevels, currentLevel, debugMode);
    return {
      status,
      icon: getLevelIcon(level, status),
      styles: getLevelStyles(status, {}), 
    };
  };

  const progressPercentage = (completedLevels.length / totalLevels) * 100;
  const navigationState = getNavigationState(difficulty);

  return {
    difficulty,
    completedLevels,
    currentLevel,
    totalLevels,
    debugMode,
    handleLevelClick,
    goToDifficulty,
    getLevelData,
    progressPercentage,
    navigationState,
  };
};