import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { grantPhraseRepeat, resetPhraseRepeatCap } from "./phraseRepeatCap.js";
import { PHRASE_REPEAT_DAILY_BITPHRASE_CAP as CAP } from "../config/currency.js";

const noon = new Date("2026-11-17T09:00:00Z");

beforeEach(() => resetPhraseRepeatCap());

test("grants the full amount while under the cap", () => {
  assert.equal(grantPhraseRepeat("u1", 2, noon), 2);
  assert.equal(grantPhraseRepeat("u1", 1, noon), 1);
});

test("grants only what is left near the cap, then 0", () => {
  assert.equal(grantPhraseRepeat("u1", CAP - 1, noon), CAP - 1);
  assert.equal(grantPhraseRepeat("u1", 2, noon), 1);
  assert.equal(grantPhraseRepeat("u1", 2, noon), 0);
});

test("users are counted separately", () => {
  assert.equal(grantPhraseRepeat("u1", CAP, noon), CAP);
  assert.equal(grantPhraseRepeat("u1", 1, noon), 0);
  assert.equal(grantPhraseRepeat("u2", 2, noon), 2);
});

test("the count resets at Moscow midnight, not UTC midnight", () => {
  // 20:59 UTC is still the 17th in Moscow; 21:01 UTC is the 18th.
  const before = new Date("2026-11-17T20:59:00Z");
  const after = new Date("2026-11-17T21:01:00Z");
  assert.equal(grantPhraseRepeat("u1", CAP, before), CAP);
  assert.equal(grantPhraseRepeat("u1", 2, before), 0);
  assert.equal(grantPhraseRepeat("u1", 2, after), 2);
});
