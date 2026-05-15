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
  onQuizComplete?: (results: { correctAnswers: number; totalQuestions: number }) => void;
  isSubmitting?: boolean;
}