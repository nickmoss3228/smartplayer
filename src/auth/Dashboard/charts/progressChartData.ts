// auth/Dashboard/charts/progressChartData.ts
//
// Turns the DetailedProgressMap the dashboard already fetches into weekly series.
//
// No new endpoint is involved: GET /api/progress/:difficulty has always returned
// `levelResults` (progress.controller.js), and fetchDetailedProgress has always
// passed it through — the Dashboard just dropped it on the floor as
// `_detailedProgress`. Each entry carries `completedAt`, written by
// helpers/applyLevelCompletion.js, which is what makes a real time series possible.

import type { DetailedProgressMap, Difficulty } from "../../../types/Dashboard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export interface WeeklyPoint {
  /** Monday of the bucket, "YYYY-MM-DD". Stable key for React and the table view. */
  weekStart: string;
  /** Short localized axis label, e.g. "4 Aug". */
  label: string;
  easy: number;
  medium: number;
  hard: number;
  /** Parts completed in the week, across all difficulties. */
  total: number;
  correct: number;
  questions: number;
  /**
   * Percentage 0-100, or null when no questions were answered that week.
   * null is a *gap*, not a zero — the line breaks rather than inventing a plunge
   * to 0% for a week the learner simply did not study.
   */
  accuracy: number | null;
}

export interface ProgressSeries {
  weeks: WeeklyPoint[];
  /** False when nothing has been completed yet — charts show an empty state. */
  hasData: boolean;
  totalParts: number;
  overallAccuracy: number | null;
}

/** Local-time Monday of the week containing `d`, with the time component dropped. */
const startOfWeek = (d: Date): Date => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mondayOffset = (x.getDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0
  x.setDate(x.getDate() - mondayOffset);
  return x;
};

const isoDay = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/**
 * Buckets every completed, timestamped part into the last `weeks` calendar weeks.
 *
 * Entries without `completedAt` (written before grading shipped) are counted in
 * neither series — they have no position on a time axis, and guessing one would
 * be worse than omitting them.
 */
export const buildWeeklySeries = (
  progress: DetailedProgressMap | null | undefined,
  opts: { weeks?: number; locale?: string; now?: Date } = {}
): ProgressSeries => {
  const { weeks = 8, locale = "en", now = new Date() } = opts;

  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });

  // Oldest -> newest, ending with the week in progress.
  const thisWeek = startOfWeek(now);
  const buckets: WeeklyPoint[] = [];
  const indexOfWeek = new Map<string, number>();

  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - i * 7);
    const key = isoDay(d);
    indexOfWeek.set(key, buckets.length);
    buckets.push({
      weekStart: key,
      label: fmt.format(d),
      easy: 0,
      medium: 0,
      hard: 0,
      total: 0,
      correct: 0,
      questions: 0,
      accuracy: null,
    });
  }

  let totalParts = 0;
  let allCorrect = 0;
  let allQuestions = 0;

  for (const difficulty of DIFFICULTIES) {
    const results = progress?.[difficulty]?.levelResults;
    if (!results) continue;

    for (const result of Object.values(results)) {
      if (!result?.completed || !result.completedAt) continue;

      const at = new Date(result.completedAt);
      if (Number.isNaN(at.getTime())) continue;

      // Lifetime totals count every graded part, including ones older than the
      // window, so the summary line never contradicts the difficulty cards.
      totalParts += 1;
      allCorrect += result.correctAnswers ?? 0;
      allQuestions += result.totalQuestions ?? 0;

      const idx = indexOfWeek.get(isoDay(startOfWeek(at)));
      if (idx === undefined) continue; // older than the window

      const bucket = buckets[idx];
      bucket[difficulty] += 1;
      bucket.total += 1;
      bucket.correct += result.correctAnswers ?? 0;
      bucket.questions += result.totalQuestions ?? 0;
    }
  }

  for (const bucket of buckets) {
    bucket.accuracy =
      bucket.questions > 0
        ? Math.round((bucket.correct / bucket.questions) * 100)
        : null;
  }

  return {
    weeks: buckets,
    hasData: totalParts > 0,
    totalParts,
    overallAccuracy:
      allQuestions > 0 ? Math.round((allCorrect / allQuestions) * 100) : null,
  };
};

/**
 * Rounds a maximum up to a clean axis top with five integer ticks, so the y-axis
 * reads 0 / 2 / 4 / 6 / 8 rather than 0 / 1.75 / 3.5 / ... Parts are whole
 * numbers, hence the integer step.
 */
export const niceScale = (max: number): { max: number; ticks: number[] } => {
  if (!Number.isFinite(max) || max <= 0) return { max: 4, ticks: [0, 1, 2, 3, 4] };

  const rawStep = max / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const candidate =
    [1, 2, 2.5, 5, 10].map((s) => s * magnitude).find((s) => s >= rawStep) ??
    10 * magnitude;

  const step = Math.max(1, Math.ceil(candidate));
  return { max: step * 4, ticks: [0, step, step * 2, step * 3, step * 4] };
};
