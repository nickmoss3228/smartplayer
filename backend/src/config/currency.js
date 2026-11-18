// config/currency.js

// Flat BitAward payout when the main Quiz is passed (existing 70% threshold
// in applyLevelCompletion.js). Paid for the FIRST pass of each part only.
// It used to be paid on every passing submission, and since check-answer
// reveals the right option, a script could replay a learned quiz in a loop and
// mint coins without limit. Streak and achievements still recompute on every
// pass; only the coins are once per part.
export const QUIZ_PASS_BITAWARD = 5;

// BitPhrase coins minted when a marker-to-marker segment finishes its full
// auto-repeat cycle, keyed by which repeat-count setting (1x/2x/3x) was
// active during that cycle. 1x mints nothing since nothing was repeated.
export const PHRASE_REPEAT_BITPHRASE = {
  1: 0,
  2: 1,
  3: 2,
};

// Most BitPhrase one user can earn from phrase repeats in a Moscow day. The
// longest story has about 170 segments, so playing all of it at 3x pays about
// 340, which a real learner stays under; scripted farming drops from ~9,600 to
// 400 a day.
export const PHRASE_REPEAT_DAILY_BITPHRASE_CAP = 400;
