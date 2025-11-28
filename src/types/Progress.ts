export interface ProgressStats {
  solved: number;
  total: number;
  percentage: number;
}

export interface DifficultyProgress {
  stats: ProgressStats;
  loading: boolean;
  completedLevels?: number[];
  currentLevel?: number;
  totalLevels?: number;
}

export interface ProgressData {
  easy: DifficultyProgress;
  medium: DifficultyProgress;
  hard: DifficultyProgress;
  initialLoad: boolean;
}

export interface ProgressApiResponse {
  stats: {
    solved: number,
    total: number,
    percentage: number
  }
}

export type DifficultyType = 'easy' | 'medium' | 'hard';

export interface ProgressContextValue {
  progressData: ProgressData;
  refreshProgress: (difficulty: DifficultyType) => Promise<void>;
  isInitialLoad: boolean;
  refreshAllProgress: () => Promise<void>; 
  canAccessLevel: (difficulty: DifficultyType, level: number) => boolean; 
  getHighestUnlockedLevel: (difficulty: DifficultyType) => number; 
}

export interface ProgressProviderProps {
  children: React.ReactNode;
}

export interface EnhancedProgressContextValue extends ProgressContextValue {
  fetchAllProgress: () => Promise<void>;
  isLoading: (difficulty?: DifficultyType) => boolean;
  getProgressByDifficulty: (difficulty: DifficultyType) => DifficultyProgress;
  hasError: boolean;
  errorMessage: string | null;
  clearError: () => void;
}