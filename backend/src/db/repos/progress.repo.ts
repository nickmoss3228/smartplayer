// db/repos/progress.repo.ts
//
// Quiz progress, story progress, and the learned-words set.
//
// Both progress models are ported as they are, overlap included. `progress`
// and `story_progress` genuinely duplicate information — applyLevelCompletion
// .js writes both on every submission — and collapsing them is worth doing,
// but NOT during a storage swap. Two changes at once means a post-cutover bug
// could be either, and separating them afterwards is expensive.

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../client.js";
import { newId } from "../ids.js";
import {
  progress,
  progressLevelResult,
  storyProgress,
  userLearnedWord,
} from "../schema.js";
import type { Tx } from "../client.js";
import type {
  Difficulty,
  Progress,
  ProgressLevelResult,
  StoryProgress,
} from "../schema.js";

// ── progress ────────────────────────────────────────────────────────────────

/**
 * Find or create the (user, difficulty) progress row.
 *
 * ON CONFLICT DO UPDATE rather than DO NOTHING because DO NOTHING returns no
 * row on conflict, which would make this a two-query dance. Setting
 * `updated_at` to itself is a no-op write that gets us RETURNING for free.
 */
export async function ensure(
  userId: string,
  difficulty: Difficulty,
  tx: Tx = db(),
): Promise<Progress> {
  const [row] = await tx
    .insert(progress)
    .values({ id: newId(), userId, difficulty })
    .onConflictDoUpdate({
      target: [progress.userId, progress.difficulty],
      set: { updatedAt: sql`${progress.updatedAt}` },
    })
    .returning();

  if (!row) throw new Error("[progress] ensure wrote no row");
  return row;
}

export async function findFor(
  userId: string,
  difficulty: Difficulty,
  tx: Tx = db(),
): Promise<Progress | null> {
  const [row] = await tx
    .select()
    .from(progress)
    .where(and(eq(progress.userId, userId), eq(progress.difficulty, difficulty)));
  return row ?? null;
}

export async function allFor(userId: string, tx: Tx = db()): Promise<Progress[]> {
  return tx.select().from(progress).where(eq(progress.userId, userId));
}

// ── progress_level_result ───────────────────────────────────────────────────
//
// Was `Progress.levelResults`, a Mongo Map keyed `${storyId}:${partNumber}`.

/**
 * Split an old Map key back into its parts.
 *
 * Splits on the LAST colon: story slugs contain hyphens (news-roland-garros,
 * leo-additional) but never colons, so everything before the final one is the
 * slug. Exported because the ETL needs exactly this rule, and having two
 * copies of it is how the two would come to disagree.
 */
export function parseLevelKey(key: string): { storyId: string; partNumber: number } | null {
  const at = key.lastIndexOf(":");
  // `<= 0` rather than `< 0`: a key of ":1" has a colon but no story.
  if (at <= 0) return null;

  const storyId = key.slice(0, at);
  const tail = key.slice(at + 1);

  // Test the RAW tail against a digit run before coercing. Number("") is 0 and
  // Number(" 3 ") is 3, so a Number.isInteger() check alone accepts "leo:" and
  // files that student's result under part 0 — silently, and unrecoverably
  // once the source database is gone.
  if (!/^\d+$/.test(tail)) return null;

  return { storyId, partNumber: Number(tail) };
}

/** The inverse, for anything still serialising in the old shape. */
export function levelKey(storyId: string, partNumber: number): string {
  return `${storyId}:${partNumber}`;
}

export async function levelResultsFor(
  progressId: string,
  tx: Tx = db(),
): Promise<ProgressLevelResult[]> {
  return tx
    .select()
    .from(progressLevelResult)
    .where(eq(progressLevelResult.progressId, progressId));
}

/**
 * Record one quiz submission.
 *
 * The rule from applyLevelCompletion.js is "only write the result if the part
 * isn't already marked completed, so that re-attempts never overwrite a
 * completed:true entry". In Mongo that was a read, a check, and a write — three
 * steps a concurrent submission can interleave with.
 *
 * Here the guard rides along on the conflict clause: the WHERE applies to the
 * UPDATE branch, so a row that is already completed is left exactly as it was
 * and a failed re-attempt cannot demote a pass.
 */
export async function upsertLevelResult(
  input: {
    progressId: string;
    storyId: string;
    partNumber: number;
    completed: boolean;
    correctAnswers: number;
    totalQuestions: number;
  },
  now = new Date(),
  tx: Tx = db(),
): Promise<void> {
  await tx
    .insert(progressLevelResult)
    .values({
      progressId: input.progressId,
      storyId: input.storyId,
      partNumber: input.partNumber,
      completed: input.completed,
      correctAnswers: input.correctAnswers,
      totalQuestions: input.totalQuestions,
      completedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        progressLevelResult.progressId,
        progressLevelResult.storyId,
        progressLevelResult.partNumber,
      ],
      set: {
        completed: input.completed,
        correctAnswers: input.correctAnswers,
        totalQuestions: input.totalQuestions,
        completedAt: now,
      },
      // The guard. Without it, failing a part you had already passed would
      // erase the pass.
      setWhere: eq(progressLevelResult.completed, false),
    });
}

/**
 * Questions answered, for the questionsAnswered achievement: the question
 * count of every PASSED part, across all difficulties.
 *
 * Passed only — matching countCompletedQuestions() in the Mongo controller.
 * Summing failed attempts too would let a student grind the achievement by
 * failing the same quiz repeatedly.
 */
export async function questionsAnsweredTotal(userId: string, tx: Tx = db()): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`COALESCE(SUM(${progressLevelResult.totalQuestions}), 0)`.mapWith(Number) })
    .from(progressLevelResult)
    .innerJoin(progress, eq(progress.id, progressLevelResult.progressId))
    .where(and(eq(progress.userId, userId), eq(progressLevelResult.completed, true)));
  return row?.n ?? 0;
}

/** Distinct stories with at least one completed part — the storiesListened input. */
export async function uniqueCompletedStoriesCount(userId: string, tx: Tx = db()): Promise<number> {
  // One story_progress row per (user, difficulty, story), so counting rows IS
  // counting distinct stories.
  const [row] = await tx
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(storyProgress)
    .where(and(eq(storyProgress.userId, userId), sql`cardinality(${storyProgress.completedParts}) > 0`));
  return row?.n ?? 0;
}

/**
 * A progress row's results in the shape the API has always returned them:
 * the old Mongo Map, `{ "leo:1": { completed, correctAnswers, ... } }`.
 */
export async function levelResultsMap(
  progressId: string,
  tx: Tx = db(),
): Promise<Record<string, { completed: boolean; correctAnswers: number; totalQuestions: number; completedAt: Date | null }>> {
  const rows = await levelResultsFor(progressId, tx);
  return Object.fromEntries(
    rows.map((r) => [
      levelKey(r.storyId, r.partNumber),
      {
        completed: r.completed,
        correctAnswers: r.correctAnswers,
        totalQuestions: r.totalQuestions,
        completedAt: r.completedAt,
      },
    ]),
  );
}

// ── story_progress ──────────────────────────────────────────────────────────

export async function storyProgressFor(
  userId: string,
  difficulty: Difficulty,
  storyId: string,
  tx: Tx = db(),
): Promise<StoryProgress | null> {
  const [row] = await tx
    .select()
    .from(storyProgress)
    .where(
      and(
        eq(storyProgress.userId, userId),
        eq(storyProgress.difficulty, difficulty),
        eq(storyProgress.storyId, storyId),
      ),
    );
  return row ?? null;
}

export async function allStoryProgressFor(
  userId: string,
  tx: Tx = db(),
): Promise<StoryProgress[]> {
  return tx.select().from(storyProgress).where(eq(storyProgress.userId, userId));
}

/**
 * Make sure a (user, difficulty, story) progress row exists, marking nothing.
 *
 * A failed quiz still records that the student started the story — the Mongo
 * version created and saved the document either way.
 */
export async function ensureStoryProgress(
  input: { userId: string; difficulty: Difficulty; storyId: string },
  tx: Tx = db(),
): Promise<StoryProgress> {
  const [row] = await tx
    .insert(storyProgress)
    .values({ id: newId(), userId: input.userId, difficulty: input.difficulty, storyId: input.storyId })
    .onConflictDoUpdate({
      target: [storyProgress.userId, storyProgress.difficulty, storyProgress.storyId],
      set: { updatedAt: sql`${storyProgress.updatedAt}` },
    })
    .returning();
  if (!row) throw new Error("[progress] ensureStoryProgress wrote no row");
  return row;
}

/**
 * Mark a part complete and advance the bookmark.
 *
 * `array_append` guarded by `NOT (... = ANY ...)` keeps completed_parts a set
 * without reading it first — the SQL equivalent of $addToSet. The sort keeps
 * the array in the order every reader assumes.
 *
 * current_part only advances when the completed part IS the current one and
 * there is a part after it, which is the rule the Mongo version implemented in
 * JavaScript after loading the document.
 */
export async function completeStoryPart(
  input: {
    userId: string;
    difficulty: Difficulty;
    storyId: string;
    partNumber: number;
    totalParts: number;
  },
  tx: Tx = db(),
): Promise<StoryProgress> {
  const { partNumber, totalParts } = input;

  const appended = sql`(
    SELECT ARRAY(
      SELECT DISTINCT unnest(array_append(${storyProgress.completedParts}, ${partNumber}::int))
      ORDER BY 1
    )
  )`;

  const advanced = sql`CASE
    WHEN ${storyProgress.currentPart} = ${partNumber} AND ${partNumber} < ${totalParts}
      THEN ${partNumber} + 1
    ELSE ${storyProgress.currentPart}
  END`;

  const [row] = await tx
    .insert(storyProgress)
    .values({
      id: newId(),
      userId: input.userId,
      difficulty: input.difficulty,
      storyId: input.storyId,
      completedParts: [partNumber],
      currentPart: partNumber === 1 && totalParts > 1 ? 2 : 1,
    })
    .onConflictDoUpdate({
      target: [storyProgress.userId, storyProgress.difficulty, storyProgress.storyId],
      set: { completedParts: appended, currentPart: advanced, updatedAt: new Date() },
    })
    .returning();

  if (!row) throw new Error("[progress] completeStoryPart wrote no row");
  return row;
}

// ── user_learned_word ───────────────────────────────────────────────────────

export async function learnedWords(userId: string, tx: Tx = db()): Promise<string[]> {
  const rows = await tx
    .select({ word: userLearnedWord.word })
    .from(userLearnedWord)
    .where(eq(userLearnedWord.userId, userId));
  return rows.map((r) => r.word);
}

/**
 * Add words to the learned set and report which were genuinely NEW.
 *
 * This is the function that fixes a real bug rather than merely porting one.
 *
 * progress.controller.js currently reads learnedWords, diffs it against the
 * incoming list in JavaScript to count new words, then $addToSets — and mints
 * one BitWord per word the diff called new. Two vocab submissions racing each
 * other both read the same "before" snapshot, both count the same word as new,
 * and the user is paid twice for learning it once. The comment there
 * acknowledges the read exists only because "$addToSet silently no-ops on
 * repeats, so it can't tell us the diff itself".
 *
 * `ON CONFLICT DO NOTHING ... RETURNING` can. It returns exactly the rows it
 * actually inserted, so the count and the write are one atomic step and the
 * second submission is paid nothing.
 *
 * @returns the words that were not already known — mint currency from THIS.
 */
export async function addLearnedWords(
  userId: string,
  words: readonly string[],
  tx: Tx = db(),
): Promise<string[]> {
  const unique = [...new Set(words.map((w) => w.toLowerCase()).filter(Boolean))];
  if (unique.length === 0) return [];

  const inserted = await tx
    .insert(userLearnedWord)
    .values(unique.map((word) => ({ userId, word })))
    .onConflictDoNothing({ target: [userLearnedWord.userId, userLearnedWord.word] })
    .returning({ word: userLearnedWord.word });

  return inserted.map((r) => r.word);
}

export async function learnedWordCount(userId: string, tx: Tx = db()): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(userLearnedWord)
    .where(eq(userLearnedWord.userId, userId));
  return row?.n ?? 0;
}

/** Used by the admin panel when clearing a user's vocab progress. */
export async function removeLearnedWords(
  userId: string,
  words: readonly string[],
  tx: Tx = db(),
): Promise<number> {
  if (words.length === 0) return 0;
  const result = await tx
    .delete(userLearnedWord)
    .where(and(eq(userLearnedWord.userId, userId), inArray(userLearnedWord.word, [...words])));
  return result.rowCount ?? 0;
}
