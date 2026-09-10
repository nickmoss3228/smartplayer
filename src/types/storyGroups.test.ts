import { describe, it, expect } from 'vitest';
import { coverFor, CHARACTER_COVER, mergeStoryGroups, type StoryGroup } from './storyGroups';

/**
 * The nine extension-pack stories have no cover art of their own and no comic
 * to crop one from. Rather than block on nine new comics, they borrow the
 * portrait of the character whose level they sit on — every story on a level
 * stars the same person, so it is an honest stand-in.
 *
 * Worth guarding because the failure is silent: get it wrong and half the shelf
 * quietly falls back to a halftone placeholder, which looks like missing art
 * rather than a bug.
 */
describe('cover fallback', () => {
  it('uses the level character when a story has no cover', () => {
    expect(coverFor('easy', 'general')).toBe(CHARACTER_COVER.easy);
    expect(coverFor('medium', 'general')).toBe(CHARACTER_COVER.medium);
    expect(coverFor('hard', 'general')).toBe(CHARACTER_COVER.hard);
  });

  it("never overrides a story's own cover", () => {
    expect(coverFor('easy', 'general', '/assets/covers/leo-additional.jpg')).toBe(
      '/assets/covers/leo-additional.jpg',
    );
  });

  it('leaves news stories on the halftone placeholder', () => {
    // A news story is not about the character, so lending it his portrait would
    // say something untrue about what is inside.
    expect(coverFor('easy', 'news')).toBeUndefined();
    expect(coverFor('easy', 'news', '/assets/covers/news-roland-garros.jpg')).toBe(
      '/assets/covers/news-roland-garros.jpg',
    );
  });

  it('points every level at a real file under /assets/covers', () => {
    for (const [level, path] of Object.entries(CHARACTER_COVER)) {
      expect(path, `${level} cover is not an asset path`).toMatch(
        /^\/assets\/covers\/[a-z0-9-]+\.jpg$/,
      );
    }
  });

  it('gives each level a different character', () => {
    const paths = Object.values(CHARACTER_COVER);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

/**
 * mergeStoryGroups decides whether content appears at all, so it keeps its own
 * coverage alongside the cover rules above.
 */
describe('mergeStoryGroups', () => {
  const group = (slug: string, extra: Partial<StoryGroup> = {}): StoryGroup => ({
    slug,
    title: slug,
    description: '',
    character: 'Leo',
    totalTracks: 5,
    coverEmoji: '',
    category: 'general',
    ...extra,
  });

  it('lets a published DB story replace its static counterpart', () => {
    const merged = mergeStoryGroups(
      [group('leo', { title: 'static' })],
      [group('leo', { title: 'from db' })],
      new Set(),
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('from db');
  });

  it('removes a hidden story from either side', () => {
    expect(mergeStoryGroups([group('leo')], [], new Set(['leo']))).toHaveLength(0);
    expect(mergeStoryGroups([], [group('leo')], new Set(['leo']))).toHaveLength(0);
  });

  it('keeps the locked flag the server decided', () => {
    const merged = mergeStoryGroups([], [group('leo-new-job', { locked: true })], new Set());
    expect(merged[0].locked).toBe(true);
  });
});
