// helpers/updateAchievements.js
import { users } from "../db/index.js";
import { computeHighestTier, isTierHigher } from "../config/achievements.js";

// Achievement category -> the column holding its tier.
const COLUMN = {
  listeningTime: "achievementListeningTime",
  questionsAnswered: "achievementQuestionsAnswered",
  studyStreak: "achievementStudyStreak",
  storiesListened: "achievementStoriesListened",
  wordsLearned: "achievementWordsLearned",
};

/**
 * Recomputes all achievement tiers for a user and persists any upgrades.
 *
 * Upgrades only, decided against the tiers read a moment earlier — the same
 * read-then-write the Mongo version did. Two concurrent recomputes from
 * different stats could in principle let the lower one land second; tiers are
 * cosmetic and re-derived on the next completion, so this keeps parity rather
 * than adding a guard nothing has needed.
 *
 * @param {string} userId
 * @param {{
 *   listeningSeconds?: number,
 *   questionsAnswered?: number,
 *   currentStreak?: number,
 *   uniqueStoriesCount?: number,
 *   wordsLearned?: number,
 * }} stats
 */
export async function updateAchievements(userId, stats) {
  const user = await users.findById(userId);
  if (!user) return;

  const categories = {
    listeningTime:     stats.listeningSeconds,
    questionsAnswered: stats.questionsAnswered,
    studyStreak:       stats.currentStreak,
    storiesListened:   stats.uniqueStoriesCount,
    wordsLearned:      stats.wordsLearned,
  };

  const updates = {};

  for (const [category, value] of Object.entries(categories)) {
    const newTier = computeHighestTier(category, value);
    const currentTier = user[COLUMN[category]];
    if (isTierHigher(currentTier, newTier)) {
      updates[COLUMN[category]] = newTier;
    }
  }

  if (Object.keys(updates).length > 0) {
    await users.update(userId, updates);
  }
}
