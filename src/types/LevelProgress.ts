export type DifficultyType = 'easy' | 'medium' | 'hard';

export type LevelStatus = "incomplete" | "completed" | "lastListened";

export interface LevelProgressProps {
  difficulty?: DifficultyType;
  storySlug?: string;      
  storyTitle?: string;        
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
  incompleteGradient: string;
  incompleteColor: string;
}

export interface NavigationState {
  currentIndex: number;
  prevDifficulty: DifficultyType | null;
  nextDifficulty: DifficultyType | null;
}