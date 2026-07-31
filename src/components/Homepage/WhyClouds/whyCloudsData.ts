import type { ComponentType } from 'react';
import RepetitionViz from './visualizations/RepetitionViz';
import SpeedsViz from './visualizations/SpeedsViz';
import NoSubtitlesViz from './visualizations/NoSubtitlesViz';
import EarsOnlyViz from './visualizations/EarsOnlyViz';
import VisualThinkingViz from './visualizations/VisualThinkingViz';

export type WhyQuestionId =
  | 'repetition'
  | 'speeds'
  | 'noSubtitles'
  | 'earsOnly'
  | 'visualThinking';

export interface WhyQuestion {
  id: WhyQuestionId;
  Viz: ComponentType;
}

// Add/remove a cloud here — everything else (label, modal title, translations)
// is looked up from `homepage.why.${id}.*` by id.
export const whyQuestions: WhyQuestion[] = [
  { id: 'repetition', Viz: RepetitionViz },
  { id: 'speeds', Viz: SpeedsViz },
  { id: 'noSubtitles', Viz: NoSubtitlesViz },
  { id: 'earsOnly', Viz: EarsOnlyViz },
  { id: 'visualThinking', Viz: VisualThinkingViz },
];
