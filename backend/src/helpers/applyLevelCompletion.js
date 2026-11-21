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
//
// `inTransaction(tx, { isCompleted, firstPass })`, when given, runs inside the
// same transaction after both writes, and its return value comes back as
// `extra`. completeLevel pays the quiz reward there, so a crash can no longer
// leave a recorded pass without its payout, or a payout without its pass.
export async function applyLevelCompletion({
  userId,
  difficulty,
  storyId,
  partNumber,
  correctAnswers,
  totalQuestions,
  storyMeta,
  inTransaction,
}) {
  const isCompleted = correctAnswers >= Math.ceil(totalQuestions * 0.7);

  const { storyProgress, firstPass, extra } = await db().transaction(async (tx) => {
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
    // upsertLevelResult's conflict clause, not a check before it. Which is also
    // why "it wrote, and this was a pass" means "first pass of this part".
    const row = await progressRepo.ensure(userId, difficulty, tx);
    const written = await progressRepo.upsertLevelResult(
      { progressId: row.id, storyId, partNumber, completed: isCompleted, correctAnswers, totalQuestions },
      new Date(),
      tx,
    );
    const first = isCompleted && written;

    const more = inTransaction ? await inTransaction(tx, { isCompleted, firstPass: first }) : undefined;
    return { storyProgress: story, firstPass: first, extra: more };
  });

  return { isCompleted, firstPass, storyProgress, extra };
}
