// types/Dashboard.ts
export type Difficulty = "easy" | "medium" | "hard";

export interface StoryOverview {
  storyId: string;
  storyName: string;
  characterIcon: string;
  totalParts: number;
  completedParts: number[];
  currentPart: number;
}

export interface DifficultyOverview {
  completed: number;
  total: number;
  stories: StoryOverview[];
}

export type OverviewData = Record<Difficulty, DifficultyOverview>;

export interface DetailedProgressMap {
  [difficulty: string]: {
    totalLevels: number;
    completedLevels: number[];
    currentLevel: number;
  };
}

export interface RankInfo {
  title: string;
  emoji: string;
}

export type LevelStatus = "completed" | "current" | "available" | "locked";

export interface ApiHeaders {
  Authorization: string;
}

export interface UserProfile {
  username: string;
  email: string;
  nickname: string;
  avatar: string;
}