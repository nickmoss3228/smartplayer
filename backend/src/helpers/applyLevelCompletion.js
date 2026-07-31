// helpers/applyLevelCompletion.js
import { Progress } from "../models/Progress.js";
import { StoryProgress } from "../models/StoryProgress.js";

// Applies a single quiz submission to a user's StoryProgress + legacy
// Progress docs. Shared by completeLevel (one real-time submission) and
// migrateGuestProgress (a batch replay of a guest's trial-level history) —
// deliberately excludes streak logic, since that's only meaningful for
// real-time submissions (a batch of historical guest completions has no
// reliable "day" to attribute to a streak).
export async function applyLevelCompletion({
  userId,
  difficulty,
  storyId,
  partNumber,
  correctAnswers,
  totalQuestions,
  storyMeta,
}) {
  const isCompleted = correctAnswers >= Math.ceil(totalQuestions * 0.7);

  // ── Update StoryProgress ──────────────────────────────────────────────
  let storyProgress = await StoryProgress.findOne({ userId, difficulty, storyId });
  if (!storyProgress) {
    storyProgress = new StoryProgress({
      userId,
      difficulty,
      storyId,
      completedParts: [],
      currentPart: 1,
    });
  }

  if (isCompleted) {
    if (!storyProgress.completedParts.includes(partNumber)) {
      storyProgress.completedParts.push(partNumber);
      storyProgress.completedParts.sort((a, b) => a - b);
    }
    if (
      partNumber === storyProgress.currentPart &&
      partNumber < storyMeta.totalParts
    ) {
      storyProgress.currentPart = partNumber + 1;
    }
  }

  await storyProgress.save();

  // ── Update legacy Progress doc ────────────────────────────────────────
  let progress = await Progress.findOne({ userId, difficulty });
  if (!progress) {
    progress = new Progress({
      userId,
      difficulty,
      completedLevels: [],
      currentLevel: 1,
      levelResults: new Map(),
    });
  }

  // Only write the result if the part isn't already marked completed,
  // so that re-attempts never overwrite a completed:true entry.
  const resultKey = `${storyId}:${partNumber}`;
  const existing = progress.levelResults.get(resultKey);
  if (!existing?.completed) {
    progress.levelResults.set(resultKey, {
      completed: isCompleted,
      correctAnswers,
      totalQuestions,
      completedAt: new Date(),
    });
    await progress.save();
  }

  return { isCompleted, storyProgress };
}
