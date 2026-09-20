// helpers/applyLevelCompletion.js
import { db, progress as progressRepo } from "../db/index.js";

// Applies a single quiz submission to a user's story progress + legacy
// per-difficulty progress. Shared by completeLevel (one real-time submission)
// and migrateGuestProgress (a batch replay of a guest's trial-level history) —
// deliberately excludes streak logic, since that's only meaningful for
// real-time submissions (a batch of historical guest completions has no
// reliable "day" to attribute to a streak).
//
// Both writes happen in ONE transaction. The Mongo version saved the two
// documents separately, so a crash between them left a completed part with no
// recorded result, and each save was itself a read-modify-write that two
// concurrent submissions could interleave. Here the story bookmark advances and
// the result is recorded together, and the set/advance rules run inside the SQL
// (see progress.repo completeStoryPart and upsertLevelResult).
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

  const storyProgress = await db().transaction(async (tx) => {
    // A pass adds the part to the completed set and advances the bookmark if
    // it was the current part; a fail only makes sure the row exists.
    const story = isCompleted
      ? await progressRepo.completeStoryPart(
          { userId, difficulty, storyId, partNumber, totalParts: storyMeta.totalParts },
          tx,
        )
      : await progressRepo.ensureStoryProgress({ userId, difficulty, storyId }, tx);

    // The result is recorded either way, but a part that is already marked
    // completed is never overwritten by a re-attempt — that guard is inside
    // upsertLevelResult's conflict clause, not a check before it.
    const row = await progressRepo.ensure(userId, difficulty, tx);
    await progressRepo.upsertLevelResult(
      { progressId: row.id, storyId, partNumber, completed: isCompleted, correctAnswers, totalQuestions },
      new Date(),
      tx,
    );

    return story;
  });

  return { isCompleted, storyProgress };
}
