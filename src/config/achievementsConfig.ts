// config/achievementConfig.ts
export type TierKey = "bronze" | "silver" | "gold" | "platinum" | "crown";

export interface AchievementTier {
  tier: TierKey;
  threshold: number;
  label: string;
  emoji: string;
}

export interface AchievementCategory {
  key: string;
  title: string;
  icon: string;
  tiers: AchievementTier[];
  unit: string; // used in tooltip, e.g. "questions answered"
}

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  {
    key: "listeningTime",
    title: "Listening Time",
    icon: "🎧",
    unit: "of listening",
    tiers: [
      { tier: "bronze",   threshold: 3_600,   label: "1 hour",    emoji: "🥉" },
      { tier: "silver",   threshold: 18_000,  label: "5 hours",   emoji: "🥈" },
      { tier: "gold",     threshold: 36_000,  label: "10 hours",  emoji: "🥇" },
      { tier: "platinum", threshold: 108_000, label: "30 hours",  emoji: "🏆" },
      { tier: "crown",    threshold: 360_000, label: "100 hours", emoji: "👑" },
    ],
  },
  {
    key: "questionsAnswered",
    title: "Questions Done",
    icon: "❓",
    unit: "questions answered",
    tiers: [
      { tier: "bronze",   threshold: 50,   label: "50 questions",   emoji: "🥉" },
      { tier: "silver",   threshold: 150,  label: "150 questions",  emoji: "🥈" },
      { tier: "gold",     threshold: 300,  label: "300 questions",  emoji: "🥇" },
      { tier: "platinum", threshold: 600,  label: "600 questions",  emoji: "🏆" },
      { tier: "crown",    threshold: 1000, label: "1000 questions", emoji: "👑" },
    ],
  },
  {
    key: "studyStreak",
    title: "Study Streak",
    icon: "🔥",
    unit: "day streak",
    tiers: [
      { tier: "bronze",   threshold: 3,   label: "3 days",   emoji: "🥉" },
      { tier: "silver",   threshold: 7,   label: "7 days",   emoji: "🥈" },
      { tier: "gold",     threshold: 30,  label: "30 days",  emoji: "🥇" },
      { tier: "platinum", threshold: 60,  label: "60 days",  emoji: "🏆" },
      { tier: "crown",    threshold: 100, label: "100 days", emoji: "👑" },
    ],
  },
  {
    key: "storiesListened",
    title: "Stories Heard",
    icon: "📖",
    unit: "stories completed",
    tiers: [
      { tier: "bronze",   threshold: 1,  label: "1 story",    emoji: "🥉" },
      { tier: "silver",   threshold: 5,  label: "5 stories",  emoji: "🥈" },
      { tier: "gold",     threshold: 10, label: "10 stories", emoji: "🥇" },
      { tier: "platinum", threshold: 20, label: "20 stories", emoji: "🏆" },
      { tier: "crown",    threshold: 30, label: "30 stories", emoji: "👑" },
    ],
  },
];

export const TIER_ORDER: TierKey[] = [
  "bronze", "silver", "gold", "platinum", "crown",
];

/** Returns all tiers earned for a given value */
export function getEarnedTiers(
  tiers: AchievementTier[],
  value: number
): AchievementTier[] {
  return tiers.filter((t) => value >= t.threshold);
}

/** Returns the next unearned tier, or null if all earned */
export function getNextTier(
  tiers: AchievementTier[],
  value: number
): AchievementTier | null {
  return tiers.find((t) => value < t.threshold) ?? null;
}

/** 0-100 progress toward the next tier, from the previous tier's threshold */
export function getTierProgress(
  tiers: AchievementTier[],
  value: number
): number {
  const nextIndex = tiers.findIndex((t) => value < t.threshold);
  if (nextIndex === -1) return 100; // all done

  const next = tiers[nextIndex];
  const prevThreshold = nextIndex === 0 ? 0 : tiers[nextIndex - 1].threshold;
  const range = next.threshold - prevThreshold;
  const progress = value - prevThreshold;
  return Math.min(100, Math.round((progress / range) * 100));
}

/** Human-readable value label, e.g. "2h 14m" for listening, "47" for questions */
export function formatValue(categoryKey: string, value: number): string {
  if (categoryKey === "listeningTime") {
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
  if (categoryKey === "studyStreak") return `${value} day${value !== 1 ? "s" : ""}`;
  if (categoryKey === "storiesListened")
    return `${value} stor${value !== 1 ? "ies" : "y"}`;
  return `${value}`;
}