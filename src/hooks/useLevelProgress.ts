import { useNavigate } from "react-router";
import { DifficultyType, LevelProgressProps } from '../types/LevelProgress';
import {
  getLevelStatus,
  getLevelIcon,
  getLevelStyles,
  getNavigationState,
  canClickLevel,
} from '../modules/levelprogress/levelprogress.module';

export const useLevelProgress = (props: LevelProgressProps) => {
  const {
    difficulty = "easy" as DifficultyType,
    storySlug,
    storyTitle,
    completedLevels = [],
    currentLevel = 1,
    totalLevels = 10,
    onNavigate,
    debugMode = false,
  } = props;

  const navigate = useNavigate();

  const handleLevelClick = (level: number): void => {
    if (canClickLevel()) {
      if (storySlug) {
        navigate(`/levels/${difficulty}/${storySlug}/${level}`);
      } else {
        navigate(`/player?difficulty=${difficulty}&level=${level}`);
      }
    }
  };

  const goToStoryList = (): void => {
    navigate(`/levels/${difficulty}`);
  };

  const goToDifficulty = (targetDifficulty: DifficultyType | null): void => {
    if (!targetDifficulty) return;
    if (onNavigate) {
      onNavigate(targetDifficulty);
      return;
    }
    navigate(`/levels/${targetDifficulty}`);
  };

  // lastListenedLevel is passed in from the component (managed via useState + localStorage there)
  const getLevelData = (level: number, lastListenedLevel: number | null) => {
    const status = getLevelStatus(level, completedLevels, lastListenedLevel, debugMode);
    return {
      status,
      icon: getLevelIcon(level, status),
      styles: getLevelStyles(status, {}), // theme is applied directly in LevelProgress.tsx
    };
  };

  const progressPercentage = (completedLevels.length / totalLevels) * 100;
  const navigationState = getNavigationState(difficulty);

  return {
    difficulty,
    storySlug,
    storyTitle,
    completedLevels,
    currentLevel,
    totalLevels,
    debugMode,
    handleLevelClick,
    goToStoryList,
    goToDifficulty,
    getLevelData,
    progressPercentage,
    navigationState,
  };
};