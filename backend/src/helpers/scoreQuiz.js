// helpers/scoreQuiz.js
import { getQuizAnswerKey } from "../config/quizData.js";

/**
 * Grades `answers` (selected option indices, in question order) against an
 * already-resolved answer key. Shared by the static-quizData path below and
 * storyLookup.js's DB-backed-story path, so both grade identically.
 *
 * Returns { correctAnswers, totalQuestions } on success, or null if the key
 * is missing or the submission shape doesn't match it (wrong length).
 */
export function scoreAgainstAnswerKey(answerKey, answers) {
  if (!answerKey) return null;
  if (!Array.isArray(answers) || answers.length !== answerKey.length) return null;

  const correctAnswers = answers.reduce(
    (count, selected, i) => (selected === answerKey[i] ? count + 1 : count),
    0
  );

  return { correctAnswers, totalQuestions: answerKey.length };
}

/**
 * Grades a quiz submission against the authoritative answer key instead of
 * trusting a client-reported score. `answers` must be the array of selected
 * option indices, in question order. Only covers the static quizData.js
 * stories — DB-backed stories go through storyLookup.js's async counterpart.
 *
 * Returns { correctAnswers, totalQuestions } on success, or null if the
 * answer key is unknown or the submission shape doesn't match it (wrong
 * length) — callers should treat null as an invalid request.
 */
export function scoreQuizSubmission(difficulty, storyId, partNumber, answers) {
  return scoreAgainstAnswerKey(getQuizAnswerKey(difficulty, storyId, partNumber), answers);
}
