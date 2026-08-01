// config/currency.js

// Flat BitAward payout when the main Quiz is passed (existing 70% threshold
// in applyLevelCompletion.js). Awarded on every passing submission, not just
// the first — matches how streak/achievements already recompute on every
// completion event rather than gating on "first time ever."
export const QUIZ_PASS_BITAWARD = 5;

// BitPhrase coins minted when a marker-to-marker segment finishes its full
// auto-repeat cycle, keyed by which repeat-count setting (1x/2x/3x) was
// active during that cycle. 1x mints nothing since nothing was repeated.
export const PHRASE_REPEAT_BITPHRASE = {
  1: 0,
  2: 1,
  3: 2,
};
