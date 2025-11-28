
export type Difficulty = "easy" | "medium" | "hard";

export interface QuizResults {
  correctAnswers: number;
  totalQuestions: number;
  [key: string]: any;
}

export interface WaveSurferInstance {
  seekTo: (progress: number) => void;
  getDuration: () => number;
  play: () => void;
  pause?: () => void;
}