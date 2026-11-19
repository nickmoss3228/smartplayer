import { describe, expect, it } from 'vitest';
import type { DetailedProgressMap, Difficulty, OverviewData } from '../../types/Dashboard';
import type { LastPlayed } from '../../services/lastPlayed';
import { partsCompletedSince, pickContinue, startedStories, startOfWeek } from './hubData';

type S = [id: string, total: number, done: number[]];

const story = ([storyId, totalParts, completedParts]: S, name = storyId.toUpperCase()) => ({
  storyId,
  storyName: name,
  characterIcon: '',
  totalParts,
  completedParts,
  currentPart: 1,
});

const mkOverview = (spec: Partial<Record<Difficulty, S[]>>): OverviewData => {
  const out = {} as OverviewData;
  for (const d of ['easy', 'medium', 'hard'] as Difficulty[]) {
    const stories = (spec[d] ?? []).map((s) => story(s));
    out[d] = { completed: 0, total: stories.length, stories };
  }
  return out;
};

/** results: { easy: { 'leo:1': '2026-01-01T00:00:00Z' } } - all marked completed. */
const mkDetailed = (spec: Partial<Record<Difficulty, Record<string, string | null>>>): DetailedProgressMap => {
  const out: DetailedProgressMap = {};
  for (const [d, res] of Object.entries(spec)) {
    const levelResults: Record<string, { completed: boolean; correctAnswers: number; totalQuestions: number; completedAt?: string }> = {};
    for (const [k, at] of Object.entries(res!)) {
      levelResults[k] = { completed: true, correctAnswers: 1, totalQuestions: 1, ...(at ? { completedAt: at } : {}) };
    }
    out[d] = { totalLevels: 0, completedLevels: [], currentLevel: 1, levelResults };
  }
  return out;
};

const iso = (ms: number) => new Date(ms).toISOString();
const T1 = Date.UTC(2026, 0, 1);
const T2 = Date.UTC(2026, 0, 2);
const T3 = Date.UTC(2026, 0, 3);

const lp = (over: Partial<LastPlayed> = {}): LastPlayed => ({
  difficulty: 'easy',
  storySlug: 'leo',
  part: 2,
  titles: { ru: 'Лео', en: 'Leo' },
  at: T2,
  ...over,
});

describe('pickContinue', () => {
  const base = { lastPlayed: null, overview: null, detailed: null, locale: 'en' };

  it('returns null with nothing at all', () => {
    expect(pickContinue(base)).toBeNull();
  });

  it('returns null for an empty overview and no history', () => {
    expect(pickContinue({ ...base, overview: mkOverview({}) })).toBeNull();
  });

  describe('server candidate', () => {
    it('opens the lowest undone part of the newest-completed story', () => {
      const overview = mkOverview({ easy: [['leo', 4, [1, 3]]], medium: [['ann', 3, [1]]] });
      const detailed = mkDetailed({
        easy: { 'leo:1': iso(T1), 'leo:3': iso(T2) },
        medium: { 'ann:1': iso(T3) },
      });
      const r = pickContinue({ ...base, overview, detailed })!;
      expect(r).toMatchObject({
        source: 'server',
        difficulty: 'medium',
        storyId: 'ann',
        part: 2,
        totalParts: 3,
        completedParts: [1],
        title: 'ANN',
        href: '/levels/medium/ann/2',
      });
    });

    it('opens the key part when the story is not in overview', () => {
      const detailed = mkDetailed({ easy: { 'ghost:3': iso(T1) } });
      const r = pickContinue({ ...base, overview: mkOverview({ easy: [['leo', 2, []]] }), detailed })!;
      expect(r).toMatchObject({
        source: 'server',
        storyId: 'ghost',
        part: 3,
        totalParts: null,
        completedParts: [],
        title: 'ghost',
      });
    });

    it('falls back to the newest unfinished story when the newest is fully done', () => {
      const overview = mkOverview({
        easy: [['done', 2, [1, 2]], ['old', 3, [1]]],
        hard: [['mid', 3, [2]]],
      });
      const detailed = mkDetailed({
        easy: { 'done:1': iso(T2), 'done:2': iso(T3), 'old:1': iso(T1) },
        hard: { 'mid:2': iso(T2) },
      });
      const r = pickContinue({ ...base, overview, detailed })!;
      expect(r).toMatchObject({ source: 'server', difficulty: 'hard', storyId: 'mid', part: 1 });
    });

    it('has no server candidate when every story is done', () => {
      const overview = mkOverview({ easy: [['done', 1, [1]], ['other', 2, []]] });
      const detailed = mkDetailed({ easy: { 'done:1': iso(T1) } });
      const r = pickContinue({ ...base, overview, detailed })!;
      expect(r).toMatchObject({ source: 'start', storyId: 'done', part: 1 });
    });

    it('ignores entries that are not completed or have no timestamp', () => {
      const overview = mkOverview({ easy: [['leo', 3, []]] });
      const detailed = mkDetailed({ easy: { 'leo:1': null } });
      detailed.easy.levelResults!['leo:2'] = { completed: false, correctAnswers: 0, totalQuestions: 1, completedAt: iso(T3) };
      expect(pickContinue({ ...base, overview, detailed })!.source).toBe('start');
    });
  });

  describe('device candidate', () => {
    const overview = mkOverview({ easy: [['leo', 4, [1, 2]]] });

    it('uses the lastPlayed part and its localized title', () => {
      const r = pickContinue({ ...base, overview, lastPlayed: lp({ part: 4 }), locale: 'ru' })!;
      expect(r).toMatchObject({
        source: 'device',
        part: 4,
        title: 'Лео',
        href: '/levels/easy/leo/4',
        totalParts: 4,
        completedParts: [1, 2],
      });
    });

    it('moves to the lowest undone part when the played part is already done', () => {
      const r = pickContinue({ ...base, overview, lastPlayed: lp({ part: 2 }) })!;
      expect(r).toMatchObject({ source: 'device', part: 3 });
    });

    it('has no device candidate when the story is fully done', () => {
      const done = mkOverview({ easy: [['leo', 2, [1, 2]], ['next', 2, []]] });
      const r = pickContinue({ ...base, overview: done, lastPlayed: lp() })!;
      expect(r).toMatchObject({ source: 'start', storyId: 'leo' });
    });

    it('fully-done device story yields to the server candidate', () => {
      const ov = mkOverview({ easy: [['leo', 2, [1, 2]]], medium: [['ann', 3, [1]]] });
      const detailed = mkDetailed({ medium: { 'ann:1': iso(T1) } });
      const r = pickContinue({ ...base, overview: ov, detailed, lastPlayed: lp({ at: T3 }) })!;
      expect(r).toMatchObject({ source: 'server', storyId: 'ann', part: 2 });
    });

    it('works with a null overview and keeps the part as is', () => {
      const r = pickContinue({ ...base, lastPlayed: lp() })!;
      expect(r).toMatchObject({ source: 'device', part: 2, totalParts: null, completedParts: [], title: 'Leo' });
    });

    it('ignores an unknown difficulty', () => {
      expect(pickContinue({ ...base, lastPlayed: lp({ difficulty: 'expert' }) })).toBeNull();
    });
  });

  describe('device vs server', () => {
    const overview = mkOverview({ easy: [['leo', 4, [1]]], medium: [['ann', 3, [1]]] });
    const detailed = mkDetailed({ medium: { 'ann:1': iso(T2) } });

    it('device wins on a tie in time', () => {
      expect(pickContinue({ ...base, overview, detailed, lastPlayed: lp({ at: T2 }) })!.source).toBe('device');
    });

    it('device wins when newer', () => {
      expect(pickContinue({ ...base, overview, detailed, lastPlayed: lp({ at: T2 + 1 }) })!.source).toBe('device');
    });

    it('server wins when device is older', () => {
      const r = pickContinue({ ...base, overview, detailed, lastPlayed: lp({ at: T2 - 1 }) })!;
      expect(r).toMatchObject({ source: 'server', storyId: 'ann', title: 'ANN' });
    });
  });

  describe('start', () => {
    const overview = mkOverview({ easy: [['e1', 2, []]], medium: [['m1', 2, []]], hard: [['h1', 2, []]] });

    it('defaults to the first easy story', () => {
      expect(pickContinue({ ...base, overview })).toMatchObject({
        source: 'start',
        difficulty: 'easy',
        storyId: 'e1',
        part: 1,
        href: '/levels/easy/e1/1',
        title: 'E1',
      });
    });

    it('uses the suggested level', () => {
      expect(pickContinue({ ...base, overview, suggestedLevel: 'hard' })).toMatchObject({ storyId: 'h1' });
    });

    it('falls back to any difficulty when the suggested level is empty', () => {
      const ov = mkOverview({ medium: [['m1', 2, []]] });
      expect(pickContinue({ ...base, overview: ov, suggestedLevel: 'hard' })).toMatchObject({
        difficulty: 'medium',
        storyId: 'm1',
      });
    });

    it('falls back to storyId when storyName is empty', () => {
      const ov = mkOverview({ easy: [['e1', 2, []]] });
      ov.easy.stories[0].storyName = '';
      expect(pickContinue({ ...base, overview: ov })!.title).toBe('e1');
    });
  });

  describe('partial and malformed data', () => {
    it('skips malformed keys and unknown difficulties without throwing', () => {
      const overview = mkOverview({ easy: [['leo', 3, []]] });
      const detailed = mkDetailed({
        easy: { nocolon: iso(T3), 'leo:abc': iso(T3), 'leo:1.5': iso(T3), ':2': iso(T3), 'leo:0': iso(T3), 'leo:2': iso(T1) },
      });
      detailed.expert = detailed.easy;
      const r = pickContinue({ ...base, overview, detailed })!;
      expect(r).toMatchObject({ source: 'server', storyId: 'leo', part: 1 });
    });

    it('survives a bad timestamp, missing levelResults and a hollow overview', () => {
      const detailed: DetailedProgressMap = {
        easy: { totalLevels: 0, completedLevels: [], currentLevel: 1 },
        medium: mkDetailed({ medium: { 'a:1': 'not a date' } }).medium,
      };
      const overview = { easy: {} } as unknown as OverviewData;
      expect(() => pickContinue({ ...base, overview, detailed })).not.toThrow();
      expect(pickContinue({ ...base, overview, detailed })).toBeNull();
    });
  });
});

describe('startedStories', () => {
  const overview = mkOverview({
    easy: [['e-new', 4, [1, 2]], ['e-untimed', 3, [1]], ['e-zero', 3, []], ['e-done', 2, [1, 2]]],
    medium: [['m-old', 3, [1]], ['m-untimed', 2, [1]]],
    hard: [['h-mid', 5, [2, 3]]],
  });
  const detailed = mkDetailed({
    easy: { 'e-new:1': iso(T1), 'e-new:2': iso(T3) },
    medium: { 'm-old:1': iso(T1) },
    hard: { 'h-mid:2': iso(T2), 'h-mid:3': iso(T2) },
  });

  it('keeps only partly done stories, newest first, untimed last in overview order', () => {
    const r = startedStories({ overview, detailed });
    expect(r.map((s) => s.storyId)).toEqual(['e-new', 'h-mid', 'm-old', 'e-untimed', 'm-untimed']);
  });

  it('fills the fields', () => {
    const [first, , , third] = startedStories({ overview, detailed });
    expect(first).toEqual({
      difficulty: 'easy',
      storyId: 'e-new',
      title: 'E-NEW',
      done: 2,
      total: 4,
      nextPart: 3,
      href: '/levels/easy/e-new',
    });
    expect(third.nextPart).toBe(2);
    expect(startedStories({ overview, detailed }).find((s) => s.storyId === 'h-mid')!.nextPart).toBe(1);
  });

  it('applies exclude and limit', () => {
    const r = startedStories({ overview, detailed, exclude: { difficulty: 'easy', storyId: 'e-new' }, limit: 2 });
    expect(r.map((s) => s.storyId)).toEqual(['h-mid', 'm-old']);
  });

  it('does not exclude a same-named story in another difficulty', () => {
    const ov = mkOverview({ easy: [['x', 2, [1]]], hard: [['x', 2, [1]]] });
    const r = startedStories({ overview: ov, detailed: null, exclude: { difficulty: 'easy', storyId: 'x' } });
    expect(r.map((s) => s.difficulty)).toEqual(['hard']);
  });

  it('falls back to storyId for an empty name', () => {
    const ov = mkOverview({ easy: [['x', 2, [1]]] });
    ov.easy.stories[0].storyName = '';
    expect(startedStories({ overview: ov, detailed: null })[0].title).toBe('x');
  });

  it('copes with null inputs and malformed keys', () => {
    expect(startedStories({ overview: null, detailed: null })).toEqual([]);
    const d = mkDetailed({ easy: { junk: iso(T3), 'e-untimed:x': iso(T3) } });
    // malformed keys give no timestamps, so plain difficulty/overview order
    expect(startedStories({ overview, detailed: d }).map((s) => s.storyId)).toEqual([
      'e-new',
      'e-untimed',
      'm-old',
      'm-untimed',
      'h-mid',
    ]);
  });
});

describe('startOfWeek', () => {
  it('returns Monday 00:00 local for a Wednesday', () => {
    const r = new Date(startOfWeek(new Date(2026, 0, 14, 15, 30)));
    expect([r.getFullYear(), r.getMonth(), r.getDate(), r.getHours(), r.getMinutes()]).toEqual([2026, 0, 12, 0, 0]);
    expect(r.getDay()).toBe(1);
  });

  it('keeps Monday itself', () => {
    const r = new Date(startOfWeek(new Date(2026, 0, 12, 0, 0)));
    expect(r.getDate()).toBe(12);
  });

  it('maps Sunday to the previous Monday, across a month boundary', () => {
    const r = new Date(startOfWeek(new Date(2026, 1, 1, 23, 59)));
    expect([r.getMonth(), r.getDate()]).toEqual([0, 26]);
  });
});

describe('partsCompletedSince', () => {
  const detailed = mkDetailed({
    easy: { 'a:1': iso(T1), 'a:2': iso(T2), bad: iso(T3), 'a:3': null },
    hard: { 'b:1': iso(T3) },
  });
  detailed.hard.levelResults!['b:2'] = { completed: false, correctAnswers: 0, totalQuestions: 1, completedAt: iso(T3) };

  it('counts completed entries at or after the boundary, across difficulties', () => {
    expect(partsCompletedSince(detailed, T2)).toBe(2);
    expect(partsCompletedSince(detailed, T1)).toBe(3);
    expect(partsCompletedSince(detailed, T3 + 1)).toBe(0);
  });

  it('is 0 for null or missing results', () => {
    expect(partsCompletedSince(null, 0)).toBe(0);
    expect(partsCompletedSince({ easy: { totalLevels: 0, completedLevels: [], currentLevel: 1 } }, 0)).toBe(0);
  });
});
