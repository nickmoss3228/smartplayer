import { JSX } from 'react';
import { DifficultyType, LevelStatus, NavigationState } from '../types/LevelProgress';
import { IoCheckmarkCircle, IoPlayCircle, IoLockClosed } from 'react-icons/io5';

export const DIFFICULTY_ORDER: DifficultyType[] = ['easy', 'medium', 'hard'];

export const getLevelStatus = (
  level: number, 
  completedLevels: number[], 
  currentLevel: number, 
  debugMode: boolean
): LevelStatus => {
  if (debugMode) return "available";
  
  if (completedLevels.includes(level)) return "completed";
  if (level === currentLevel) return "current";
  if (level < currentLevel) return "available";
  return "locked";
};

export const getLevelIcon = (level: number, status: LevelStatus): JSX.Element => {
  switch (status) {
    case "completed":
      return <IoCheckmarkCircle className="text-white-500" />;
    case "current":
      return <IoPlayCircle className="text-yellow-500" />;
    case "locked":
      return <IoLockClosed className="text-gray-400" />;
    default:
      return <span>{level.toString()}</span>;
  }
};

export const getLevelStyles = (status: LevelStatus, theme: any): string => {
  const baseClasses = "transition-all duration-500";
  
  switch (status) {
    case "completed":
      return `bg-gradient-to-br ${theme.completedGradient} text-white shadow-lg transform hover:scale-105 cursor-pointer border-2 ${theme.completedColor} ${baseClasses}`;
    case "current":
      return `bg-gradient-to-br ${theme.currentGradient} text-white shadow-lg transform hover:scale-105 cursor-pointer border-2 ${theme.currentColor} animate-pulse ${baseClasses}`;
    case "available":
      return `bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 shadow-md transform hover:scale-105 cursor-pointer border-2 border-gray-200 transition-all duration-300`;
    default:
      return `bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-100 transition-all duration-300`;
  }
};

export const getNavigationState = (difficulty: DifficultyType): NavigationState => {
  const currentIndex = Math.max(0, DIFFICULTY_ORDER.indexOf(difficulty));
  const prevDifficulty = currentIndex > 0 ? DIFFICULTY_ORDER[currentIndex - 1] : null;
  const nextDifficulty = currentIndex < DIFFICULTY_ORDER.length - 1 ? DIFFICULTY_ORDER[currentIndex + 1] : null;
  
  return {
    currentIndex,
    prevDifficulty,
    nextDifficulty
  };
};

export const getRouteByDifficulty = (difficulty: DifficultyType): string => {
  const routes: Record<DifficultyType, string> = {
    easy: "/levels/easy",
    medium: "/levels/medium",
    hard: "/levels/hard"
  };
  
  return routes[difficulty] || routes.easy;
};

export const canClickLevel = (level: number, currentLevel: number, debugMode: boolean): boolean => {
  return debugMode || level <= currentLevel;
};