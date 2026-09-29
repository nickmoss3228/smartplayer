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
//
// The lines themselves are not here. They live in the locale files under
// `school.speech`, one list per pool, and arrive as a PhraseBook in the
// player's language (phraseBook.ts) — so a Russian-speaking player hears the
// school in Russian. The learned words are quoted as they are: those are the
// English the player is here to learn.

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
  | "visitor"
  | "cook"
  | "caretaker";

/** Every list of lines, by its key under `school.speech` in the locales. */
export const PHRASE_POOLS = [
  "chatter",
  "teacher",
  "reception",
  "library",
  "lab",
  "cafeteria",
  "cook",
  "gym",
  "visitor",
  "caretaker",
  /** Whoever is still in after dark. The pools above belong to a school in
   *  the middle of a lesson; at midnight they would be ghosts talking. */
  "lateStudent",
  "lateStaff",
] as const;
export type PhrasePool = (typeof PHRASE_POOLS)[number];

export type GreetingTime = "morning" | "afternoon" | "evening" | "late";

/** Everything the school can say, in one language. */
export type PhraseBook = Record<PhrasePool, string[]> & {
  greeting: Record<GreetingTime, string>;
  /** A learned word as somebody says it: "journey" in English, «journey» in
   *  Russian. */
  quote: (word: string) => string;
};

/** Night by the school's own clock (schoolClock.ts). */
const isLate = (hour: number) => hour >= 21 || hour < 7;

/** The one line that has to know what time it is. A school that says "Good
 *  morning!" at ten at night is a school nobody is really in. */
export const greetingFor = (hour: number): GreetingTime =>
  isLate(hour) ? "late" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

export type BubblePool = Record<PersonRole, string[]>;

/** Keeps a learned word only if it fits in a bubble, as a word somebody would
 *  say rather than a bare noun dropped into one. */
const quotable = (book: PhraseBook) => (word: string) => {
  const w = word.trim();
  if (!w || w.length > 22) return null;
  return book.quote(w);
};

/**
 * Builds every pool once per set of learned words. Learned words are repeated
 * into the pools that plausibly quote them — the classroom, the teacher and
 * the listening lab — capped so those never turn into pure flashcards, and
 * never below zero when there is nothing learned yet. The service roles keep
 * their own voice: a receptionist reciting vocabulary is a bug, not a feature.
 */
export function buildBubblePool(learnedWords: string[], hour: number, book: PhraseBook): BubblePool {
  const reception = [book.greeting[greetingFor(hour)], ...book.reception];

  if (isLate(hour)) {
    return {
      student: book.lateStudent,
      teacher: book.lateStaff,
      receptionist: reception,
      librarian: book.lateStudent,
      listener: book.lateStudent,
      diner: book.lateStudent,
      athlete: book.lateStudent,
      visitor: book.visitor,
      cook: book.cook,
      caretaker: book.caretaker,
    };
  }

  const quoted = learnedWords.map(quotable(book)).filter((w): w is string => w !== null);
  if (quoted.length === 0) {
    return {
      student: book.chatter,
      teacher: book.teacher,
      receptionist: reception,
      librarian: book.library,
      listener: book.lab,
      diner: book.cafeteria,
      athlete: book.gym,
      visitor: book.visitor,
      cook: book.cook,
      caretaker: book.caretaker,
    };
  }

  // One learned entry per generic line, capped so the pool stays half chatter.
  const take = Math.min(quoted.length, Math.max(1, book.chatter.length));
  // Deterministic rotation instead of a shuffle: the pool is rebuilt whenever
  // the word list changes, and a real shuffle would reorder everything on every
  // rebuild for no visible gain.
  const start = quoted.length % Math.max(1, take);
  const picked = [...quoted.slice(start), ...quoted.slice(0, start)].slice(0, take);
  const half = picked.slice(0, Math.ceil(take / 2));

  return {
    student: [...book.chatter, ...picked],
    teacher: [...book.teacher, ...half],
    receptionist: reception,
    librarian: book.library,
    listener: [...book.lab, ...half],
    diner: book.cafeteria,
    athlete: book.gym,
    visitor: book.visitor,
    cook: book.cook,
    caretaker: book.caretaker,
  };
}

/** Words for the chalkboard: only real learned vocabulary, since a board that
 *  says "Can you repeat that?" is a board that has stopped meaning anything. */
export function boardWords(learnedWords: string[]): string[] {
  return learnedWords.map((w) => w.trim()).filter((w) => w.length > 0 && w.length <= 14);
}

export const pickLine = (pool: string[]): string =>
  pool[Math.floor(Math.random() * pool.length)] ?? "";
