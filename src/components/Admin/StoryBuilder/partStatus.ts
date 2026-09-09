// components/Admin/StoryBuilder/partStatus.ts
//
// What a part needs before it can be sold, in one place.
//
// This exists because "done" used to be implied in three different spots — the
// green part chip counted audio + markers, `partsReady` counted the same two,
// and the Publish button counted nothing at all. A story is something people
// BUY, so the answer has to be one rule that the grid, the summary and the
// publish gate all read from.
//
// Adding a seventh element later is one entry in ELEMENTS. Nothing else in the
// builder needs to know it happened.

import type { AdminStory, StoryPart } from "../../../services/adminStoryServices";
import { builtInComicFor } from "../../../modules/story/resolveStory";

export type ElementId = "audio" | "markers" | "comic" | "vocab" | "phrasal" | "quiz";

/** Empty, partially filled, or finished. `n/a` is only ever for optional
 *  elements a story does not use — it reads as "nothing owed", not "missing". */
export type CellState = "done" | "partial" | "empty" | "na";

export interface ElementSpec {
  id: ElementId;
  /** Two letters for the grid header. */
  short: string;
  label: string;
  /**
   * Whether a part is unsellable without it.
   *
   * Phrasal verbs are the one optional element: they are not story points, but
   * they do appear in most stories, so they stay a column and stay out of the
   * verdict. A part with no phrasal verbs is finished; a part with no quiz is
   * not.
   */
  required: boolean;
  /** `story` is passed for the elements whose answer depends on which story
   *  this part belongs to — see the comic below. */
  state: (part: StoryPart, story: AdminStory) => CellState;
  /** Shown inside the cell when it is worth a number rather than a tick. */
  count?: (part: StoryPart) => number;
}

const filled = (n: number): CellState => (n > 0 ? "done" : "empty");

export const ELEMENTS: ElementSpec[] = [
  {
    id: "audio",
    short: "Au",
    label: "Audio",
    required: true,
    state: (p) => (p.audioUrl ? "done" : "empty"),
  },
  {
    id: "markers",
    short: "Mk",
    label: "Markers",
    required: true,
    // Markers without audio are not "partly there", they are stranded — the
    // waveform they refer to does not exist yet.
    state: (p) => (!p.audioUrl ? "empty" : p.timeMarkers.length > 0 ? "done" : "empty"),
    count: (p) => p.timeMarkers.length,
  },
  {
    id: "comic",
    short: "Cm",
    label: "Comic",
    required: true,
    // Three states, not two, because "no comic saved" and "no comic anywhere"
    // are different problems with different fixes.
    //
    // The built-in stories keep their artwork in the app rather than in the
    // database (Player/Comics/comicsData.ts), and an unpublished story falls
    // back to it — so a part can read as empty here while students are looking
    // at the artwork right now. Publishing is what breaks it: a published
    // story is served entirely from the database, artwork included. So a page
    // that exists but is not saved is `partial`, which keeps it out of the
    // sellable count and puts the fix one click away in the Comics panel.
    state: (p, story) =>
      p.comicUrl
        ? "done"
        : builtInComicFor(story.difficulty, story.storyId, p.partNumber)
          ? "partial"
          : "empty",
  },
  {
    id: "vocab",
    short: "Vo",
    label: "Vocabulary",
    required: true,
    state: (p) => filled(p.vocabulary.length),
    count: (p) => p.vocabulary.length,
  },
  {
    id: "phrasal",
    short: "Ph",
    label: "Phrasal verbs",
    required: false,
    state: (p) => (p.phrasalVerbs.length > 0 ? "done" : "na"),
    count: (p) => p.phrasalVerbs.length,
  },
  {
    id: "quiz",
    short: "Qz",
    label: "Quiz",
    required: true,
    state: (p) => filled(p.quiz.length),
    count: (p) => p.quiz.length,
  },
];

export interface PartStatus {
  partNumber: number;
  cells: Record<ElementId, CellState>;
  /** How many of each countable element there are, so the grid can show "12"
   *  rather than a tick where the number is the useful thing. */
  counts: Partial<Record<ElementId, number>>;
  /** Every required element present. */
  sellable: boolean;
  /** Nothing at all in it yet — worth saying differently from "one thing left". */
  empty: boolean;
  /** What is still owed, longest-pole first, in the order of ELEMENTS. */
  missing: ElementSpec[];
}

export function partStatusOf(part: StoryPart, story: AdminStory): PartStatus {
  const cells = {} as Record<ElementId, CellState>;
  const counts: Partial<Record<ElementId, number>> = {};
  const missing: ElementSpec[] = [];

  for (const el of ELEMENTS) {
    const state = el.state(part, story);
    cells[el.id] = state;
    if (el.count) counts[el.id] = el.count(part);
    if (el.required && state !== "done") missing.push(el);
  }

  return {
    partNumber: part.partNumber,
    cells,
    counts,
    sellable: missing.length === 0,
    empty: missing.length === ELEMENTS.filter((e) => e.required).length,
    missing,
  };
}

/** One short line saying what this part still owes. Written for the person
 *  producing the story, so it names the gap rather than counting boxes. */
export function partVerdict(status: PartStatus): string {
  if (status.sellable) return "sellable";
  if (status.empty) return "empty";
  if (status.missing.length === 1) {
    const only = status.missing[0];
    // "not saved" rather than "none": the difference between artwork that does
    // not exist and artwork that exists but would be lost on publish.
    if (status.cells[only.id] === "partial") return `${only.label.toLowerCase()} not saved`;
    return `no ${only.label.toLowerCase()}`;
  }
  return `${status.missing.length} elements missing`;
}

export interface StoryReadiness {
  parts: PartStatus[];
  sellableCount: number;
  total: number;
  /** Every part sellable — the only state in which a paid story is fit to sell. */
  complete: boolean;
  /** Which required elements are outstanding anywhere, with how many parts owe
   *  each. This is the "I never did the quizzes" summary — a column read rather
   *  than a row read. */
  gaps: { element: ElementSpec; parts: number[] }[];
}

export function storyReadiness(story: AdminStory): StoryReadiness {
  const parts = story.parts.map((part) => partStatusOf(part, story));
  const gaps = ELEMENTS.filter((e) => e.required)
    .map((element) => ({
      element,
      parts: parts.filter((p) => p.cells[element.id] !== "done").map((p) => p.partNumber),
    }))
    .filter((g) => g.parts.length > 0);

  const sellableCount = parts.filter((p) => p.sellable).length;
  return {
    parts,
    sellableCount,
    total: parts.length,
    complete: parts.length > 0 && sellableCount === parts.length,
    gaps,
  };
}
