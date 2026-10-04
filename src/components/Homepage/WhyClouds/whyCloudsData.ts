import type { SceneId } from '../../Method/scenes';

export type WhyQuestionId =
  | 'repetition'
  | 'speeds'
  | 'noSubtitles'
  | 'earsOnly'
  | 'vocabLanguage'
  | 'visualMemory';

export interface WhyQuestion {
  id: WhyQuestionId;
  /**
   * Which of the five method pictures explains it (Method/MethodScene.tsx) —
   * the same drawings the login screen plays. Two pairs share one: a single
   * phrase at three speeds is both "3 repetitions" and "3 speeds", and the
   * caption draining away is both "no subtitles" and "ears only".
   */
  scene: Exclude<SceneId, 'loop'>;
}

/**
 * Blob colour pairs, one per cloud, cycling through a soft pastel set.
 *
 * Lives here rather than in Cloud.tsx because two surfaces now paint from it:
 * the hero clouds, and the /how-to-use guide, where each question's section is
 * washed in the same pair as the cloud that opens it. A student who taps a
 * cloud on the homepage lands on a block tinted like the cloud they tapped.
 *
 * Indexed by position in ALL_WHY_QUESTIONS, so a cloud keeps its colour even
 * when the hero shows only a subset.
 */
export const BLOB_COLORS: [string, string][] = [
  ['#bae6fd', '#c7d2fe'], // sky -> indigo
  ['#fecdd3', '#fed7aa'], // rose -> orange
  ['#a7f3d0', '#a5f3fc'], // emerald -> cyan
  ['#ddd6fe', '#bfdbfe'], // violet -> blue
  ['#fde68a', '#fbcfe8'], // amber -> pink
  ['#bbf7d0', '#fef08a'], // green -> yellow
];

// Every cloud that has ever existed, with the picture that explains it. Nothing
// is deleted from here — the hero only *shows* a subset (ACTIVE_WHY_IDS below),
// and the three that are currently parked keep their picture, their
// translations and their modal wired up so restoring one costs a single edit.
//
// Until 2026-10-04 each cloud had its own infographic (visualizations/*). They
// were replaced everywhere by the login screen's scenes; the old components
// are no longer referenced from anywhere.
//
// Add a new cloud here — everything else (cloud label, modal title,
// translations) is looked up from `homepage.why.${id}.*` by id.
export const ALL_WHY_QUESTIONS: WhyQuestion[] = [
  { id: 'repetition', scene: 'passes' },
  { id: 'speeds', scene: 'passes' },
  { id: 'noSubtitles', scene: 'subtitles' },
  { id: 'earsOnly', scene: 'subtitles' },
  { id: 'vocabLanguage', scene: 'word' },
  { id: 'visualMemory', scene: 'comic' },
];

/**
 * All six questions as one argument, in the order it is made:
 *
 *   player → what happens to one sentence (3 repetitions, 3 speeds)
 *   taken  → the three crutches removed on purpose
 *   given  → the one crutch handed back (comics / visual memory)
 *
 * /how-to-use lays the guide out in these groups. Copy for each group lives
 * under `howToUse.groups.${key}.*`.
 */
export const METHOD_GROUPS: { key: 'player' | 'taken' | 'given'; ids: WhyQuestionId[] }[] = [
  { key: 'player', ids: ['repetition', 'speeds'] },
  { key: 'taken', ids: ['noSubtitles', 'earsOnly', 'vocabLanguage'] },
  { key: 'given', ids: ['visualMemory'] },
];

export const METHOD_ORDER: WhyQuestionId[] = METHOD_GROUPS.flatMap((g) => g.ids);

/**
 * The same argument, one picture at a time: consecutive questions that share
 * a scene are told together, under one drawing, so the same animation never
 * plays twice in a row. Four pictures for six questions — the onboarding
 * slides are exactly these (plus the loop), and /how-to-use groups its
 * questions the same way within each section.
 */
export const METHOD_SCENES: { scene: WhyQuestion['scene']; ids: WhyQuestionId[] }[] =
  groupByScene(METHOD_ORDER);

/** Consecutive ids that share a scene, as one entry each, in order. */
export function groupByScene(
  ids: readonly WhyQuestionId[],
): { scene: WhyQuestion['scene']; ids: WhyQuestionId[] }[] {
  const out: { scene: WhyQuestion['scene']; ids: WhyQuestionId[] }[] = [];
  for (const id of ids) {
    const { scene } = whyQuestionById(id).question;
    const last = out[out.length - 1];
    if (last && last.scene === scene) last.ids.push(id);
    else out.push({ scene, ids: [id] });
  }
  return out;
}

/** The question, with its index in ALL_WHY_QUESTIONS (which picks its BLOB_COLORS pair). */
export function whyQuestionById(id: WhyQuestionId): { question: WhyQuestion; index: number } {
  const index = ALL_WHY_QUESTIONS.findIndex((q) => q.id === id);
  return { question: ALL_WHY_QUESTIONS[index], index };
}

/**
 * The clouds the hero actually renders, in order.
 *
 * Six question-clouds ("Why 3 repetitions?", "Why no subtitles?", …) filled the
 * hero with six things to read before the eye reached the Start button. The
 * hero now carries three statements instead — the method in one breath:
 * 3 repetitions · 3 speeds · your ears only. They are still buttons, and still
 * open the same explanation modals; only the count and the wording changed
 * (question copy lives on under `homepage.why.${id}.cloud`, the statement under
 * `homepage.why.${id}.slogan`).
 *
 * TO GO BACK to all six: replace this list with `ALL_WHY_QUESTIONS.map(q => q.id)`
 * and switch WhyCloudsSection's label from `.slogan` back to `.cloud`.
 */
export const ACTIVE_WHY_IDS: WhyQuestionId[] = ['repetition', 'speeds', 'earsOnly'];

export const whyQuestions: WhyQuestion[] = ACTIVE_WHY_IDS.map(
  (id) => ALL_WHY_QUESTIONS.find((q) => q.id === id)!,
);
