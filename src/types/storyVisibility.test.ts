import { describe, it, expect } from 'vitest';
import { visibleStoryGroups } from './storyGroups';

/**
 * Guards what students can see. Every story on a shelf is a published row in
 * the database; "unlist" in the Story Builder hides one without unpublishing
 * it, and this is the rule that applies it.
 */
const row = (storyId: string) => ({
  storyId,
  storyName: storyId,
  description: '',
  characterIcon: '📖',
  totalParts: 2,
});

const none = new Set<string>();
const slugs = (out: { slug: string }[]) => out.map((g) => g.slug);

describe('visibleStoryGroups', () => {
  it("shows every published story, in the server's order", () => {
    const out = visibleStoryGroups([row('leo'), row('leo-additional')], 'easy', 'en', none);
    expect(slugs(out)).toEqual(['leo', 'leo-additional']);
  });

  it('removes an unlisted story', () => {
    const out = visibleStoryGroups([row('leo'), row('news-family-visit')], 'easy', 'en', new Set(['news-family-visit']));
    expect(slugs(out)).toEqual(['leo']);
  });

  it('ignores a hidden id that names no story', () => {
    const out = visibleStoryGroups([row('leo')], 'easy', 'en', new Set(['does-not-exist']));
    expect(slugs(out)).toEqual(['leo']);
  });

  it('is empty when the server has nothing', () => {
    expect(visibleStoryGroups([], 'easy', 'en', none)).toEqual([]);
  });
});
