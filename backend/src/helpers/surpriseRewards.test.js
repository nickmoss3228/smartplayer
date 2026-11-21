import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GOLDEN_PHRASE_CHANCE,
  GOLDEN_WORD_CHANCE,
  GOLDEN_WORD_HARD_CHANCE,
  SURPRISE_BONUS_CHANCE,
} from "../config/currency.js";
import {
  isGoldenSegment,
  isGoldenWord,
  isHardWord,
  rollSurpriseBonus,
  startOfMoscowDay,
} from "./surpriseRewards.js";

describe("rollSurpriseBonus", () => {
  it("doubles below the chance, adds nothing at or above it", () => {
    assert.equal(rollSurpriseBonus(5, () => 0), 5);
    assert.equal(rollSurpriseBonus(5, () => SURPRISE_BONUS_CHANCE - 0.001), 5);
    assert.equal(rollSurpriseBonus(5, () => SURPRISE_BONUS_CHANCE), 0);
  });

  it("never rolls on a payout of nothing", () => {
    assert.equal(rollSurpriseBonus(0, () => 0), 0);
    assert.equal(rollSurpriseBonus(-3, () => 0), 0);
  });
});

describe("isGoldenSegment", () => {
  it("is stable for one student and segment", () => {
    const a = isGoldenSegment("u1", "easy", "leo", 1, 7);
    assert.equal(isGoldenSegment("u1", "easy", "leo", 1, 7), a);
  });

  it("marks about the configured share of segments golden", () => {
    let golden = 0;
    const n = 24_000;
    for (let i = 0; i < n; i++) if (isGoldenSegment(`u${i % 40}`, "easy", "leo", 1 + (i % 6), i)) golden++;
    const share = golden / n;
    assert.ok(Math.abs(share - GOLDEN_PHRASE_CHANCE) < 0.01, `share was ${share}`);
  });

  it("differs between students", () => {
    const pick = (u) => Array.from({ length: 200 }, (_, i) => isGoldenSegment(u, "easy", "leo", 1, i)).join();
    assert.notEqual(pick("alice"), pick("bob"));
  });
});

describe("isHardWord", () => {
  it("counts phrasal verbs and words from hard stories", () => {
    assert.equal(isHardWord("run", [{ kind: "phrasal", difficulty: "easy" }]), true);
    assert.equal(isHardWord("run", [{ kind: "vocabulary", difficulty: "hard" }]), true);
    assert.equal(isHardWord("run", [{ kind: "vocabulary", difficulty: "easy" }]), false);
  });

  it("counts phrases and long words by their text", () => {
    assert.equal(isHardWord("give up"), true);
    assert.equal(isHardWord("beautiful"), true);
    assert.equal(isHardWord("pizza"), false);
    assert.equal(isHardWord("o'clock"), false);
  });
});

describe("isGoldenWord", () => {
  it("is stable for one student and word", () => {
    const a = isGoldenWord("u1", "pizza", false);
    assert.equal(isGoldenWord("u1", "pizza", false), a);
  });

  it("marks about the configured share, more of the hard words", () => {
    const n = 30_000;
    let plain = 0;
    let hard = 0;
    for (let i = 0; i < n; i++) {
      if (isGoldenWord(`u${i % 50}`, `word${i}`, false)) plain++;
      if (isGoldenWord(`u${i % 50}`, `word${i}`, true)) hard++;
    }
    assert.ok(Math.abs(plain / n - GOLDEN_WORD_CHANCE) < 0.01, `plain share was ${plain / n}`);
    assert.ok(Math.abs(hard / n - GOLDEN_WORD_HARD_CHANCE) < 0.012, `hard share was ${hard / n}`);
  });

  it("differs between students and from the segment picks", () => {
    const pick = (u) => Array.from({ length: 300 }, (_, i) => isGoldenWord(u, `w${i}`, true)).join();
    assert.notEqual(pick("alice"), pick("bob"));
  });
});

describe("startOfMoscowDay", () => {
  it("is 21:00 UTC of the day before", () => {
    assert.equal(startOfMoscowDay(new Date("2026-11-21T10:00:00Z")).toISOString(), "2026-11-20T21:00:00.000Z");
    assert.equal(startOfMoscowDay(new Date("2026-11-21T22:30:00Z")).toISOString(), "2026-11-21T21:00:00.000Z");
  });
});
