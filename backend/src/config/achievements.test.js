// config/achievements.test.js — `npm test` in backend/ (node --test, Node >= 22).
//
// The two pure rules behind stored achievement tiers: which tier a stat value
// has reached, and whether a newly computed tier may replace the stored one.
// updateAchievements writes whatever these two say, so a mistake here either
// hands out medals early or silently takes them away.

import test from "node:test";
import assert from "node:assert/strict";

import { ACHIEVEMENT_TIERS, computeHighestTier, isTierHigher } from "./achievements.js";

const ORDER = ["bronze", "silver", "gold", "platinum", "crown"];

test("every category climbs the five tiers in order with rising thresholds", () => {
  for (const [category, tiers] of Object.entries(ACHIEVEMENT_TIERS)) {
    assert.deepEqual(tiers.map((t) => t.tier), ORDER, category);
    for (let i = 1; i < tiers.length; i++) {
      assert.ok(
        tiers[i].threshold > tiers[i - 1].threshold,
        `${category}: ${tiers[i].threshold} follows ${tiers[i - 1].threshold}`,
      );
    }
  }
});

test("computeHighestTier awards a tier exactly at its threshold", () => {
  for (const [category, tiers] of Object.entries(ACHIEVEMENT_TIERS)) {
    tiers.forEach((t, i) => {
      const below = i === 0 ? null : tiers[i - 1].tier;
      assert.equal(computeHighestTier(category, t.threshold - 1), below, `${category} @ ${t.threshold - 1}`);
      assert.equal(computeHighestTier(category, t.threshold), t.tier, `${category} @ ${t.threshold}`);
    });
  }
});

test("computeHighestTier returns null before the first tier", () => {
  for (const category of Object.keys(ACHIEVEMENT_TIERS)) {
    assert.equal(computeHighestTier(category, 0), null, category);
  }
});

test("computeHighestTier caps at crown however large the value", () => {
  for (const category of Object.keys(ACHIEVEMENT_TIERS)) {
    assert.equal(computeHighestTier(category, Number.MAX_SAFE_INTEGER), "crown", category);
  }
});

test("computeHighestTier treats a missing stat as no tier, not an error", () => {
  // The listening-time and quiz handlers call updateAchievements without a
  // wordsLearned figure; that has to leave the stored tier alone, never crash.
  assert.equal(computeHighestTier("wordsLearned", undefined), null);
  assert.equal(computeHighestTier("wordsLearned", null), null);
  assert.equal(computeHighestTier("wordsLearned", NaN), null);
});

test("computeHighestTier reads real stat values in the right units", () => {
  assert.equal(computeHighestTier("listeningTime", 5 * 3600), "silver"); // seconds, not hours
  assert.equal(computeHighestTier("questionsAnswered", 299), "silver");
  assert.equal(computeHighestTier("studyStreak", 44), "gold");
  assert.equal(computeHighestTier("storiesListened", 1), "bronze");
  assert.equal(computeHighestTier("wordsLearned", 600), "crown");
});

test("isTierHigher lets the first tier in", () => {
  assert.equal(isTierHigher(null, "bronze"), true);
  assert.equal(isTierHigher(undefined, "gold"), true);
});

test("isTierHigher only allows strict upgrades", () => {
  for (let from = 0; from < ORDER.length; from++) {
    for (let to = 0; to < ORDER.length; to++) {
      assert.equal(isTierHigher(ORDER[from], ORDER[to]), to > from, `${ORDER[from]} -> ${ORDER[to]}`);
    }
  }
});

test("isTierHigher never replaces a stored tier with nothing", () => {
  // A stat that dropped (a broken streak) computes to null; that must not
  // erase the medal already earned.
  assert.equal(isTierHigher("gold", null), false);
  assert.equal(isTierHigher(null, null), false);
});
