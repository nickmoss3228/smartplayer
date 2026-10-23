import { describe, it, expect } from 'vitest';
import { condensed, shapeFor, SENTENCE_END, type WindowWord } from './textShape';

const E = SENTENCE_END;
const dots = (p: (number | string)[]) => p.filter((t): t is number => typeof t === 'number' && t > 0);
const word = (key: string): WindowWord => ({ key, word: key, audioKey: key, audioUrl: '', phrasal: false });

describe('condensed', () => {
  it('leaves out sentences without a word and drops paragraphs left empty', () => {
    const shape = {
      paragraphs: [
        [3, 5, E, 4, 'lark', 2, E, 6, 6, E],
        [4, 4, 4, E],
      ],
      missing: ['feed'],
    };
    expect(condensed(shape)).toEqual({ paragraphs: [[2, 'lark', 2, E]], missing: ['feed'] });
  });

  it('draws a long stretch as at most six dots, in two runs', () => {
    const { paragraphs } = condensed({ paragraphs: [[3, 4, 2, 5, 6, 7, 8, 'lark', E]], missing: [] });
    expect(paragraphs[0]).toEqual([3, 3, 'lark', E]);
  });

  it('keeps the words in order, with nothing between neighbours', () => {
    const { paragraphs } = condensed({ paragraphs: [['wake up', 'early', 5, 'lark']], missing: [] });
    expect(paragraphs[0]).toEqual(['wake up', 'early', 2, 'lark']);
  });

  it('shrinks an invented page too', () => {
    const words = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(word);
    const page = shapeFor(null, 'leo-2', words);
    const all = page.paragraphs.flat();
    expect(all.filter((t) => typeof t === 'string')).toHaveLength(words.length);
    expect(Math.max(...dots(all))).toBeLessThanOrEqual(6);
  });
});
