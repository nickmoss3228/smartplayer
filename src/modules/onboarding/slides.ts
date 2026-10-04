import {
  METHOD_SCENES,
  type WhyQuestionId,
} from '../../components/Homepage/WhyClouds/whyCloudsData';
import { SCENE_CYCLE_S, type SceneId } from '../../components/Method/scenes';

/**
 * The method slides: one per picture, in the login screen's order — three
 * passes (3 repetitions + 3 speeds), the subtitle that goes away (no subtitles
 * + ears only), the word that becomes the thing, the word found in the comic,
 * and the five-step loop of every story.
 */
export type SlideId = SceneId;

export const SLIDES: SlideId[] = [...METHOD_SCENES.map((s) => s.scene), 'loop'];

/** The why-questions a slide answers; none for the loop. */
export const slideQuestions = (slide: SlideId): WhyQuestionId[] =>
  METHOD_SCENES.find((s) => s.scene === slide)?.ids ?? [];

/** Nobody advances in less than this, however short the picture. */
export const MIN_DWELL_MS = 4000;

/**
 * How long a slide must be on screen before "Next" unlocks: one full round of
 * its picture. The text sits beside it from the start, so it is read while
 * the picture plays.
 *
 * With reduced motion the picture is a still frame, so there is nothing to
 * wait for but the reading: the dwell floor alone.
 */
export const unlockMsFor = (slide: SlideId, reducedMotion: boolean): number =>
  reducedMotion ? MIN_DWELL_MS : Math.max(MIN_DWELL_MS, SCENE_CYCLE_S[slide] * 1000);
