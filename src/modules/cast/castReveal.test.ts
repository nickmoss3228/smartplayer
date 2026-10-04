import { describe, it, expect } from 'vitest';
import { castCards, reachedPart } from './castReveal';
import type { CastMember } from '../../services/storyServices';

const member = (key: string, firstPart: number, extra: Partial<CastMember> = {}): CastMember => ({
  key,
  name: { en: key.toUpperCase(), ru: `${key}-ru` },
  role: { en: `${key} role`, ru: '' },
  bio: { en: '', ru: `${key} био` },
  imageUrl: null,
  firstPart,
  ...extra,
});

describe('reachedPart', () => {
  it('is part 1 for someone who has not started', () => {
    expect(reachedPart({ completedParts: [], currentPart: undefined, totalParts: 10 })).toBe(1);
    expect(reachedPart({ completedParts: [], currentPart: 1, totalParts: 10 })).toBe(1);
  });

  it('is the part after the furthest completed', () => {
    expect(reachedPart({ completedParts: [1, 2], currentPart: 1, totalParts: 10 })).toBe(3);
    // Out of order still counts the furthest.
    expect(reachedPart({ completedParts: [7], currentPart: 1, totalParts: 10 })).toBe(8);
  });

  it('takes the current part when it is further', () => {
    expect(reachedPart({ completedParts: [1], currentPart: 5, totalParts: 10 })).toBe(5);
  });

  it('stays inside the story when everything is done', () => {
    expect(reachedPart({ completedParts: [1, 2, 3], currentPart: 4, totalParts: 3 })).toBe(3);
  });
});

describe('castCards', () => {
  const cast = [member('leo', 1), member('sam', 9), member('ginger', 1), member('mum', 3), member('dad', 3)];

  it('reveals who has been reached, in the admin order, then the rest soonest first', () => {
    const cards = castCards(cast, 1, 'en');
    expect(cards.map((c) => [c.key, c.locked])).toEqual([
      ['leo', false],
      ['ginger', false],
      ['mum', true],
      ['dad', true],
      ['sam', true],
    ]);
  });

  it('gives a locked card nothing to leak', () => {
    const locked = castCards(cast, 1, 'en').filter((c) => c.locked);
    for (const card of locked) {
      expect(Object.keys(card).sort()).toEqual(['firstPart', 'key', 'locked']);
    }
  });

  it('reveals on reaching the part, not on finishing it', () => {
    expect(castCards(cast, 3, 'en').find((c) => c.key === 'mum')?.locked).toBe(false);
  });

  it("reads the reader's language and falls back to the other", () => {
    const [leo] = castCards([member('leo', 1)], 1, 'ru');
    if (leo.locked) throw new Error('should be revealed');
    expect(leo.name).toBe('leo-ru');
    expect(leo.role).toBe('leo role'); // ru empty → en
    expect(leo.bio).toBe('leo био');
  });
});
