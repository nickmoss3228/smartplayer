// helpers/scoreQuiz.js
import { getQuizAnswerKey } from "../config/quizData.js";

/**
 * Grades a quiz submission against the authoritative answer key instead of
 * trusting a client-reported score. `answers` must be the array of selected
 * option indices, in question order.
 *
 * Returns { correctAnswers, totalQuestions } on success, or null if the
 * answer key is unknown or the submission shape doesn't match it (wrong
 * length) — callers should treat null as an invalid request.
 */
export function scoreQuizSubmission(difficulty, storyId, partNumber, answers) {
  const answerKey = getQuizAnswerKey(difficulty, storyId, partNumber);
  if (!answerKey) return null;
  if (!Array.isArray(answers) || answers.length !== answerKey.length) return null;

  const correctAnswers = answers.reduce(
    (count, selected, i) => (selected === answerKey[i] ? count + 1 : count),
    0
  );

  return { correctAnswers, totalQuestions: answerKey.length };
}
