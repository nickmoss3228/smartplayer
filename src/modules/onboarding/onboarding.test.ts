import { describe, it, expect } from 'vitest';

import {
  ENGLISH_LEVEL_OPTIONS,
  LISTENING_OPTIONS,
  difficultyForLevel,
} from './onboardingOptions';
import { shouldRedirectToOnboarding } from './gate';
import { SLIDES, MIN_DWELL_MS, slideQuestions, unlockMsFor } from './slides';
import { onboardingDestination } from './destination';
import { ALL_WHY_QUESTIONS, METHOD_ORDER } from '../../components/Homepage/WhyClouds/whyCloudsData';
import { SCENE_CYCLE_S, SCENE_ORDER } from '../../components/Method/scenes';
import { ENGLISH_LEVELS, LISTENING_EXPERIENCES } from '../../../backend/src/config/onboarding.js';
import ru from '../../locales/ru/translation.json';
import en from '../../locales/en/translation.json';
import type { User } from '../../types/Auth';

const user = (onboardedAt: string | null | undefined): User => ({
  id: 'u1',
  username: 'u',
  email: 'u@example.test',
  ...(onboardedAt === undefined ? {} : { onboardedAt }),
});

describe('onboarding options', () => {
  it('mirror the ids the server stores (backend/src/config/onboarding.js)', () => {
    expect(ENGLISH_LEVEL_OPTIONS.map((o) => o.id)).toEqual(ENGLISH_LEVELS);
    expect(LISTENING_OPTIONS.map((o) => o.id)).toEqual(LISTENING_EXPERIENCES);
  });

  it('map every level to a shelf, conservatively', () => {
    expect(ENGLISH_LEVEL_OPTIONS.map((o) => difficultyForLevel(o.id))).toEqual([
      'easy',
      'easy',
      'medium',
      'medium',
      'hard',
    ]);
  });

  it('have their copy in both languages', () => {
    type OnboardingCopy = {
      level: { options: Record<string, { label?: string; hint?: string } | undefined> };
      listening: { options: Record<string, string | undefined> };
    };
    for (const locale of [ru, en] as unknown as { onboarding: OnboardingCopy }[]) {
      const o = locale.onboarding;
      for (const { id } of ENGLISH_LEVEL_OPTIONS) {
        expect(o.level.options[id]?.label, id).toBeTruthy();
        expect(o.level.options[id]?.hint, id).toBeTruthy();
      }
      for (const { id } of LISTENING_OPTIONS) {
        expect(o.listening.options[id], id).toBeTruthy();
      }
    }
  });
});

describe('shouldRedirectToOnboarding', () => {
  it('sends a not-yet-onboarded account to /welcome from app pages', () => {
    for (const path of ['/', '/levels', '/levels/easy/leo', '/dashboard', '/how-to-use']) {
      expect(shouldRedirectToOnboarding(user(null), path), path).toBe(true);
    }
  });

  it('never gates guests, finished accounts, or an older server (field absent)', () => {
    expect(shouldRedirectToOnboarding(null, '/levels')).toBe(false);
    expect(shouldRedirectToOnboarding(user('2026-10-04T10:00:00.000Z'), '/levels')).toBe(false);
    expect(shouldRedirectToOnboarding(user(undefined), '/levels')).toBe(false);
  });

  it('leaves the exempt pages alone', () => {
    for (const path of [
      '/welcome',
      '/login',
      '/signup',
      '/forgot-password',
      '/admin',
      '/legal/terms',
      '/checkout/return',
    ]) {
      expect(shouldRedirectToOnboarding(user(null), path), path).toBe(false);
    }
  });
});

describe('slides', () => {
  it("are the login screen's five pictures, in its order", () => {
    expect(SLIDES).toEqual(SCENE_ORDER);
  });

  it('tell every why-question exactly once, in the guide order', () => {
    expect(SLIDES.flatMap(slideQuestions)).toEqual(METHOD_ORDER);
    expect(new Set(METHOD_ORDER)).toEqual(new Set(ALL_WHY_QUESTIONS.map((q) => q.id)));
    expect(slideQuestions('passes')).toEqual(['repetition', 'speeds']);
    expect(slideQuestions('subtitles')).toEqual(['noSubtitles', 'earsOnly']);
    expect(slideQuestions('loop')).toEqual([]);
  });

  it('unlock after one full round of the picture, never under the floor', () => {
    for (const slide of SLIDES) {
      const ms = unlockMsFor(slide, false);
      expect(ms).toBeGreaterThanOrEqual(MIN_DWELL_MS);
      expect(ms).toBe(Math.max(MIN_DWELL_MS, SCENE_CYCLE_S[slide] * 1000));
    }
  });

  it('with reduced motion wait only the reading floor', () => {
    for (const slide of SLIDES) expect(unlockMsFor(slide, true)).toBe(MIN_DWELL_MS);
  });
});

describe('onboardingDestination', () => {
  it('opens the suggested shelf when sign-up was headed for the level picker', () => {
    expect(onboardingDestination({ returnTo: '/levels' }, 'medium')).toEqual({
      to: '/levels/medium',
      state: { onboardingPick: 'medium' },
    });
    expect(onboardingDestination(null, 'easy').to).toBe('/levels/easy');
  });

  it('goes back to a paywall it interrupted, flag intact', () => {
    expect(
      onboardingDestination({ returnTo: '/levels/easy/leo', openPaywall: true }, 'hard'),
    ).toEqual({ to: '/levels/easy/leo', state: { openPaywall: true, highlightSku: undefined } });
  });

  it('never leaves the app', () => {
    expect(onboardingDestination({ returnTo: '//evil.example' }, 'easy').to).toBe('/levels/easy');
  });
});
