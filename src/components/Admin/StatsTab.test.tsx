// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import StatsTab from "./StatsTab";
import type { LearnerStats } from "../../services/adminServices";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// One stable t: a fresh function per render would re-run the tab's load effect forever.
const t = (key: string) => key;
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t }),
}));

const stats: LearnerStats = {
  users: { total: 123, onboarded: 100, banned: 1, newLast7: 7, newLast30: 30, activeLast1: 11, activeLast7: 55, activeLast30: 88 },
  learning: {
    learnersWithAPart: 77,
    partsCompleted: 345,
    quizzesPassed: 300,
    wordsLearned: 999,
    listeningSeconds: 3 * 3600 + 120,
    byDifficulty: { easy: { learners: 5, parts: 6 }, medium: { learners: 0, parts: 0 }, hard: { learners: 0, parts: 0 } },
  },
  wallet: { bitAward: 4242, bitWord: 10, bitPhrase: 20 },
  onboarding: { englishLevel: { none: 3, beginner: 9 }, listeningExperience: {} },
  signupsByDay: [{ day: "2026-11-19", count: 2 }],
};

vi.mock("../../services/adminServices", () => ({
  fetchLearnerStats: vi.fn(async () => stats),
}));

describe("StatsTab", () => {
  it("renders the numbers from the stats call", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<StatsTab token="t" />);
    });
    const text = host.textContent ?? "";
    for (const n of ["123", "345", "999", "4242", "admin.stats.duration.hm"]) {
      expect(text).toContain(n);
    }
    expect(host.querySelector('[title="admin.stats.signups.bar"]')).not.toBeNull();
    await act(async () => root.unmount());
    host.remove();
  });
});
