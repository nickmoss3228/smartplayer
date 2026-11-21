// helpers/phraseRepeatCap.js
//
// Daily cap on BitPhrase paid for phrase repeats. Kept in memory because there
// is no coin ledger table to count from, and this is an anti-farming cap like
// the in-memory rate limiters; a backend restart resets the day's count, which
// is acceptable.

import { PHRASE_REPEAT_DAILY_BITPHRASE_CAP } from "../config/currency.js";
import { moscowDay } from "./moscowDay.js";

// userId -> BitPhrase already paid on `currentDay`.
const paidToday = new Map();
let currentDay = null;

/**
 * How much of `amount` may be paid to this user now (0..amount), recorded as
 * paid. Partial near the cap: 399 used + 2 requested -> 1.
 */
export function grantPhraseRepeat(userId, amount, now = new Date()) {
  const day = moscowDay(now);
  if (day !== currentDay) {
    // New day: older entries are dead weight, so the Map never grows forever.
    paidToday.clear();
    currentDay = day;
  }

  const used = paidToday.get(userId) ?? 0;
  const granted = Math.max(0, Math.min(amount, PHRASE_REPEAT_DAILY_BITPHRASE_CAP - used));
  if (granted > 0) paidToday.set(userId, used + granted);
  return granted;
}

/** For tests. */
export function resetPhraseRepeatCap() {
  paidToday.clear();
  currentDay = null;
}
