import { describe, it, expect } from "vitest";
import { buildWeeklySeries, niceScale } from "./progressChartData";
import type { DetailedProgressMap } from "../../../types/Dashboard";

/**
 * The weekly series is the only place the dashboard turns stored quiz results
 * into a claim about time, so the cases that matter are the ones where a wrong
 * answer would be *plausible*: a skipped week reading as 0% rather than as a
 * gap, an ungraded row silently counting as a perfect score, or a part from
 * six months ago landing in this week's column.
 */

/** A date at local noon, so the bucket never depends on the runner's timezone. */
const at = (y: number, m: number, d: number) =>
  new Date(y, m - 1, d, 12, 0, 0).toISOString();

const NOW = new Date(2026, 7, 21, 12, 0, 0); // Fri 21 Aug 2026

const mapOf = (
  entries: Partial<
    Record<"easy" | "medium" | "hard", Record<string, {
      completed: boolean;
      correctAnswers: number;
      totalQuestions: number;
      completedAt?: string;
    }>>
  >
): DetailedProgressMap => {
  const out: DetailedProgressMap = {};
  for (const [difficulty, levelResults] of Object.entries(entries)) {
    out[difficulty] = {
      totalLevels: 0,
      completedLevels: [],
      currentLevel: 1,
      levelResults,
    };
  }
  return out;
};

describe("buildWeeklySeries", () => {
  it("reports no data when nothing has been completed", () => {
    const series = buildWeeklySeries(mapOf({}), { now: NOW });

    expect(series.hasData).toBe(false);
    expect(series.totalParts).toBe(0);
    expect(series.overallAccuracy).toBeNull();
    expect(series.weeks).toHaveLength(8);
  });

  it("tolerates a null map (first render, before the fetch resolves)", () => {
    const series = buildWeeklySeries(null, { now: NOW });

    expect(series.hasData).toBe(false);
    expect(series.weeks).toHaveLength(8);
  });

  it("counts a completed part into the current week", () => {
    const series = buildWeeklySeries(
      mapOf({
        easy: {
          "leo:1": {
            completed: true,
            correctAnswers: 7,
            totalQuestions: 10,
            completedAt: at(2026, 8, 21),
          },
        },
      }),
      { now: NOW }
    );

    const current = series.weeks[series.weeks.length - 1];
    expect(current.easy).toBe(1);
    expect(current.total).toBe(1);
    expect(current.accuracy).toBe(70);
    expect(series.totalParts).toBe(1);
  });

  it("leaves a week with no questions as a gap, not a zero", () => {
    const series = buildWeeklySeries(
      mapOf({
        easy: {
          "leo:1": {
            completed: true,
            correctAnswers: 5,
            totalQuestions: 5,
            completedAt: at(2026, 8, 21),
          },
        },
      }),
      { now: NOW }
    );

    // Every week before the current one is untouched.
    const earlier = series.weeks.slice(0, -1);
    expect(earlier.every((w) => w.accuracy === null)).toBe(true);
    expect(earlier.every((w) => w.total === 0)).toBe(true);
  });

  it("ignores parts that were attempted but not completed", () => {
    const series = buildWeeklySeries(
      mapOf({
        medium: {
          "anna:2": {
            completed: false,
            correctAnswers: 1,
            totalQuestions: 10,
            completedAt: at(2026, 8, 20),
          },
        },
      }),
      { now: NOW }
    );

    expect(series.hasData).toBe(false);
    expect(series.weeks[series.weeks.length - 1].total).toBe(0);
  });

  it("ignores completed parts that carry no timestamp", () => {
    // Written before grading shipped: real, but with no position on a time axis.
    const series = buildWeeklySeries(
      mapOf({
        hard: {
          "daniel:3": { completed: true, correctAnswers: 9, totalQuestions: 9 },
        },
      }),
      { now: NOW }
    );

    expect(series.hasData).toBe(false);
    expect(series.totalParts).toBe(0);
    expect(series.overallAccuracy).toBeNull();
  });

  it("stacks the three difficulties within one week", () => {
    const series = buildWeeklySeries(
      mapOf({
        easy: {
          "leo:1": {
            completed: true,
            correctAnswers: 4,
            totalQuestions: 5,
            completedAt: at(2026, 8, 18),
          },
        },
        medium: {
          "anna:1": {
            completed: true,
            correctAnswers: 3,
            totalQuestions: 5,
            completedAt: at(2026, 8, 19),
          },
        },
        hard: {
          "daniel:1": {
            completed: true,
            correctAnswers: 5,
            totalQuestions: 5,
            completedAt: at(2026, 8, 20),
          },
        },
      }),
      { now: NOW }
    );

    const current = series.weeks[series.weeks.length - 1];
    expect([current.easy, current.medium, current.hard]).toEqual([1, 1, 1]);
    expect(current.total).toBe(3);
    expect(current.accuracy).toBe(80); // 12 of 15
  });

  it("keeps an out-of-window part in the lifetime totals but off the chart", () => {
    // Otherwise the summary would quietly disagree with the difficulty cards.
    const series = buildWeeklySeries(
      mapOf({
        easy: {
          "leo:1": {
            completed: true,
            correctAnswers: 10,
            totalQuestions: 10,
            completedAt: at(2026, 1, 5), // ~33 weeks before NOW
          },
          "leo:2": {
            completed: true,
            correctAnswers: 5,
            totalQuestions: 10,
            completedAt: at(2026, 8, 21),
          },
        },
      }),
      { now: NOW }
    );

    expect(series.totalParts).toBe(2);
    expect(series.overallAccuracy).toBe(75); // 15 of 20, lifetime
    expect(series.weeks.reduce((sum, w) => sum + w.total, 0)).toBe(1); // in-window only
  });

  it("honours the window size and ends on the current week", () => {
    const series = buildWeeklySeries(mapOf({}), { now: NOW, weeks: 4 });

    expect(series.weeks).toHaveLength(4);
    // Buckets run oldest -> newest, exactly 7 days apart.
    const days = series.weeks.map((w) => new Date(`${w.weekStart}T00:00:00`).getTime());
    for (let i = 1; i < days.length; i++) {
      expect((days[i] - days[i - 1]) / 86_400_000).toBe(7);
    }
  });

  it("skips unparseable timestamps instead of throwing", () => {
    const series = buildWeeklySeries(
      mapOf({
        easy: {
          "leo:1": {
            completed: true,
            correctAnswers: 1,
            totalQuestions: 1,
            completedAt: "not a date",
          },
        },
      }),
      { now: NOW }
    );

    expect(series.hasData).toBe(false);
  });
});

describe("niceScale", () => {
  it("gives an empty chart a usable axis", () => {
    expect(niceScale(0)).toEqual({ max: 4, ticks: [0, 1, 2, 3, 4] });
  });

  it("always produces whole-number ticks, since parts are countable", () => {
    for (const max of [1, 3, 7, 9, 13, 26, 57, 140]) {
      const { ticks, max: top } = niceScale(max);
      expect(ticks.every(Number.isInteger)).toBe(true);
      expect(top).toBeGreaterThanOrEqual(max);
      expect(ticks[0]).toBe(0);
      expect(ticks[ticks.length - 1]).toBe(top);
    }
  });

  it("keeps the ticks evenly spaced", () => {
    const { ticks } = niceScale(37);
    const step = ticks[1] - ticks[0];
    ticks.forEach((tick, i) => expect(tick).toBe(step * i));
  });
});
