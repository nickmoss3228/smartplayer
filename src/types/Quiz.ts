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
  onTimeJump?: (time: number) => void;
  questions: QuizQuestion[];
  difficulty: string;
  storyId: string;
  partNumber: number;
  /** The part a pass opens; null on the story's last part. */
  nextPart?: number | null;
  /** Back to the part the quiz is about. */
  onClose: () => void;
  /** Go to the part a pass opened. */
  onNextPart?: () => void;
  onQuizComplete?: (results: { correctAnswers: number; totalQuestions: number; answers: number[] }) => void;
  /** Fired once per answered question, ahead of the aggregate onQuizComplete result. */
  onAnswerResult?: (isCorrect: boolean, questionIndex: number) => void;
  isSubmitting?: boolean;
  /**
   * Play each question by itself as it appears (the default: the quiz is opened
   * by a tap). Off where the quiz just sits on a page, so the first question
   * waits for its button instead of starting while someone scrolls past.
   */
  autoPlay?: boolean;
}