// types/Dashboard.ts
import type { IconType } from "react-icons";

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

/**
 * One graded story part, as stored in Progress.levelResults on the backend and
 * returned verbatim by GET /api/progress/:difficulty. Keyed "storyId:partNumber".
 * completedAt arrives as an ISO string over the wire (it is a Date in Mongo).
 */
export interface LevelResult {
  completed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  completedAt?: string;
}

export interface DetailedProgressMap {
  [difficulty: string]: {
    totalLevels: number;
    completedLevels: number[];
    currentLevel: number;
    /**
     * Optional because documents written before grading was added have no
     * results map; the endpoint has always sent the field when it exists.
     */
    levelResults?: Record<string, LevelResult>;
  };
}

export interface RankInfo {
  title: string;
  icon: IconType;
  /** Tailwind gradient classes for the rank badge background */
  gradient: string;
}

export type LevelStatus = "completed" | "current" | "available" | "locked";

export interface ApiHeaders {
  Authorization: string;
  [key: string]: string; // ← add this line
}

export interface UserProfile {
  username: string;
  email: string;
  nickname: string;
}