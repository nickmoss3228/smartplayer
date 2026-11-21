// test/api/surprise-rewards.test.js — the random rewards: the surprise bonus on
// quiz passes and vocab rounds, and golden phrases on phrase repeats. The roll
// is pinned through setSurpriseRollForTests (the harness pins it to "never").

import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import "./harness.js";
import { getQuizAnswerKey } from "../../src/config/quizData.js";
import { LEGACY_VOCAB_KEYS as VOCAB_KEY_SET } from "../../src/config/vocabKeys.js";
import {
  GOLDEN_PHRASE_BITPHRASE,
  GOLDEN_PHRASE_DAILY_CAP,
  GOLDEN_WORD_BITWORD,
  PHRASE_REPEAT_BITPHRASE,
  QUIZ_PASS_BITAWARD,
} from "../../src/config/currency.js";
import { resetPhraseRepeatCap } from "../../src/helpers/phraseRepeatCap.js";
import {
  isGoldenSegment,
  isGoldenWord,
  setGoldenWordsForTests,
  setSurpriseRollForTests,
} from "../../src/helpers/surpriseRewards.js";
import { api, registerUser, startServer, stopServer } from "./harness.js";

before(startServer);
after(stopServer);
afterEach(() => {
  setSurpriseRollForTests(() => 1);
  setGoldenWordsForTests(() => false);
});

// easy/leo: parts 1-3 are free to everyone, 4+ locked.
const FREE = { difficulty: "easy", storyId: "leo", partNumber: 1 };
const LOCKED = { difficulty: "easy", storyId: "leo", partNumber: 5 };
const LEGACY_VOCAB_KEYS = [...VOCAB_KEY_SET];

const correctAnswers = (part) => getQuizAnswerKey(part.difficulty, part.storyId, part.partNumber);

function segments(userId, part, golden, count) {
  const found = [];
  for (let i = 0; i < 1000 && found.length < count; i++) {
    if (isGoldenSegment(userId, part.difficulty, part.storyId, part.partNumber, i) === golden) found.push(i);
  }
  assert.equal(found.length, count, "not enough segments of the wanted kind");
  return found;
}

const repeat = (u, body) => api("POST", "/api/progress/phrase-repeat", { token: u.token, body });

describe("surprise bonus", () => {
  it("doubles a first quiz pass when it fires, and says so", async () => {
    setSurpriseRollForTests(() => 0);
    const u = await registerUser();
    const body = { ...FREE, answers: correctAnswers(FREE) };

    const first = await api("POST", "/api/progress/complete", { token: u.token, body });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.deepEqual(first.body.bonus, { kind: "surprise", currency: "bitAward", amount: QUIZ_PASS_BITAWARD });
    assert.equal(first.body.wallet.bitAward, 2 * QUIZ_PASS_BITAWARD);

    // A repeat pass pays nothing, so there is nothing to double.
    const again = await api("POST", "/api/progress/complete", { token: u.token, body });
    assert.equal(again.body.bonus, null);
  });

  it("pays only the base when it does not fire", async () => {
    const u = await registerUser();
    const res = await api("POST", "/api/progress/complete", {
      token: u.token,
      body: { ...FREE, answers: correctAnswers(FREE) },
    });
    assert.equal(res.body.bonus, null);
    assert.equal(res.body.wallet.bitAward, QUIZ_PASS_BITAWARD);
  });

  it("doubles a vocab round's new words, never resent ones", async () => {
    setSurpriseRollForTests(() => 0);
    const u = await registerUser();
    const words = LEGACY_VOCAB_KEYS.slice(0, 4);

    const first = await api("POST", "/api/progress/vocab-complete", { token: u.token, body: { words } });
    assert.equal(first.status, 200);
    assert.deepEqual(first.body.bonus, { kind: "surprise", currency: "bitWord", amount: 4 });
    assert.equal(first.body.wallet.bitWord, 8);

    const resent = await api("POST", "/api/progress/vocab-complete", { token: u.token, body: { words } });
    assert.equal(resent.body.bonus, null);
    assert.equal(resent.body.wallet.bitWord, 8);
  });
});

describe("golden phrases", () => {
  before(resetPhraseRepeatCap);
  after(resetPhraseRepeatCap);

  it("pay once for a golden segment repeated 2x or 3x", async () => {
    const u = await registerUser();
    const [golden] = segments(u.id, FREE, true, 1);

    const found = await repeat(u, { repeatCount: 3, ...FREE, segmentIndex: golden });
    assert.equal(found.status, 200);
    assert.deepEqual(found.body.bonus, { kind: "golden", currency: "bitPhrase", amount: GOLDEN_PHRASE_BITPHRASE });
    assert.equal(found.body.wallet.bitPhrase, PHRASE_REPEAT_BITPHRASE[3] + GOLDEN_PHRASE_BITPHRASE);

    const again = await repeat(u, { repeatCount: 3, ...FREE, segmentIndex: golden });
    assert.equal(again.body.bonus, null);
    assert.equal(again.body.wallet.bitPhrase, 2 * PHRASE_REPEAT_BITPHRASE[3] + GOLDEN_PHRASE_BITPHRASE);
  });

  it("do not pay for ordinary segments, 1x cycles, locked parts or bad input", async () => {
    const u = await registerUser();
    const [plain] = segments(u.id, FREE, false, 1);
    const [golden] = segments(u.id, FREE, true, 1);
    const [lockedGolden] = segments(u.id, LOCKED, true, 1);

    const cases = [
      { repeatCount: 3, ...FREE, segmentIndex: plain },
      { repeatCount: 1, ...FREE, segmentIndex: golden },
      { repeatCount: 3, ...LOCKED, segmentIndex: lockedGolden },
      { repeatCount: 3, ...FREE, segmentIndex: -1 },
      { repeatCount: 3, ...FREE, segmentIndex: "0" },
      { repeatCount: 3, ...FREE, storyId: "no-such-story", segmentIndex: golden },
      { repeatCount: 3, ...FREE, difficulty: "nope", segmentIndex: golden },
    ];
    for (const body of cases) {
      const res = await repeat(u, body);
      assert.equal(res.status, 200, JSON.stringify(body));
      assert.equal(res.body.bonus, null, JSON.stringify(body));
    }
  });

  it("still pay ordinary BitPhrase to a client that sends no segment", async () => {
    const u = await registerUser();
    const res = await repeat(u, { repeatCount: 2 });
    assert.equal(res.body.bonus, null);
    assert.equal(res.body.wallet.bitPhrase, PHRASE_REPEAT_BITPHRASE[2]);
  });

  it("stop at the daily cap", async () => {
    const u = await registerUser();
    const golden = segments(u.id, FREE, true, GOLDEN_PHRASE_DAILY_CAP + 1);

    const bonuses = [];
    for (const segmentIndex of golden) {
      const res = await repeat(u, { repeatCount: 2, ...FREE, segmentIndex });
      bonuses.push(res.body.bonus);
    }
    assert.equal(bonuses.filter(Boolean).length, GOLDEN_PHRASE_DAILY_CAP);
    assert.equal(bonuses.at(-1), null);
  });
});

describe("golden words", () => {
  const round = (u, words) => api("POST", "/api/progress/vocab-complete", { token: u.token, body: { words } });

  it("pay extra once for a golden word, with the word in the bonus", async () => {
    const u = await registerUser();
    const [golden, ...plain] = LEGACY_VOCAB_KEYS.slice(0, 4);
    setGoldenWordsForTests((key) => key === golden);

    const first = await round(u, [golden, ...plain]);
    assert.equal(first.status, 200);
    assert.deepEqual(first.body.bonus, {
      kind: "goldenWord",
      currency: "bitWord",
      amount: GOLDEN_WORD_BITWORD,
      word: golden,
      count: 1,
    });
    assert.equal(first.body.wallet.bitWord, 4 + GOLDEN_WORD_BITWORD);

    // Learned already: no coin and no second golden payout.
    const again = await round(u, [golden]);
    assert.equal(again.body.bonus, null);
    assert.equal(again.body.wallet.bitWord, 4 + GOLDEN_WORD_BITWORD);
  });

  it("count several golden words, and fold a surprise into the same bonus", async () => {
    setSurpriseRollForTests(() => 0);
    setGoldenWordsForTests(() => true);
    const u = await registerUser();
    const words = LEGACY_VOCAB_KEYS.slice(4, 7);

    const res = await round(u, words);
    assert.equal(res.body.bonus.kind, "goldenWord");
    assert.equal(res.body.bonus.count, 3);
    // 3 new words, doubled by the surprise, plus 3 golden payouts.
    assert.equal(res.body.bonus.amount, 3 * GOLDEN_WORD_BITWORD + 3);
    assert.equal(res.body.wallet.bitWord, 3 + 3 + 3 * GOLDEN_WORD_BITWORD);
  });

  it("use the real per-student pick when not pinned", async () => {
    setGoldenWordsForTests(null);
    const u = await registerUser();
    // Golden at the ordinary odds is golden at the hard odds too (same digest,
    // higher threshold), so this holds whichever way the server judges it.
    const golden = LEGACY_VOCAB_KEYS.find((k) => isGoldenWord(u.id, k, false));
    assert.ok(golden, "no golden legacy word for this student");

    const res = await round(u, [golden]);
    assert.equal(res.body.bonus?.kind, "goldenWord");
    assert.equal(res.body.wallet.bitWord, 1 + GOLDEN_WORD_BITWORD);
  });
});
