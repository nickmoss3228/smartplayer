import type { IconType } from 'react-icons';
import {
  IoVolumeMuteOutline,
  IoTextOutline,
  IoHeadsetOutline,
  IoSchoolOutline,
  IoGlobeOutline,
} from 'react-icons/io5';
import type { DifficultySlug } from '../../types/storyGroups';

/**
 * The two questions of the /welcome flow. The ids are stored on the account
 * as-is; backend/src/config/onboarding.js holds the same lists (and the DB
 * CHECKs mirror those) — onboardingOptions.test.ts keeps all three in step.
 * Labels live under `onboarding.level.options.<id>` / `onboarding.listening.options.<id>`.
 */

export type EnglishLevel =
  | 'beginner'
  | 'elementary'
  | 'intermediate'
  | 'upper_intermediate'
  | 'advanced';

export type ListeningExperience =
  | 'none'
  | 'subtitles'
  | 'no_subtitles'
  | 'courses'
  | 'immersion';

/**
 * Which shelf an answer opens. Deliberately conservative — people rate their
 * English by what they can read and say, and listening trails both — so the
 * two middle answers share Medium and only "advanced" reaches Hard.
 */
const LEVEL_DIFFICULTY: Record<EnglishLevel, DifficultySlug> = {
  beginner: 'easy',
  elementary: 'easy',
  intermediate: 'medium',
  upper_intermediate: 'medium',
  advanced: 'hard',
};

export const difficultyForLevel = (level: EnglishLevel): DifficultySlug =>
  LEVEL_DIFFICULTY[level];

/** Easiest first. `fill` is the milk in the option's little glass. */
export const ENGLISH_LEVEL_OPTIONS: { id: EnglishLevel; fill: number }[] = [
  { id: 'beginner', fill: 0.14 },
  { id: 'elementary', fill: 0.3 },
  { id: 'intermediate', fill: 0.5 },
  { id: 'upper_intermediate', fill: 0.7 },
  { id: 'advanced', fill: 0.92 },
];

/** Least listening first. */
export const LISTENING_OPTIONS: { id: ListeningExperience; Icon: IconType }[] = [
  { id: 'none', Icon: IoVolumeMuteOutline },
  { id: 'subtitles', Icon: IoTextOutline },
  { id: 'no_subtitles', Icon: IoHeadsetOutline },
  { id: 'courses', Icon: IoSchoolOutline },
  { id: 'immersion', Icon: IoGlobeOutline },
];

export const isEnglishLevel = (value: unknown): value is EnglishLevel =>
  ENGLISH_LEVEL_OPTIONS.some((o) => o.id === value);

export const isListeningExperience = (value: unknown): value is ListeningExperience =>
  LISTENING_OPTIONS.some((o) => o.id === value);
