import { JSX } from 'react';
import { DifficultyType, LevelStatus, NavigationState } from '../../types/LevelProgress';
import { IoCheckmarkCircle, IoPlayCircle } from 'react-icons/io5';

export const DIFFICULTY_ORDER: DifficultyType[] = ['easy', 'medium', 'hard'];

export const getLevelStatus = (
  level: number,
  completedLevels: number[],
  lastListenedLevel: number | null,
  debugMode: boolean
): LevelStatus => {
  if (debugMode) return "incomplete";
  if (completedLevels.includes(level)) return "completed";
  if (level === lastListenedLevel) return "lastListened";
  return "incomplete";
};

export const getLevelIcon = (level: number, status: LevelStatus): JSX.Element => {
  switch (status) {
    case "completed":
      return <IoCheckmarkCircle className="text-white text-3xl" />;
    case "lastListened":
      return <IoPlayCircle className="text-white text-3xl" />;
    default:
      return <span className="text-2xl font-bold">{level.toString()}</span>;
  }
};

export const getLevelStyles = (status: LevelStatus, theme: any): string => {
  switch (status) {
    case "completed":
      return [
        `${theme.completedGradient}`,
        `border-2 ${theme.completedColor}`,
        "text-black/80 shadow-lg cursor-pointer",
        "transition-all duration-300 hover:scale-105 hover:shadow-xl",
      ].join(" ");

    case "lastListened":
      return [
        `${theme.currentGradient}`,
        `border-2 ${theme.currentColor}`,
        "text-black/80 shadow-2xl cursor-pointer",
        "ring-4 ring-white/60 scale-105",
        "transition-all duration-300 hover:scale-110 hover:ring-white/80",
      ].join(" ");

    case "incomplete":
    default:
      return [
        ` ${theme.incompleteGradient}`,
        `border-2 ${theme.incompleteColor}`,
        "text-black/80 shadow-md cursor-pointer",
        "transition-all duration-300 hover:scale-105 hover:shadow-lg",
      ].join(" ");
  }
};

export const getNavigationState = (difficulty: DifficultyType): NavigationState => {
  const currentIndex = Math.max(0, DIFFICULTY_ORDER.indexOf(difficulty));
  const prevDifficulty = currentIndex > 0 ? DIFFICULTY_ORDER[currentIndex - 1] : null;
  const nextDifficulty =
    currentIndex < DIFFICULTY_ORDER.length - 1 ? DIFFICULTY_ORDER[currentIndex + 1] : null;

  return { currentIndex, prevDifficulty, nextDifficulty };
};

export const getRouteByDifficulty = (difficulty: DifficultyType): string => {
  const routes: Record<DifficultyType, string> = {
    easy: "/levels/easy",
    medium: "/levels/medium",
    hard: "/levels/hard",
  };
  return routes[difficulty] || routes.easy;
};

export const canClickLevel = (): boolean => true;

// ─── localStorage helpers ─────────────────────────────────────────────────────

const getLastListenedKey = (difficulty: string) =>
  `last_listened_level_${difficulty}`;

export const loadLastListened = (difficulty: string): number | null => {
  const raw = localStorage.getItem(getLastListenedKey(difficulty));
  const parsed = parseInt(raw ?? "", 10);
  return isNaN(parsed) ? null : parsed;
};

export const saveLastListened = (difficulty: string, level: number): void => {
  localStorage.setItem(getLastListenedKey(difficulty), String(level));
};