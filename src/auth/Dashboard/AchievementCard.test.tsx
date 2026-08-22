// Render tests for the achievement ladder card.
//
// The card computes rung geometry and state at render time, so these assert the
// things that break quietly when that logic is edited: how far each rung is
// filled per tier state, which one animates, and that the card stays a single
// interactive element whose label describes it without relying on colour.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../locales/en/translation.json";
import AchievementCard from "./AchievementCard";
import { ACHIEVEMENT_CATEGORIES } from "../../config/achievementsConfig";

i18n.use(initReactI18next).init({
  lng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

const byKey = (k: string) => ACHIEVEMENT_CATEGORIES.find((c) => c.key === k)!;

const CASES = [
  { label: "not started", cat: byKey("listeningTime"), value: 0 },
  { label: "mid bronze band", cat: byKey("questionsAnswered"), value: 28 },
  { label: "gold, climbing to platinum", cat: byKey("studyStreak"), value: 44 },
  { label: "one rung from the top", cat: byKey("storiesListened"), value: 24 },
  { label: "all earned", cat: byKey("wordsLearned"), value: 700 },
];

const rendered = CASES.map((c, i) => ({
  ...c,
  html: renderToStaticMarkup(
    <AchievementCard category={c.cat} value={c.value} index={i} onOpen={() => {}} />
  ),
}));

const widths = (html: string) =>
  [...html.matchAll(/width:(\d+)%/g)].map((m) => Number(m[1]));

describe("achievement card", () => {
  it("is a single button, so nothing interactive nests inside it", () => {
    // The rungs were buttons once; a button inside a button is invalid markup
    // and gives the keyboard six stops where the card needs one.
    for (const r of rendered) {
      expect([...r.html.matchAll(/<button/g)], r.label).toHaveLength(1);
    }
  });

  it("always draws five rungs", () => {
    for (const r of rendered) {
      expect(widths(r.html), r.label).toHaveLength(5);
    }
  });

  it("fills rungs to match the tier state", () => {
    expect(widths(rendered[0].html), "not started").toEqual([0, 0, 0, 0, 0]);
    expect(widths(rendered[4].html), "all earned").toEqual([100, 100, 100, 100, 100]);

    const streak = widths(rendered[2].html);
    expect(streak.slice(0, 3), "streak earned rungs").toEqual([100, 100, 100]);
    expect(streak[3]).toBeGreaterThan(0);
    expect(streak[3]).toBeLessThan(100);
    expect(streak[4]).toBe(0);
  });

  it("breathes only on the rung in progress", () => {
    for (const r of rendered) {
      const breathing = [...r.html.matchAll(/animate-tier-breathe/g)].length;
      const expected = r.label === "not started" || r.label === "all earned" ? 0 : 1;
      expect(breathing, r.label).toBe(expected);
    }
    // "not started" has a current rung, but 0% fill — nothing to pulse.
    expect(rendered[0].html).not.toMatch(/animate-tier-breathe/);
  });

  it("staggers the rung delays left to right", () => {
    const delays = [...rendered[2].html.matchAll(/--rung-delay:([\d.]+)ms/g)].map((m) =>
      Number(m[1])
    );
    expect(delays).toHaveLength(5);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });

  it("shows the tier edge and named tier only once something is earned", () => {
    expect(rendered[0].html, "not started").toContain("Not started");
    expect(rendered[0].html, "not started").not.toMatch(/inset-x-0 top-0/);

    expect(rendered[2].html, "gold").toContain("Gold");
    expect(rendered[2].html, "gold").toMatch(/inset-x-0 top-0/);
    expect(rendered[2].html).toContain("#b8860b"); // gold edge + medallion ink
  });

  it("labels the card with tier and position, not colour", () => {
    const label = /aria-label="([^"]+)"/.exec(rendered[2].html)?.[1] ?? "";
    expect(label).toContain("Study Streak");
    expect(label).toContain("Gold");
    expect(label).toContain("3 of 5");
    expect(label).toMatch(/Open for details/);
  });

  it("hides the decorative ladder from assistive tech", () => {
    // The button's own label already states the position; announcing five
    // unlabelled bars after it would just be noise.
    for (const r of rendered) {
      expect(r.html, r.label).toMatch(/aria-hidden="true"/);
    }
  });

  it("reports the finished state instead of a next target", () => {
    expect(rendered[4].html).toContain("All tiers earned");
    expect(rendered[4].html).not.toContain("Next:");
    expect(rendered[2].html).toContain("Next:");
  });
});
