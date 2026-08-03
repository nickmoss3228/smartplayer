// No `correctAnswer` field — the client never holds the answer key. Grading
// happens on the backend (see services/quizServices.ts): per-question via
// checkQuizAnswer for immediate feedback, and authoritatively via
// /api/progress/complete when the quiz is submitted.
export interface QuizQuestion {
  question: string;
  options: string[];
  referenceTime: number;
  audio?: {
    fast: string;
    slow: string;
  };
}

export interface QuizProps {
  onTimeJump: (time: number) => void;
  questions: QuizQuestion[];
  difficulty: string;
  storyId: string;
  partNumber: number;
  onQuizComplete?: (results: { correctAnswers: number; totalQuestions: number; answers: number[] }) => void;
  /** Fired once per answered question, ahead of the aggregate onQuizComplete result. */
  onAnswerResult?: (isCorrect: boolean, questionIndex: number) => void;
  isSubmitting?: boolean;
}