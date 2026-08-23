// modules/school/bubbles.ts
//
// What the room says. Three sources, mixed:
//
//   • a line pool per ROLE, so the person behind the front desk greets you and
//     the one in the gym does not;
//   • a fixed pool of classroom chatter behind all of them, so a brand-new
//     player with no history still walks into a room that is talking;
//   • the words that player has actually learned, which get folded in as soon
//     as there are any.
//
// The mix is weighted rather than alternating: at 2 learned words the room
// should not be quoting them half the time, and at 200 the generic lines
// should have mostly faded out. The weight below does that with one ratio and
// no state.

/**
 * What a person is here to do. Drives which pool they speak from, and it is
 * the whole reason tapping the receptionist says "Welcome!" rather than "Is
 * this on the test?". Assigned in props.ts, where the person is placed —
 * the room somebody is standing in IS their role.
 */
export type PersonRole =
  | "student"
  | "teacher"
  | "receptionist"
  | "librarian"
  | "listener"
  | "diner"
  | "athlete"
  | "visitor";

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

const RECEPTION_LINES: string[] = [
  "Welcome!",
  "Welcome to the school!",
  "How can I help?",
  "Are you here for the tour?",
  "Sign in here, please.",
  "Take a seat — someone will be down.",
  "First day? You'll like it here.",
  "Straight down the corridor.",
];

const LIBRARY_LINES: string[] = [
  "Shh — reading.",
  "This chapter is good.",
  "Two weeks, please.",
  "Have you read this one?",
  "It's quiet in here.",
  "Third shelf along.",
  "Just one more page.",
];

const LAB_LINES: string[] = [
  "Headphones on.",
  "Playing it again.",
  "I heard it that time!",
  "Track two, please.",
  "One more listen.",
  "Wait — rewind a bit.",
  "That accent is tricky.",
];

const CAFETERIA_LINES: string[] = [
  "Is it pizza today?",
  "Save me a seat!",
  "Lunch already?",
  "Pass the salt?",
  "This is actually good.",
  "Five minutes left!",
  "Anyone want my apple?",
];

const GYM_LINES: string[] = [
  "Nice pass!",
  "One more lap.",
  "Warm up first!",
  "My turn!",
  "Good game.",
  "Two points!",
  "Catch!",
];

const VISITOR_LINES: string[] = [
  "Nice school.",
  "I'm a bit early.",
  "Waiting for my class.",
  "Is this the way in?",
  "Big place, isn't it?",
];

/** The one line that has to know what time it is. A school that says "Good
 *  morning!" at ten at night is a school nobody is really in. */
export const greetingForHour = (hour: number): string =>
  hour < 12 ? "Good morning!" : hour < 18 ? "Good afternoon!" : "Good evening!";

export type BubblePool = Record<PersonRole, string[]>;

/** Formats a learned word as something a person would actually say about it,
 *  rather than dropping a bare noun into a speech bubble. */
const quote = (word: string) => {
  const w = word.trim();
  if (!w) return null;
  if (w.length > 22) return null;
  return `"${w}"`;
};

/**
 * Builds every pool once per set of learned words. Learned words are repeated
 * into the pools that plausibly quote them — the classroom, the teacher and
 * the listening lab — capped so those never turn into pure flashcards, and
 * never below zero when there is nothing learned yet. The service roles keep
 * their own voice: a receptionist reciting vocabulary is a bug, not a feature.
 */
export function buildBubblePool(learnedWords: string[], hour: number): BubblePool {
  const greeting = greetingForHour(hour);
  const reception = [greeting, ...RECEPTION_LINES];

  const quoted = learnedWords.map(quote).filter((w): w is string => w !== null);
  if (quoted.length === 0) {
    return {
      student: CHATTER,
      teacher: TEACHER_LINES,
      receptionist: reception,
      librarian: LIBRARY_LINES,
      listener: LAB_LINES,
      diner: CAFETERIA_LINES,
      athlete: GYM_LINES,
      visitor: VISITOR_LINES,
    };
  }

  // One learned entry per generic line, capped so the pool stays half chatter.
  const take = Math.min(quoted.length, CHATTER.length);
  // Deterministic rotation instead of a shuffle: the pool is rebuilt whenever
  // the word list changes, and a real shuffle would reorder everything on every
  // rebuild for no visible gain.
  const start = quoted.length % Math.max(1, take);
  const picked = [...quoted.slice(start), ...quoted.slice(0, start)].slice(0, take);
  const half = picked.slice(0, Math.ceil(take / 2));

  return {
    student: [...CHATTER, ...picked],
    teacher: [...TEACHER_LINES, ...half],
    receptionist: reception,
    librarian: LIBRARY_LINES,
    listener: [...LAB_LINES, ...half],
    diner: CAFETERIA_LINES,
    athlete: GYM_LINES,
    visitor: VISITOR_LINES,
  };
}

/** Words for the chalkboard: only real learned vocabulary, since a board that
 *  says "Can you repeat that?" is a board that has stopped meaning anything. */
export function boardWords(learnedWords: string[]): string[] {
  return learnedWords.map((w) => w.trim()).filter((w) => w.length > 0 && w.length <= 14);
}

export const pickLine = (pool: string[]): string =>
  pool[Math.floor(Math.random() * pool.length)] ?? "";
