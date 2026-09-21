// modules/school/advisor.ts
//
// The one voice in the game that speaks TO the player rather than to the room.
//
// Everything else the school says is ambient — a student muttering in a
// classroom you happened to tap. The advisor is the deputy head, standing in
// the corner of the screen with something you are meant to act on: wages are
// due, the place has gone quiet, there is a room you can now afford.
//
// Shaped like bubbles.ts on purpose: typed pools, a deterministic pick, no
// state. Same reasoning too — a message chosen at random on every render
// flickers, and one chosen from a seed the player can feel (what they own, what
// they owe) reads as somebody paying attention.

import { PAYROLL_MAX_WEEKS } from "../../config/schoolCatalog";

/**
 * What the advisor wants. Ordered by urgency, and the ORDER IS THE LOGIC:
 * `adviceFor` returns the first that applies, so a school in arrears is never
 * told a cheerful fact about its library.
 */
export type AdviceKind =
  | "payroll-due"
  | "payroll-heavy"
  | "morale-low"
  | "can-build"
  | "idle";

export interface Advice {
  kind: AdviceKind;
  text: string;
  /** Present only when there is something to press. */
  action: "pay" | "build" | null;
}

export interface SchoolMood {
  /** Whole weeks of wages outstanding. */
  weeksOwed: number;
  /** What clearing them costs, in BitAward. */
  due: number;
  /** 0..100. */
  morale: number;
  /** Whether the player can afford at least one room they are allowed to buy. */
  canBuild: boolean;
  /** How many rooms stand. Only used to keep the idle line from claiming a
   *  bustling campus when there is one classroom. */
  rooms: number;
}

/**
 * The idle pool: nothing is wrong and nothing is affordable, so the advisor
 * says something true about the place instead of inventing a chore. Picked by
 * room count rather than at random, so it changes when the school does and not
 * while you are reading it.
 */
const IDLE = [
  "Quiet week. Everyone turned up.",
  "The corridor's been busy. Good sign.",
  "Nothing to report — which is the report.",
  "Staff are happy. Keep it that way.",
  "Somebody asked about the timetable. I said we'd think about it.",
  "The place is running itself today.",
  "All present. All paid.",
];

const SMALL = "Small school, but it's ours.";

export function adviceFor(mood: SchoolMood): Advice {
  const { weeksOwed, due, morale, canBuild, rooms } = mood;

  if (weeksOwed >= PAYROLL_MAX_WEEKS) {
    return {
      kind: "payroll-heavy",
      text: `Wages are ${weeksOwed} weeks behind. That's as far back as it goes — ${due} to clear it.`,
      action: "pay",
    };
  }
  if (weeksOwed >= 2) {
    return {
      kind: "payroll-due",
      text: `${weeksOwed} weeks of wages outstanding. ${due} clears it.`,
      action: "pay",
    };
  }
  if (weeksOwed === 1) {
    return { kind: "payroll-due", text: `Wages are due — ${due} this week.`, action: "pay" };
  }
  // Only once payroll is clear, because "the place feels quiet" while wages are
  // owed is a diagnosis the player already has.
  if (morale < 70) {
    return {
      kind: "morale-low",
      text: "It's been quiet since the wages went out late. They'll come round.",
      action: null,
    };
  }
  if (canBuild) {
    return { kind: "can-build", text: "There's enough put by for another room.", action: "build" };
  }
  return {
    kind: "idle",
    text: rooms <= 2 ? SMALL : IDLE[rooms % IDLE.length],
    action: null,
  };
}
