// Render tests for the achievement detail sheet.
//
// The sheet is the only place the full ladder and the exact remaining amount are
// stated, so these cover the numbers it computes and the dialog semantics that
// make it reachable — both easy to break without noticing.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../locales/en/translation.json";
import AchievementDetailModal from "./AchievementDetailModal";
import { ACHIEVEMENT_CATEGORIES } from "../../config/achievementsConfig";

i18n.use(initReactI18next).init({
  lng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

const byKey = (k: string) => ACHIEVEMENT_CATEGORIES.find((c) => c.key === k)!;

const render = (key: string, value: number) =>
  renderToStaticMarkup(
    <AchievementDetailModal category={byKey(key)} value={value} onClose={() => {}} />
  );

describe("achievement detail modal", () => {
  it("carries dialog semantics and a label that points at its heading", () => {
    const html = render("studyStreak", 44);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');

    const labelledBy = /aria-labelledby="([^"]+)"/.exec(html)?.[1];
    expect(labelledBy).toBeTruthy();
    expect(html).toContain(`id="${labelledBy}"`);
  });

  it("lists every tier, not just the earned ones", () => {
    const html = render("studyStreak", 44);
    for (const tier of ["Bronze", "Silver", "Gold", "Platinum", "Crown"]) {
      expect(html, tier).toContain(tier);
    }
    expect([...html.matchAll(/<li/g)]).toHaveLength(5);
  });

  it("states each tier's condition in words as well as colour", () => {
    const html = render("studyStreak", 44);
    // 3 / 7 / 30 earned, 60 in progress, 100 locked.
    expect([...html.matchAll(/>Earned</g)]).toHaveLength(3);
    expect([...html.matchAll(/>In progress</g)]).toHaveLength(1);
    expect([...html.matchAll(/>Locked</g)]).toHaveLength(1);
  });

  it("shows the exact gap to the next tier, with its unit", () => {
    // Streak 44, next tier is 60 days -> 16 days to go.
    const streak = render("studyStreak", 44);
    expect(streak).toContain("16 days");
    expect(streak).toContain("to go until");
    expect(streak).toContain("Platinum");

    // Questions 28, next tier is 50 -> 22 questions. formatValue would have
    // returned a bare "22" here; the sheet needs the unit.
    const questions = render("questionsAnswered", 28);
    expect(questions).toContain("22 questions");
  });

  it("converts a seconds-based gap into hours and minutes", () => {
    // Listening thresholds are stored in seconds; a raw "3600" would be wrong.
    const html = render("listeningTime", 0);
    expect(html).toContain("1h");
    expect(html).not.toContain("3600");
  });

  it("replaces the gap with the finished state once every tier is earned", () => {
    const html = render("wordsLearned", 700);
    expect(html).toContain("All tiers earned");
    expect(html).not.toContain("to go until");
    expect([...html.matchAll(/>Earned</g)]).toHaveLength(5);
  });

  it("draws a progress bar on the current tier only", () => {
    const partial = render("studyStreak", 44);
    // One percentage-width fill, for the tier in progress.
    expect([...partial.matchAll(/width:\d+%/g)]).toHaveLength(1);

    const finished = render("wordsLearned", 700);
    expect([...finished.matchAll(/width:\d+%/g)]).toHaveLength(0);
  });

  it("counts earned tiers in the ladder heading", () => {
    expect(render("studyStreak", 44)).toContain("3 of 5 earned");
    expect(render("listeningTime", 0)).toContain("0 of 5 earned");
  });
});
