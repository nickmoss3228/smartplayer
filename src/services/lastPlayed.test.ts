// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  lastPlayedHref,
  lastPlayedTitle,
  loadLastPlayed,
  saveLastPlayed,
  type LastPlayed,
} from './lastPlayed';

const KEY = 'malako:lastPlayed';
const entry = { difficulty: 'easy', storySlug: 'leo', part: 2, titles: { ru: 'Лео', en: 'Leo' } };
const put = (v: unknown) => localStorage.setItem(KEY, JSON.stringify(v));

describe('lastPlayed', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('round-trips a saved entry and stamps `at`', () => {
    const before = Date.now();
    saveLastPlayed(entry);
    const loaded = loadLastPlayed();
    expect(loaded).toMatchObject(entry);
    expect(loaded!.at).toBeGreaterThanOrEqual(before);
    expect(loaded!.at).toBeLessThanOrEqual(Date.now());
  });

  it('returns null with no record', () => {
    expect(loadLastPlayed()).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    localStorage.setItem(KEY, '{not json');
    expect(loadLastPlayed()).toBeNull();
  });

  it.each([0, 1.5, -1])('returns null for part %s', (part) => {
    put({ ...entry, part, at: 1 });
    expect(loadLastPlayed()).toBeNull();
  });

  it.each(['a/b', '../x', 'a b', 'a?b', '', 'é'])('returns null for slug %j', (storySlug) => {
    put({ ...entry, storySlug, at: 1 });
    expect(loadLastPlayed()).toBeNull();
  });

  it('returns null for an odd difficulty or missing titles', () => {
    put({ ...entry, difficulty: 'a/b', at: 1 });
    expect(loadLastPlayed()).toBeNull();
    put({ difficulty: 'easy', storySlug: 'leo', part: 1, at: 1 });
    expect(loadLastPlayed()).toBeNull();
  });

  it('builds the player href', () => {
    saveLastPlayed(entry);
    expect(lastPlayedHref(loadLastPlayed()!)).toBe('/levels/easy/leo/2');
  });

  describe('lastPlayedTitle', () => {
    const rec = (titles: LastPlayed['titles']): LastPlayed => ({ ...entry, titles, at: 1 });

    it('picks the locale title', () => {
      expect(lastPlayedTitle(rec({ ru: 'Лео', en: 'Leo' }), 'ru')).toBe('Лео');
      expect(lastPlayedTitle(rec({ ru: 'Лео', en: 'Leo' }), 'en')).toBe('Leo');
    });

    it('falls back to the other language', () => {
      expect(lastPlayedTitle(rec({ en: 'Leo' }), 'ru')).toBe('Leo');
      expect(lastPlayedTitle(rec({ ru: 'Лео' }), 'en')).toBe('Лео');
    });

    it('falls back to the slug', () => {
      expect(lastPlayedTitle(rec({}), 'ru')).toBe('leo');
      expect(lastPlayedTitle(rec({ ru: '  ', en: '' }), 'en')).toBe('leo');
    });
  });
});
