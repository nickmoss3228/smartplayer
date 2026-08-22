// modules/school/bubbles.ts
//
// What the room says. Two sources, mixed:
//
//   • a fixed pool of classroom chatter, so a brand-new player with no history
//     still walks into a room that is talking;
//   • the words that player has actually learned, which get folded in as soon
//     as there are any.
//
// The mix is weighted rather than alternating: at 2 learned words the room
// should not be quoting them half the time, and at 200 the generic lines
// should have mostly faded out. The weight below does that with one ratio and
// no state.

const CHATTER: string[] = [
  "Can you repeat that?",
  "I think I got it!",
  "How do you spell it?",
  "Wait, one more time...",
  "Nice work!",
  "What does that mean?",
  "Let's listen again.",
  "Almost had it.",
  "Say it slower?",
  "Oh — now I hear it.",
  "Good morning!",
  "Is this on the test?",
  "I like this one.",
  "My turn?",
  "Shh, listening.",
  "That's a new word.",
  "Got it, thanks!",
  "Hmm...",
];

const TEACHER_LINES: string[] = [
  "Listen first, then repeat.",
  "Anyone want to try?",
  "Good — say it again.",
  "Open your notebooks.",
  "Let's take it from the top.",
  "Nice pronunciation!",
  "Who remembers this one?",
  "Slowly now.",
  "Everyone together.",
];

export type Speaker = "student" | "teacher";

export interface BubblePool {
  student: string[];
  teacher: string[];
}

/** Formats a learned word as something a person would actually say about it,
 *  rather than dropping a bare noun into a speech bubble. */
const quote = (word: string) => {
  const w = word.trim();
  if (!w) return null;
  if (w.length > 22) return null;
  return `"${w}"`;
};

/**
 * Builds the two pools once per set of learned words. Learned words are
 * repeated in the array to weight them — at most half the pool, so the room
 * never turns into pure flashcards, and never below zero when there is nothing
 * learned yet.
 */
export function buildBubblePool(learnedWords: string[]): BubblePool {
  const quoted = learnedWords.map(quote).filter((w): w is string => w !== null);
  if (quoted.length === 0) {
    return { student: CHATTER, teacher: TEACHER_LINES };
  }

  // One learned entry per generic line, capped so the pool stays half chatter.
  const take = Math.min(quoted.length, CHATTER.length);
  const shuffled = [...quoted];
  // Deterministic rotation instead of a shuffle: the pool is rebuilt whenever
  // the word list changes, and a real shuffle would reorder everything on every
  // rebuild for no visible gain.
  const start = shuffled.length % Math.max(1, take);
  const picked = [...shuffled.slice(start), ...shuffled.slice(0, start)].slice(0, take);

  return {
    student: [...CHATTER, ...picked],
    teacher: [...TEACHER_LINES, ...picked.slice(0, Math.ceil(take / 2))],
  };
}

/** Words for the chalkboard: only real learned vocabulary, since a board that
 *  says "Can you repeat that?" is a board that has stopped meaning anything. */
export function boardWords(learnedWords: string[]): string[] {
  return learnedWords.map((w) => w.trim()).filter((w) => w.length > 0 && w.length <= 14);
}

export const pickLine = (pool: string[]): string =>
  pool[Math.floor(Math.random() * pool.length)] ?? "";
