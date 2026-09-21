import type { ComponentType } from 'react';
import RepetitionViz from './visualizations/RepetitionViz';
import SpeedsViz from './visualizations/SpeedsViz';
import NoSubtitlesViz from './visualizations/NoSubtitlesViz';
import EarsOnlyViz from './visualizations/EarsOnlyViz';
import VocabLanguageViz from './visualizations/VocabLanguageViz';
import VisualMemoryViz from './visualizations/VisualMemoryViz';

export type WhyQuestionId =
  | 'repetition'
  | 'speeds'
  | 'noSubtitles'
  | 'earsOnly'
  | 'vocabLanguage'
  | 'visualMemory';

export interface WhyQuestion {
  id: WhyQuestionId;
  Viz: ComponentType;
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

// Every cloud that has ever existed, with its modal visualization. Nothing is
// deleted from here — the hero only *shows* a subset (ACTIVE_WHY_IDS below),
// and the three that are currently parked keep their viz, their translations
// and their modal wired up so restoring one costs a single edit.
//
// Add a new cloud here — everything else (cloud label, modal title,
// translations) is looked up from `homepage.why.${id}.*` by id.
export const ALL_WHY_QUESTIONS: WhyQuestion[] = [
  { id: 'repetition', Viz: RepetitionViz },
  { id: 'speeds', Viz: SpeedsViz },
  { id: 'noSubtitles', Viz: NoSubtitlesViz },
  { id: 'earsOnly', Viz: EarsOnlyViz },
  { id: 'vocabLanguage', Viz: VocabLanguageViz },
  { id: 'visualMemory', Viz: VisualMemoryViz },
];

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
