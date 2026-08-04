// helpers/storyLookup.js
// Bridges the legacy static-file stories (storyRegistry.js/quizData.js) with
// DB-backed stories authored through the admin Story Builder (models/Story.js).
//
// Precedence: whole-story, DB-first. If a *published* Story doc exists for a
// (difficulty, storyId), it is 100% authoritative for that story — metadata,
// every part's quiz, everything — no mixing with the static file. This is
// what makes editing/importing a story in the builder actually take effect.
// An unpublished (draft) doc is invisible here — it never shadows the static
// version, so an in-progress import can't disrupt players. If no published
// doc exists at all, the static files behave exactly as before.
import { storyRegistry } from "../config/storyRegistry.js";
import { getQuizAnswerKey, getPublicQuiz } from "../config/quizData.js";
import { scoreAgainstAnswerKey } from "./scoreQuiz.js";
import { Story } from "../models/Story.js";

function toStoryMeta(story) {
  return {
    storyId: story.storyId,
    storyName: story.storyName,
    characterIcon: story.characterIcon,
    totalParts: story.totalParts,
  };
}

function findDbPart(dbStory, partNumber) {
  return dbStory?.parts.find((p) => p.partNumber === Number(partNumber)) ?? null;
}

// Looks up one story's metadata — published DB doc first, else static registry.
export async function getStoryMeta(difficulty, storyId) {
  const dbStory = await Story.findOne({ difficulty, storyId, published: true }).lean();
  if (dbStory) return toStoryMeta(dbStory);

  return (storyRegistry[difficulty] ?? []).find((s) => s.storyId === storyId) ?? null;
}

// Full roster for a difficulty — every published DB story, plus static
// stories that aren't shadowed by one (no duplicates once a story is
// imported+published) — used by getOverview to list stories a user can
// progress through.
export async function getAllStoryMeta(difficulty) {
  const dbStories = await Story.find({ difficulty, published: true }).lean();
  const dbStoryIds = new Set(dbStories.map((s) => s.storyId));
  const staticStories = (storyRegistry[difficulty] ?? []).filter((s) => !dbStoryIds.has(s.storyId));
  return [...staticStories, ...dbStories.map(toStoryMeta)];
}

// Public quiz (no correctAnswer) for a part — published DB doc first (its
// part.quiz, even if empty — the doc is authoritative once published), else
// static quizData.js.
export async function getPublicQuizAsync(difficulty, storyId, partNumber) {
  const dbStory = await Story.findOne({ difficulty, storyId, published: true }).lean();
  if (dbStory) {
    const part = findDbPart(dbStory, partNumber);
    if (!part || part.quiz.length === 0) return null;
    return part.quiz.map(({ correctAnswer, ...rest }) => rest);
  }

  return getPublicQuiz(difficulty, storyId, partNumber);
}

// Server-only answer key for a part — same precedence as getPublicQuizAsync.
export async function getQuizAnswerKeyAsync(difficulty, storyId, partNumber) {
  const dbStory = await Story.findOne({ difficulty, storyId, published: true }).lean();
  if (dbStory) {
    const part = findDbPart(dbStory, partNumber);
    if (!part || part.quiz.length === 0) return null;
    return part.quiz.map((q) => q.correctAnswer);
  }

  return getQuizAnswerKey(difficulty, storyId, partNumber);
}

// DB-aware counterpart to scoreQuiz.js's scoreQuizSubmission.
export async function scoreQuizSubmissionAsync(difficulty, storyId, partNumber, answers) {
  const answerKey = await getQuizAnswerKeyAsync(difficulty, storyId, partNumber);
  return scoreAgainstAnswerKey(answerKey, answers);
}
