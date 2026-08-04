// helpers/storyLookup.js
// Bridges the legacy static-file stories (storyRegistry.js/quizData.js) with
// DB-backed stories authored through the admin Story Builder (models/Story.js).
// Static-first, DB-fallback everywhere: existing stories never touch the DB.
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

// Looks up one story's metadata, static registry first, then published DB stories.
export async function getStoryMeta(difficulty, storyId) {
  const staticMeta = (storyRegistry[difficulty] ?? []).find((s) => s.storyId === storyId);
  if (staticMeta) return staticMeta;

  const dbStory = await Story.findOne({ difficulty, storyId, published: true }).lean();
  return dbStory ? toStoryMeta(dbStory) : null;
}

// Full roster for a difficulty — static stories plus every published DB
// story — used by getOverview to list all stories a user can progress through.
export async function getAllStoryMeta(difficulty) {
  const staticStories = storyRegistry[difficulty] ?? [];
  const dbStories = await Story.find({ difficulty, published: true }).lean();
  return [...staticStories, ...dbStories.map(toStoryMeta)];
}

function findDbPart(dbStory, partNumber) {
  return dbStory?.parts.find((p) => p.partNumber === Number(partNumber)) ?? null;
}

// Public quiz (no correctAnswer) for a part — static quizData.js first, else
// the DB story's part.quiz with correctAnswer stripped, matching getPublicQuiz's shape.
export async function getPublicQuizAsync(difficulty, storyId, partNumber) {
  const staticQuestions = getPublicQuiz(difficulty, storyId, partNumber);
  if (staticQuestions) return staticQuestions;

  const dbStory = await Story.findOne({ difficulty, storyId, published: true }).lean();
  const part = findDbPart(dbStory, partNumber);
  if (!part || part.quiz.length === 0) return null;
  return part.quiz.map(({ correctAnswer, ...rest }) => rest);
}

// Server-only answer key for a part — static quizData.js first, else the DB
// story's part.quiz correctAnswer indices.
export async function getQuizAnswerKeyAsync(difficulty, storyId, partNumber) {
  const staticKey = getQuizAnswerKey(difficulty, storyId, partNumber);
  if (staticKey) return staticKey;

  const dbStory = await Story.findOne({ difficulty, storyId, published: true }).lean();
  const part = findDbPart(dbStory, partNumber);
  if (!part || part.quiz.length === 0) return null;
  return part.quiz.map((q) => q.correctAnswer);
}

// DB-aware counterpart to scoreQuiz.js's scoreQuizSubmission.
export async function scoreQuizSubmissionAsync(difficulty, storyId, partNumber, answers) {
  const answerKey = await getQuizAnswerKeyAsync(difficulty, storyId, partNumber);
  return scoreAgainstAnswerKey(answerKey, answers);
}
