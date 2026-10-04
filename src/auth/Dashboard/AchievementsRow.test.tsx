// @vitest-environment jsdom
//
// Behaviour tests for the achievements section of the Dashboard.
//
// AchievementCard and AchievementDetailModal have their own render tests; what
// only this component does is wire them to data — which backend stat feeds
// which card, where listening time comes from, the "N of 25 earned" tally, and
// what happens while loading or when the request fails. Those are the parts
// that break without any single card looking wrong, so they are covered here
// by mounting the real row against a mocked achievements service.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../locales/en/translation.json";
import type { AchievementsResponse } from "../../services/achievementServices";

vi.mock("../../services/achievementServices", () => ({
  fetchAchievements: vi.fn(),
  syncListeningTime: vi.fn(() => Promise.resolve()),
}));

import { fetchAchievements, syncListeningTime } from "../../services/achievementServices";
import AchievementsRow from "./AchievementsRow";

// React only runs act() warnings-free when told it is in a test environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

i18n.use(initReactI18next).init({
  lng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

const LISTENING_KEY = "listeningTimeSconds"; // useListeningTimer's storage key

const stats = (over: Partial<AchievementsResponse["stats"]> = {}): AchievementsResponse => ({
  achievements: {},
  stats: {
    listeningSeconds: 0,
    questionsAnswered: 0,
    currentStreak: 0,
    longestStreak: 0,
    uniqueStoriesCount: 0,
    wordsLearned: 0,
    ...over,
  },
});

let container: HTMLDivElement;
let root: Root;

async function mount() {
  await act(async () => {
    root.render(<AchievementsRow />);
  });
}

const cards = () => [...container.querySelectorAll<HTMLButtonElement>("button[aria-label]")];
const cardFor = (title: string) => {
  const card = cards().find((b) => b.getAttribute("aria-label")!.startsWith(`${title} —`));
  if (!card) throw new Error(`no card titled "${title}"`);
  return card;
};
const labelOf = (title: string) => cardFor(title).getAttribute("aria-label")!;
const dialog = () => container.querySelector('[role="dialog"]');

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("token", "test-token");
  vi.mocked(fetchAchievements).mockReset();
  vi.mocked(syncListeningTime).mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("AchievementsRow", () => {
  it("shows a skeleton until the achievements arrive, then five cards", async () => {
    let resolve!: (r: AchievementsResponse) => void;
    vi.mocked(fetchAchievements).mockReturnValue(new Promise((r) => (resolve = r)));

    await mount();
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(cards()).toHaveLength(0);

    await act(async () => resolve(stats()));
    expect(container.querySelector(".animate-pulse")).toBeNull();
    expect(cards()).toHaveLength(5);
  });

  it("requests the achievements with the stored session token", async () => {
    vi.mocked(fetchAchievements).mockResolvedValue(stats());
    await mount();
    expect(fetchAchievements).toHaveBeenCalledWith("test-token");
  });

  it("feeds each backend stat to its own card", async () => {
    // Every value sits in a different tier, so a swapped mapping shows up as
    // the wrong tier name on some card rather than passing by coincidence.
    vi.mocked(fetchAchievements).mockResolvedValue(
      stats({
        questionsAnswered: 160, //     silver (150)
        currentStreak: 30, //          gold   (30)
        uniqueStoriesCount: 1, //      bronze (1)
        wordsLearned: 600, //          crown  (600)
      }),
    );
    await mount();

    expect(labelOf("Questions Done")).toContain("— Silver.");
    expect(labelOf("Study Streak")).toContain("— Gold.");
    expect(labelOf("Stories Heard")).toContain("— Bronze.");
    expect(labelOf("Words Learned")).toContain("— Crown.");
    expect(labelOf("Words Learned")).toContain("5 of 5 tiers earned");
  });

  it("uses the current streak, not the longest one", async () => {
    // A broken streak must drop the card back; longestStreak would keep it up.
    vi.mocked(fetchAchievements).mockResolvedValue(
      stats({ currentStreak: 2, longestStreak: 100 }),
    );
    await mount();
    expect(labelOf("Study Streak")).toContain("— Not started.");
  });

  it("reads listening time from the local counter, not the backend stat", async () => {
    // The local counter ticks every few seconds while playing; the backend copy
    // lags by up to the 5-minute sync interval.
    localStorage.setItem(LISTENING_KEY, String(5 * 3600 + 20 * 60)); // 5h 20m
    vi.mocked(fetchAchievements).mockResolvedValue(stats({ listeningSeconds: 0 }));
    await mount();

    const label = labelOf("Listening Time");
    expect(label).toContain("— Silver.");
    expect(label).toContain("5h 20m");
  });

  it("treats a missing or corrupt local counter as zero listening time", async () => {
    localStorage.setItem(LISTENING_KEY, "not-a-number");
    vi.mocked(fetchAchievements).mockResolvedValue(stats());
    await mount();
    expect(labelOf("Listening Time")).toContain("— Not started.");
    expect(labelOf("Listening Time")).toContain("0m");
  });

  it("tallies earned tiers across every category out of 25", async () => {
    localStorage.setItem(LISTENING_KEY, "3600"); //  listening  1 (bronze)
    vi.mocked(fetchAchievements).mockResolvedValue(
      stats({
        questionsAnswered: 300, //                    questions  3
        currentStreak: 7, //                          streak     2
        uniqueStoriesCount: 0, //                     stories    0
        wordsLearned: 10_000, //                      words      5
      }),
    );
    await mount();
    expect(container.textContent).toContain("11 of 25 earned");
  });

  it("counts a tier as earned exactly at its threshold", async () => {
    localStorage.setItem(LISTENING_KEY, "3599");
    vi.mocked(fetchAchievements).mockResolvedValue(
      stats({ questionsAnswered: 49, currentStreak: 3, uniqueStoriesCount: 5, wordsLearned: 9 }),
    );
    await mount();

    expect(labelOf("Listening Time")).toContain("— Not started.");
    expect(labelOf("Questions Done")).toContain("— Not started.");
    expect(labelOf("Study Streak")).toContain("— Bronze.");
    expect(labelOf("Stories Heard")).toContain("— Silver.");
    expect(labelOf("Words Learned")).toContain("— Not started.");
    expect(container.textContent).toContain("3 of 25 earned");
  });

  it("opens the detail sheet for the clicked card with that card's value", async () => {
    vi.mocked(fetchAchievements).mockResolvedValue(stats({ currentStreak: 44 }));
    await mount();
    expect(dialog()).toBeNull();

    await act(async () => cardFor("Study Streak").click());

    const sheet = dialog()!;
    expect(sheet).not.toBeNull();
    expect(sheet.textContent).toContain("Study Streak");
    // 44 days, next tier is platinum at 60.
    expect(sheet.textContent).toContain("16 days");
    expect(sheet.textContent).toContain("3 of 5 earned");
  });

  it("closes the detail sheet from its close button and from Escape", async () => {
    vi.mocked(fetchAchievements).mockResolvedValue(stats());
    await mount();

    await act(async () => cardFor("Words Learned").click());
    expect(dialog()).not.toBeNull();
    await act(async () =>
      container.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click(),
    );
    expect(dialog()).toBeNull();

    await act(async () => cardFor("Words Learned").click());
    expect(dialog()).not.toBeNull();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(dialog()).toBeNull();
  });

  it("still renders the cards at zero when the request fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetchAchievements).mockRejectedValue(new Error("network down"));
    await mount();

    expect(container.querySelector(".animate-pulse")).toBeNull();
    expect(cards()).toHaveLength(5);
    expect(container.textContent).toContain("0 of 25 earned");
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("pushes the local listening time to the backend on mount", async () => {
    localStorage.setItem(LISTENING_KEY, "4200");
    vi.mocked(fetchAchievements).mockResolvedValue(stats());
    await mount();
    expect(syncListeningTime).toHaveBeenCalledWith("test-token", 4200);
  });

  it("does not call the backend without a session token", async () => {
    localStorage.removeItem("token");
    await mount();
    expect(fetchAchievements).not.toHaveBeenCalled();
    expect(syncListeningTime).not.toHaveBeenCalled();
  });

  it("leaves the skeleton for the cards even without a session token", async () => {
    // load() used to return before clearing `loading`, so a missing token left
    // the section pulsing forever.
    localStorage.removeItem("token");
    localStorage.setItem(LISTENING_KEY, "3600");
    await mount();

    expect(container.querySelector(".animate-pulse")).toBeNull();
    expect(cards()).toHaveLength(5);
    expect(labelOf("Listening Time")).toContain("— Bronze.");
    expect(container.textContent).toContain("1 of 25 earned");
  });
});
