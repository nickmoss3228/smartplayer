// helpers/surpriseRewards.js
//
// The two random rewards. All randomness is server-side; the client is only
// told what it got.
//
// - rollSurpriseBonus: a quiz pass or vocab round sometimes pays twice.
// - isGoldenSegment: some phrase segments are secretly "golden" and pay extra
//   when a student repeats them.
// - isGoldenWord: the same for vocabulary words guessed in a vocab round; hard
//   words (isHardWord) are golden more often. Which ones is an HMAC of the student and the
//   segment, so it is stable (a found phrase stays found, a missed one stays
//   findable) yet different for every student and unguessable without the key.

import { createHmac, randomInt } from "node:crypto";

import { config } from "../config/env.js";
import {
  GOLDEN_PHRASE_CHANCE,
  GOLDEN_WORD_CHANCE,
  GOLDEN_WORD_HARD_CHANCE,
  SURPRISE_BONUS_CHANCE,
} from "../config/currency.js";

const ROLL_SCALE = 1_000_000;
const cryptoRoll = () => randomInt(ROLL_SCALE) / ROLL_SCALE;
let defaultRoll = cryptoRoll;

/**
 * For the API suite, which runs the app in-process: pin every roll so tests
 * asserting exact balances stay deterministic. Pass null to restore.
 * @param {(() => number) | null} roll
 */
export function setSurpriseRollForTests(roll) {
  defaultRoll = roll ?? cryptoRoll;
}

/**
 * The extra amount a surprise adds to `base`, or 0. Doubling is the only
 * outcome, so the learner never wonders whether a "bonus" was a small one.
 *
 * @param {number} base the fixed payout just made
 * @param {() => number} [roll] uniform in [0, 1)
 */
export function rollSurpriseBonus(base, roll = defaultRoll) {
  if (!Number.isFinite(base) || base <= 0) return 0;
  return roll() < SURPRISE_BONUS_CHANCE ? base : 0;
}

// Its own key, derived from the JWT secret: nothing else uses this derivation,
// so a golden-phrase value can never stand in for a token signature.
function goldenKey() {
  return createHmac("sha256", config.jwtSecret ?? "dev-golden-phrase")
    .update("golden-phrase-v1")
    .digest();
}

let cachedKey = null;

/** Whether this segment is golden for this student. */
export function isGoldenSegment(userId, difficulty, storyId, partNumber, segmentIndex) {
  cachedKey ??= goldenKey();
  const digest = createHmac("sha256", cachedKey)
    .update(`${userId}\u0000${difficulty}\u0000${storyId}\u0000${partNumber}\u0000${segmentIndex}`)
    .digest();
  return digest.readUInt32BE(0) / 2 ** 32 < GOLDEN_PHRASE_CHANCE;
}

let goldenWordOverride = null;

/**
 * For the API suite: decide golden words with `pick(key, hard)` instead of the
 * HMAC, so suites asserting exact BitWord balances stay deterministic (the
 * harness pins it to "never"). Pass null to restore.
 * @param {((key: string, hard: boolean) => boolean) | null} pick
 */
export function setGoldenWordsForTests(pick) {
  goldenWordOverride = pick;
}

/**
 * Whether this vocabulary key is golden for this student. Stable per student
 * and word, different between students, unguessable without the key. The
 * "word" prefix keeps it apart from the segment digests.
 */
export function isGoldenWord(userId, key, hard) {
  if (goldenWordOverride) return goldenWordOverride(key, hard);
  cachedKey ??= goldenKey();
  const digest = createHmac("sha256", cachedKey).update(`word\u0000${userId}\u0000${key}`).digest();
  return digest.readUInt32BE(0) / 2 ** 32 < (hard ? GOLDEN_WORD_HARD_CHANCE : GOLDEN_WORD_CHANCE);
}

const HARD_WORD_LETTERS = 9;

/**
 * A hard word: a phrasal verb, a word met in a hard story, a phrase of several
 * words, or a long one. `places` are the word's places in stories (from
 * storiesRepo.vocabPlaces); legacy keys have none and are judged by the text.
 * @param {string} key lowercased vocabulary key
 * @param {{ kind?: string, difficulty?: string }[]} [places]
 */
export function isHardWord(key, places = []) {
  if (places.some((p) => p.kind === "phrasal" || p.difficulty === "hard")) return true;
  const text = key.trim();
  return /\s/.test(text) || text.replace(/[^\p{L}]/gu, "").length >= HARD_WORD_LETTERS;
}

/** The start of the current Moscow day, as a Date, for counting today's finds. */
export function startOfMoscowDay(now = new Date()) {
  // Moscow has been UTC+3 all year since 2014, with no DST.
  const shifted = new Date(now.getTime() + 3 * 3600_000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - 3 * 3600_000);
}
