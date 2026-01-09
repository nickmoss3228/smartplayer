export type DifficultyType = 'easy' | 'medium' | 'hard' ;

export type LevelStatus = 'completed' | 'current' | 'available' | 'locked';

export interface LevelProgressProps {
  difficulty?: DifficultyType;
  completedLevels?: number[];
  currentLevel?: number;
  totalLevels?: number;
  onRefresh?: () => void;
  onNavigate?: (difficulty: DifficultyType) => void;
  debugMode?: boolean;
}

export interface Theme {
  title: string;
  subtitle: string;
  background: string;
  completedGradient: string;
  completedColor: string;
  currentGradient: string;
  currentColor: string;
  progressGradient: string;
  gradient: string;
}

export interface NavigationState {
  currentIndex: number;
  prevDifficulty: DifficultyType | null;
  nextDifficulty: DifficultyType | null;
}