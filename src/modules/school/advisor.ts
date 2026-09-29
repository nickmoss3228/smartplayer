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
//
// Like staffNotes.ts it returns a translation KEY and its parameters, not
// English: the page says it in the player's language (`school.advisor.*`).

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
  /** A key under `school.advisor`. */
  line: string;
  /** Its parameters. `count` is there for the plural forms. */
  params: Record<string, number>;
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
const IDLE = ["idle0", "idle1", "idle2", "idle3", "idle4", "idle5", "idle6"];

export function adviceFor(mood: SchoolMood): Advice {
  const { weeksOwed, due, morale, canBuild, rooms } = mood;

  if (weeksOwed >= PAYROLL_MAX_WEEKS) {
    return {
      kind: "payroll-heavy",
      line: "payrollHeavy",
      params: { count: weeksOwed, due },
      action: "pay",
    };
  }
  if (weeksOwed >= 2) {
    return {
      kind: "payroll-due",
      line: "payrollBehind",
      params: { count: weeksOwed, due },
      action: "pay",
    };
  }
  if (weeksOwed === 1) {
    return { kind: "payroll-due", line: "payrollDue", params: { due }, action: "pay" };
  }
  // Only once payroll is clear, because "the place feels quiet" while wages are
  // owed is a diagnosis the player already has.
  if (morale < 70) {
    return { kind: "morale-low", line: "moraleLow", params: {}, action: null };
  }
  if (canBuild) {
    return { kind: "can-build", line: "canBuild", params: {}, action: "build" };
  }
  return {
    kind: "idle",
    line: rooms <= 2 ? "small" : IDLE[rooms % IDLE.length],
    params: {},
    action: null,
  };
}
