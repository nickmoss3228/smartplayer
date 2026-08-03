export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  referenceTime: number;
  audio?: {
    fast: string;
    slow: string;
  };
}

export interface QuizProps {
  onTimeJump: (time: number) => void;
  questions: QuizQuestion[];
  onQuizComplete?: (results: { correctAnswers: number; totalQuestions: number; answers: number[] }) => void;
  /** Fired once per answered question, ahead of the aggregate onQuizComplete result. */
  onAnswerResult?: (isCorrect: boolean, questionIndex: number) => void;
  isSubmitting?: boolean;
}