// helpers/updateAchievements.js
import { User } from "../models/User.js";
import { computeHighestTier, isTierHigher } from "../config/achievements.js";

/**
 * Recomputes all achievement tiers for a user and persists any upgrades.
 *
 * @param {ObjectId} userId
 * @param {{
 *   listeningSeconds: number,
 *   questionsAnswered: number,
 *   currentStreak: number,
 *   uniqueStoriesCount: number,
 * }} stats
 */
export async function updateAchievements(userId, stats) {
  const user = await User.findById(userId).select("achievements");
  if (!user) return;

  const categories = {
    listeningTime:     stats.listeningSeconds,
    questionsAnswered: stats.questionsAnswered,
    studyStreak:       stats.currentStreak,
    storiesListened:   stats.uniqueStoriesCount,
  };

  const updates = {};

  for (const [category, value] of Object.entries(categories)) {
    const newTier = computeHighestTier(category, value);
    const currentTier = user.achievements[category];
    if (isTierHigher(currentTier, newTier)) {
      updates[`achievements.${category}`] = newTier;
    }
  }

  if (Object.keys(updates).length > 0) {
    await User.findByIdAndUpdate(userId, { $set: updates });
  }
}