export interface User {
    username: string;
    user: string;
    email: string;
}

export interface OverviewInfo {
  completed: number;
  total: number;
}

export interface OverviewData {
  [difficulty: string]: OverviewInfo;
}

export interface DetailedProgress {
  totalLevels: number;
  completedLevels: number[];
  currentLevel: number;
}

export interface DetailedProgressMap {
  [difficulty: string]: DetailedProgress;
}

export interface RankInfo {
  title: string;
  emoji: string;
}

export type LevelStatus = 'completed' | 'current' | 'available' | 'locked';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ApiHeaders {
  [key: string]: string; // Add index signature
  Authorization: string;
}