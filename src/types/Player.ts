
export type Difficulty = "easy" | "medium" | "hard";

export interface QuizResults {
  correctAnswers: number;
  totalQuestions: number;
  answers: number[];
  [key: string]: unknown;
}

export interface WaveSurferInstance {
  seekTo: (progress: number) => void;
  getDuration: () => number;
  play: () => void;
  pause?: () => void;
}