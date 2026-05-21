// config/achievements.js  (backend)
export const ACHIEVEMENT_TIERS = {
  listeningTime: [
    { tier: "bronze",   threshold: 3_600,   label: "1 hour",    emoji: "🥉" },
    { tier: "silver",   threshold: 18_000,  label: "5 hours",   emoji: "🥈" },
    { tier: "gold",     threshold: 36_000,  label: "10 hours",  emoji: "🥇" },
    { tier: "platinum", threshold: 108_000, label: "30 hours",  emoji: "🏆" },
    { tier: "crown",    threshold: 360_000, label: "100 hours", emoji: "👑" },
  ],
  questionsAnswered: [
    { tier: "bronze",   threshold: 50,   label: "50 questions",   emoji: "🥉" },
    { tier: "silver",   threshold: 150,  label: "150 questions",  emoji: "🥈" },
    { tier: "gold",     threshold: 300,  label: "300 questions",  emoji: "🥇" },
    { tier: "platinum", threshold: 600,  label: "600 questions",  emoji: "🏆" },
    { tier: "crown",    threshold: 1000, label: "1000 questions", emoji: "👑" },
  ],
  studyStreak: [
    { tier: "bronze",   threshold: 3,   label: "3 days",   emoji: "🥉" },
    { tier: "silver",   threshold: 7,   label: "7 days",   emoji: "🥈" },
    { tier: "gold",     threshold: 30,  label: "30 days",  emoji: "🥇" },
    { tier: "platinum", threshold: 60,  label: "60 days",  emoji: "🏆" },
    { tier: "crown",    threshold: 100, label: "100 days", emoji: "👑" },
  ],
  storiesListened: [
    { tier: "bronze",   threshold: 1,  label: "1 story",   emoji: "🥉" },
    { tier: "silver",   threshold: 5,  label: "5 stories", emoji: "🥈" },
    { tier: "gold",     threshold: 10, label: "10 stories",emoji: "🥇" },
    { tier: "platinum", threshold: 20, label: "20 stories",emoji: "🏆" },
    { tier: "crown",    threshold: 30, label: "30 stories", emoji: "👑" },
  ],
};

const TIER_ORDER = ["bronze", "silver", "gold", "platinum", "crown"];

/**
 * Given a numeric value and a category key, returns the highest
 * tier string the value qualifies for, or null if none.
 */
export function computeHighestTier(category, value) {
  const tiers = ACHIEVEMENT_TIERS[category];
  let highest = null;
  for (const t of tiers) {
    if (value >= t.threshold) highest = t.tier;
  }
  return highest;
}

/**
 * Returns true if newTier is strictly higher than currentTier.
 */
export function isTierHigher(currentTier, newTier) {
  if (!newTier) return false;
  if (!currentTier) return true;
  return TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(currentTier);
}