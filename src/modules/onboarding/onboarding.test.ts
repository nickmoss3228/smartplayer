import { describe, it, expect } from 'vitest';

import {
  ENGLISH_LEVEL_OPTIONS,
  LISTENING_OPTIONS,
  difficultyForLevel,
} from './onboardingOptions';
import { shouldRedirectToOnboarding } from './gate';
import { onboardingDestination, skipDestination } from './destination';
import { TOUR_ORDER } from './tourFeatures';
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

describe('feature tour', () => {
  it('shows the six sections, in order', () => {
    expect(TOUR_ORDER).toEqual(['player', 'words', 'quiz', 'points', 'school', 'dashboard']);
  });

  it('has its copy in both languages', () => {
    type TourCopy = Record<string, { title?: string; text?: string } | string | undefined>;
    for (const locale of [ru, en] as unknown as { onboarding: { tour: TourCopy; skip?: string } }[]) {
      const tour = locale.onboarding.tour;
      for (const id of TOUR_ORDER) {
        const card = tour[id] as { title?: string; text?: string } | undefined;
        expect(card?.title, id).toBeTruthy();
        expect(card?.text, id).toBeTruthy();
      }
      for (const key of ['eyebrow', 'title', 'menu', 'guide']) expect(tour[key], key).toBeTruthy();
      expect(locale.onboarding.skip).toBeTruthy();
    }
  });
});

describe('skipDestination', () => {
  it('goes to the hub when the student was headed nowhere specific', () => {
    expect(skipDestination(null).to).toBe('/home');
    expect(skipDestination({ returnTo: '/welcome' }).to).toBe('/home');
    expect(skipDestination({ returnTo: '/' }).to).toBe('/home');
  });

  it('keeps a destination it interrupted, never a suggested shelf', () => {
    expect(skipDestination({ returnTo: '/levels' }).to).toBe('/levels');
    expect(skipDestination({ returnTo: '/levels/easy/leo', openPaywall: true })).toEqual({
      to: '/levels/easy/leo',
      state: { openPaywall: true, highlightSku: undefined },
    });
  });

  it('never leaves the app', () => {
    expect(skipDestination({ returnTo: '//evil.example' }).to).toBe('/home');
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
