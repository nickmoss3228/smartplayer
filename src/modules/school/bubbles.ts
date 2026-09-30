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
  /** The librarian proper: the one shelving books. Readers are "reader". */
  | "librarian"
  | "reader"
  /** Reading in the archive, among the old stacks. */
  | "researcher"
  /** Revising in the study hall. */
  | "reviser"
  | "listener"
  | "diner"
  | "athlete"
  | "coach"
  | "visitor"
  | "cook"
  | "caretaker"
  /** Behind the desk in the head's office. */
  | "head"
  /** An armchair in the staff room: a teacher off duty. */
  | "staff"
  /** At the piano, or waiting a turn in the music room. */
  | "musician"
  /** Rehearsing on the hall's stage… */
  | "performer"
  /** …and the teacher in front of it, running the rehearsal. */
  | "director"
  /** Out in the courtyard or the garden, with a friend. */
  | "friend"
  /** On the move along the corridors between lessons. */
  | "walker"
  /** On the path from the bus stop: arriving in the morning, going home after
   *  school. */
  | "arriving"
  /** On the pitch before and after school. */
  | "footballer"
  | "keeper"
  /** On the swings, the slide, in the sandpit. */
  | "kid";

/** Every list of lines, by its key under `school.speech` in the locales. */
export const PHRASE_POOLS = [
  "chatter",
  "teacher",
  "reception",
  "library",
  "reader",
  "archive",
  "studyHall",
  "lab",
  "cafeteria",
  "cook",
  "gym",
  "coach",
  "visitor",
  "caretaker",
  "head",
  "staffRoom",
  "music",
  "performer",
  "director",
  "yard",
  "corridor",
  "arriving",
  "leaving",
  "football",
  "keeper",
  "playground",
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
    // After dark only a handful are in (castFor): the adults sound tired, and
    // anybody younger sounds like they should be at home.
    const young = book.lateStudent;
    const tired = book.lateStaff;
    return {
      student: young,
      teacher: tired,
      receptionist: reception,
      librarian: tired,
      reader: young,
      researcher: young,
      reviser: young,
      listener: young,
      diner: young,
      athlete: young,
      coach: tired,
      visitor: book.visitor,
      cook: book.cook,
      caretaker: book.caretaker,
      head: tired,
      staff: tired,
      musician: young,
      performer: young,
      director: tired,
      friend: young,
      walker: young,
      arriving: young,
      footballer: young,
      keeper: young,
      kid: young,
    };
  }

  const quoted = learnedWords.map(quotable(book)).filter((w): w is string => w !== null);
  // One learned entry per generic line, capped so the pool stays half chatter.
  const take = Math.min(quoted.length, Math.max(1, book.chatter.length));
  // Deterministic rotation instead of a shuffle: the pool is rebuilt whenever
  // the word list changes, and a real shuffle would reorder everything on every
  // rebuild for no visible gain.
  const start = quoted.length % Math.max(1, take);
  const picked = quoted.length ? [...quoted.slice(start), ...quoted.slice(0, start)].slice(0, take) : [];
  const half = picked.slice(0, Math.ceil(picked.length / 2));

  // Every kind of person in its own voice: the head does not sound like a
  // pupil, the coach does not sound like the librarian. Learned words go only
  // where somebody would plausibly be saying them — a lesson, the listening
  // lab, a student revising.
  return {
    student: [...book.chatter, ...picked],
    teacher: [...book.teacher, ...half],
    receptionist: reception,
    librarian: book.library,
    reader: book.reader,
    researcher: book.archive,
    reviser: [...book.studyHall, ...half],
    listener: [...book.lab, ...half],
    diner: book.cafeteria,
    athlete: book.gym,
    coach: book.coach,
    visitor: book.visitor,
    cook: book.cook,
    caretaker: book.caretaker,
    head: book.head,
    staff: book.staffRoom,
    musician: book.music,
    performer: book.performer,
    director: book.director,
    friend: book.yard,
    walker: book.corridor,
    // Up the path in the morning, back down it after school.
    arriving: hour < 12 ? book.arriving : book.leaving,
    footballer: book.football,
    keeper: book.keeper,
    kid: book.playground,
  };
}

/** Words for the chalkboard: only real learned vocabulary, since a board that
 *  says "Can you repeat that?" is a board that has stopped meaning anything. */
export function boardWords(learnedWords: string[]): string[] {
  return learnedWords.map((w) => w.trim()).filter((w) => w.length > 0 && w.length <= 14);
}

export const pickLine = (pool: string[]): string =>
  pool[Math.floor(Math.random() * pool.length)] ?? "";
