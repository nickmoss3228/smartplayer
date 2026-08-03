import axios from "axios";
import { QuizQuestion } from "../types/Quiz";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

export const checkQuizAnswer = async (
  difficulty: string,
  storyId: string,
  partNumber: number,
  questionIndex: number,
  selectedOption: number,
): Promise<boolean> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/quiz/${difficulty}/${storyId}/${partNumber}/check-answer`,
    { questionIndex, selectedOption },
  );
  return res.data.correct;
};
