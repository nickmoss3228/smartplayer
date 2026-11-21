import type { IconType } from 'react-icons';
import {
  IoRibbonOutline,
  IoTrophyOutline,
  IoMedalOutline,
  IoSchoolOutline,
  IoLeafOutline,
  IoTrendingUpOutline,
  IoBarbellOutline,
} from 'react-icons/io5';
import { OverviewData, RankInfo, LevelStatus} from '../../types/Dashboard';

export const getOverallProgress = (overviewData: OverviewData | null): number => {
  if (!overviewData) return 0;
  const totalCompleted = Object.values(overviewData).reduce((sum, diff) => sum + diff.completed, 0);
  const totalLevels = Object.values(overviewData).reduce((sum, diff) => sum + diff.total, 0);
  return totalLevels > 0 ? Math.round((totalCompleted / totalLevels) * 100) : 0;
};

export const getTotalCompleted = (overviewData: OverviewData | null): number => {
  if (!overviewData) return 0;
  return Object.values(overviewData).reduce((sum, diff) => sum + diff.completed, 0);
};

export const getTotalLevels = (overviewData: OverviewData | null): number => {
  if (!overviewData) return 0;
  return Object.values(overviewData).reduce((sum, diff) => sum + diff.total, 0);
};

// Lowest first. The rank card is one ink panel for every rank (design
// manifest: colour means a level or a state) — the icon and the title tell the
// ranks apart.
export const RANKS: RankInfo[] = [
  { title: 'beginner', icon: IoLeafOutline, minProgress: 0 },
  { title: 'elementary', icon: IoSchoolOutline, minProgress: 25 },
  { title: 'preintermediate', icon: IoMedalOutline, minProgress: 50 },
  { title: 'intermediate', icon: IoTrophyOutline, minProgress: 70 },
  { title: 'advanced', icon: IoRibbonOutline, minProgress: 90 },
];

export const getRank = (progress: number): RankInfo =>
  [...RANKS].reverse().find((r) => progress >= r.minProgress) ?? RANKS[0];

/**
 * The fewest parts that reach a rank. Ranks are still decided on the share of
 * parts done (getOverallProgress); this turns a threshold into parts, so the
 * page can say "ещё 3 части" instead of showing a percentage.
 */
export const partsForRank = (minProgress: number, total: number): number => {
  for (let parts = 0; parts <= total; parts++) {
    if (getProgressPercentage(parts, total) >= minProgress) return parts;
  }
  return total;
};

export const getProgressPercentage = (completed: number, total: number): number => {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

export const getDifficultyIcon = (difficulty: string): IconType => {
  const icons: Record<string, IconType> = {
    easy: IoLeafOutline,
    medium: IoTrendingUpOutline,
    hard: IoBarbellOutline,
  };
  return icons[difficulty] || IoLeafOutline;
};

export const getDifficultyColor = (difficulty: string): string => {
  const colors: Record<string, string> = { 
    easy: 'bg-green-500', 
    medium: 'bg-yellow-500', 
    hard: 'bg-red-500' 
  };
  return colors[difficulty] || 'bg-gray-500';
};

export interface DifficultyTheme {
  bg: string;    // solid fill, e.g. progress bars
  soft: string;  // tinted background for icon badges
  text: string;  // icon/text accent color
}

// Full literal class strings (not built via concatenation) so Tailwind's
// JIT content scanner can actually find and generate them. The hues are the
// levels' own (themes.levelprogress.tsx: green / orange / purple); the level's
// name is always written beside them, so colour never carries it alone.
export const getDifficultyTheme = (difficulty: string): DifficultyTheme => {
  const themes: Record<string, DifficultyTheme> = {
    easy:   { bg: 'bg-green-500',  soft: 'bg-green-500/15',  text: 'text-green-600' },
    medium: { bg: 'bg-orange-500', soft: 'bg-orange-500/15', text: 'text-orange-600' },
    hard:   { bg: 'bg-purple-500', soft: 'bg-purple-500/15', text: 'text-purple-600' },
  };
  return themes[difficulty] || { bg: 'bg-gray-500', soft: 'bg-gray-500/15', text: 'text-gray-500' };
};

export const getDifficultyBgColor = (difficulty: string): string => {
  const colors: Record<string, string> = { 
    easy: 'border-green-200 bg-green-50', 
    medium: 'border-yellow-200 bg-yellow-50', 
    hard: 'border-red-200 bg-red-50' 
  };
  return colors[difficulty] || 'border-gray-200 bg-gray-50';
};

export const getLevelStatus = (
  levelNumber: number, 
  completedLevels: number[], 
  currentLevel: number
): LevelStatus => {
  if (completedLevels.includes(levelNumber)) return 'completed';
  if (levelNumber === currentLevel) return 'current';
  if (levelNumber < currentLevel) return 'available';
  return 'locked';
};

export const getLevelStatusColor = (status: LevelStatus): string => {
  const colors: Record<LevelStatus, string> = {
    completed: 'bg-green-500 text-white',
    current: 'bg-blue-500 text-white',
    available: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    locked: 'bg-gray-100 text-gray-400'
  };
  return colors[status];
};