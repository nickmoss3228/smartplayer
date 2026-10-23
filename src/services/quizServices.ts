import axios from "axios";
import { QuizQuestion } from "../types/Quiz";
import { API_BASE } from "./apiClient";


// Public endpoints — no auth token. Guests take quizzes before ever signing
// up, and these never expose the answer key (grading happens server-side).

export const fetchQuizQuestions = async (
  difficulty: string,
  storyId: string,
  partNumber: number,
): Promise<QuizQuestion[]> => {
  const res = await axios.get(
    `${API_BASE}/api/progress/quiz/${difficulty}/${storyId}/${partNumber}`,
  );
  return res.data.questions;
};

/** Whether the pick was right, and which option was — sent once an answer is in. */
export interface AnswerCheck {
  correct: boolean;
  /** Absent from servers older than the reveal; the quiz then only marks the pick. */
  correctOption?: number;
}

export const checkQuizAnswer = async (
  difficulty: string,
  storyId: string,
  partNumber: number,
  questionIndex: number,
  selectedOption: number,
): Promise<AnswerCheck> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/quiz/${difficulty}/${storyId}/${partNumber}/check-answer`,
    { questionIndex, selectedOption },
  );
  return {
    correct: res.data.correct === true,
    correctOption: typeof res.data.correctOption === "number" ? res.data.correctOption : undefined,
  };
};
