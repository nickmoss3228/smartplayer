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

// ── Surprise rewards (helpers/surpriseRewards.js) ───────────────────────────
// Variable rewards on top of the fixed ones above, never instead of them: the
// base payout is always paid, the surprise only ever adds. Nothing is spent to
// roll, so this stays a bonus and never becomes a loot box.

// Chance that a paying quiz pass or vocab round pays its reward twice.
export const SURPRISE_BONUS_CHANCE = 0.2;

// Each phrase segment is golden with this chance, per student, decided by an
// HMAC so the client cannot work out which ones are golden in advance.
export const GOLDEN_PHRASE_CHANCE = 1 / 12;

// BitPhrase for finding one (a 2x/3x repeat cycle on a golden segment). Paid
// once per segment, ever, and outside PHRASE_REPEAT_DAILY_BITPHRASE_CAP.
export const GOLDEN_PHRASE_BITPHRASE = 10;

// Most golden phrases one student can cash in per Moscow day. A script can post
// any segment index, so this, not the 1-in-12 odds, bounds what farming earns:
// 5 x 10 = 50 BitPhrase a day.
export const GOLDEN_PHRASE_DAILY_CAP = 5;

// Golden words: a vocabulary word is secretly golden for a student with this
// chance (an HMAC, like golden phrases), and a hard word (phrasal verb, a word
// from a hard story, a phrase of several words or 9+ letters) more often.
export const GOLDEN_WORD_CHANCE = 1 / 10;
export const GOLDEN_WORD_HARD_CHANCE = 1 / 4;
// BitWord for guessing a golden word, on top of its ordinary 1. Paid once per
// word, ever: a word is learned once (user_learned_word), so no daily cap is
// needed — the whole catalogue bounds what it can pay.
export const GOLDEN_WORD_BITWORD = 5;
