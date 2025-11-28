import { OverviewData, RankInfo, LevelStatus} from '../types/Dashboard';

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

export const getRank = (progress: number): RankInfo => {
  if (progress >= 90) return { title: 'Advanced', emoji: '👑' };
  if (progress >= 70) return { title: 'Intermediate', emoji: '🏆' };
  if (progress >= 50) return { title: 'Pre-Intermediate', emoji: '🥉' };
  if (progress >= 25) return { title: 'Elementary', emoji: '📚' };
  return { title: 'Beginner', emoji: '🌱' };
};

export const getProgressPercentage = (completed: number, total: number): number => {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

export const getDifficultyIcon = (difficulty: string): string => {
  const icons: Record<string, string> = { 
    easy: '🟢', 
    medium: '🟡', 
    hard: '🔴' 
  };
  return icons[difficulty] || '⚪';
};

export const getDifficultyColor = (difficulty: string): string => {
  const colors: Record<string, string> = { 
    easy: 'bg-green-500', 
    medium: 'bg-yellow-500', 
    hard: 'bg-red-500' 
  };
  return colors[difficulty] || 'bg-gray-500';
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