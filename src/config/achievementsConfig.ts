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

export interface TierStyle {
  /** Fill for an earned rung and the medallion ring. */
  hex: string;
  /** Wash behind the medallion icon. */
  tint: string;
}

/**
 * The five metals, as hex rather than Tailwind classes so the medallion ring,
 * rung fill and tint can be derived from one value.
 *
 * These replaced amber-600 / slate-400 / yellow-400 / cyan-400 / purple-500,
 * which read as a rainbow rather than a ladder: yellow-400 (OKLCH L 0.86) and
 * cyan-400 (0.80) sat outside the legible lightness band and washed out on the
 * white card at 1.53:1 and 1.81:1. Every step here clears the band, and the
 * weakest contrast rose from 1.53:1 to 2.70:1 (gold 3.25, bronze 4.48,
 * crown 4.82).
 *
 * Silver and platinum are deliberately near-neutral — they are meant to read as
 * grey metals. A chroma floor would flag them, and that floor is about hue
 * carrying series identity; here identity comes from fixed rung position plus a
 * written tier name, never from color alone.
 */
export const TIER_COLORS: Record<TierKey, TierStyle> = {
  bronze:   { hex: "#a9673a", tint: "rgba(169, 103, 58, 0.12)" },
  silver:   { hex: "#8e99a6", tint: "rgba(142, 153, 166, 0.16)" },
  gold:     { hex: "#b8860b", tint: "rgba(184, 134, 11, 0.14)" },
  platinum: { hex: "#5fa8b8", tint: "rgba(95, 168, 184, 0.14)" },
  crown:    { hex: "#7c5cd6", tint: "rgba(124, 92, 214, 0.13)" },
};

/** Returns all tiers earned for a given value */
export function getEarnedTiers(
  tiers: AchievementTier[],
  value: number
): AchievementTier[] {
  return tiers.filter((t) => value >= t.threshold);
}

/** The highest tier reached, or null before the first one. Drives the medallion. */
export function getHighestEarnedTier(
  tiers: AchievementTier[],
  value: number
): AchievementTier | null {
  const earned = getEarnedTiers(tiers, value);
  return earned.length > 0 ? earned[earned.length - 1] : null;
}

/**
 * Fill state of each rung on the ladder, oldest tier first.
 *
 * `fill` is 0-100 within that rung only: an earned rung is 100, the rung being
 * worked on carries the partial progress, and locked rungs are 0. This is what
 * lets the card show lifetime position — the old single bar always reset to
 * "progress toward next", so crown and bronze looked alike.
 */
export function getRungFills(
  tiers: AchievementTier[],
  value: number
): { tier: AchievementTier; fill: number; state: "earned" | "current" | "locked" }[] {
  const nextIndex = tiers.findIndex((t) => value < t.threshold);

  return tiers.map((tier, i) => {
    if (nextIndex === -1 || i < nextIndex) {
      return { tier, fill: 100, state: "earned" as const };
    }
    if (i === nextIndex) {
      return { tier, fill: getTierProgress(tiers, value), state: "current" as const };
    }
    return { tier, fill: 0, state: "locked" as const };
  });
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

/**
 * Like formatValue, but always carries its unit — "22 questions", not "22".
 *
 * formatValue returns a bare number for the questions and words categories,
 * which reads fine under a labelled card but not in the detail sheet, where the
 * same string has to stand alone ("22 to go").
 */
export function formatAmount(
  t: TFunction,
  category: AchievementCategory,
  value: number
): string {
  if (category.key === "listeningTime") {
    // Thresholds are stored in seconds; formatValue is the one that knows how to
    // turn a second count into "1h 20m".
    return formatValue(t, category.key, value);
  }
  return t(`dashboard.achievements.units.${category.unitKey}`, { count: value });
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