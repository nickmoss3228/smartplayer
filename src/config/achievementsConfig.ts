// config/achievementConfig.ts
import type { IconType } from "react-icons";
import type { TFunction } from "i18next";
import {
  IoHeadsetOutline,
  IoCheckmarkDoneCircleOutline,
  IoFlameOutline,
  IoLibraryOutline,
  IoLanguageOutline,
} from "react-icons/io5";

export type TierKey = "bronze" | "silver" | "gold" | "platinum" | "crown";

// Which translation.json `dashboard.achievements.units.*` family a category's
// tier thresholds are expressed in (see getTierCount for unit conversion).
export type UnitKey = "hours" | "questions" | "days" | "stories" | "words";

export interface AchievementTier {
  tier: TierKey;
  threshold: number;
}

export interface AchievementCategory {
  key: string;
  icon: IconType;
  tiers: AchievementTier[];
  unitKey: UnitKey;
}

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  {
    key: "listeningTime",
    icon: IoHeadsetOutline,
    unitKey: "hours",
    tiers: [
      { tier: "bronze",   threshold: 3_600 },
      { tier: "silver",   threshold: 18_000 },
      { tier: "gold",     threshold: 36_000 },
      { tier: "platinum", threshold: 108_000 },
      { tier: "crown",    threshold: 360_000 },
    ],
  },
  {
    key: "questionsAnswered",
    icon: IoCheckmarkDoneCircleOutline,
    unitKey: "questions",
    tiers: [
      { tier: "bronze",   threshold: 50 },
      { tier: "silver",   threshold: 150 },
      { tier: "gold",     threshold: 300 },
      { tier: "platinum", threshold: 600 },
      { tier: "crown",    threshold: 1000 },
    ],
  },
  {
    key: "studyStreak",
    icon: IoFlameOutline,
    unitKey: "days",
    tiers: [
      { tier: "bronze",   threshold: 3 },
      { tier: "silver",   threshold: 7 },
      { tier: "gold",     threshold: 30 },
      { tier: "platinum", threshold: 60 },
      { tier: "crown",    threshold: 100 },
    ],
  },
  {
    key: "storiesListened",
    icon: IoLibraryOutline,
    unitKey: "stories",
    tiers: [
      { tier: "bronze",   threshold: 1 },
      { tier: "silver",   threshold: 5 },
      { tier: "gold",     threshold: 10 },
      { tier: "platinum", threshold: 20 },
      { tier: "crown",    threshold: 30 },
    ],
  },
  {
    key: "wordsLearned",
    icon: IoLanguageOutline,
    unitKey: "words",
    tiers: [
      { tier: "bronze",   threshold: 10 },
      { tier: "silver",   threshold: 50 },
      { tier: "gold",     threshold: 150 },
      { tier: "platinum", threshold: 300 },
      { tier: "crown",    threshold: 600 },
    ],
  },
];

export const TIER_ORDER: TierKey[] = [
  "bronze", "silver", "gold", "platinum", "crown",
];

/** Tailwind color classes per tier — used for medal dots and highlights */
export const TIER_COLORS: Record<TierKey, string> = {
  bronze: "bg-amber-600",
  silver: "bg-slate-400",
  gold: "bg-yellow-400",
  platinum: "bg-cyan-400",
  crown: "bg-purple-500",
};

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
export function formatValue(t: TFunction, categoryKey: string, value: number): string {
  if (categoryKey === "listeningTime") {
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    if (h === 0) return t("dashboard.achievements.compactMinutes", { count: m });
    if (m === 0) return t("dashboard.achievements.compactHours", { count: h });
    return t("dashboard.achievements.compactHoursMinutes", { hours: h, minutes: m });
  }
  if (categoryKey === "studyStreak")
    return t("dashboard.achievements.units.days", { count: value });
  if (categoryKey === "storiesListened")
    return t("dashboard.achievements.units.stories", { count: value });
  return `${value}`;
}

/** Converts a raw tier threshold into the count used for its unit label
 *  (listeningTime thresholds are stored in seconds but shown in whole hours). */
function getTierCount(unitKey: UnitKey, threshold: number): number {
  return unitKey === "hours" ? threshold / 3600 : threshold;
}

/** Full "N unit" phrase for a tier threshold, e.g. "5 hours", "150 questions" */
export function getTierLabel(
  t: TFunction,
  category: AchievementCategory,
  threshold: number
): string {
  return t(`dashboard.achievements.units.${category.unitKey}`, {
    count: getTierCount(category.unitKey, threshold),
  });
}