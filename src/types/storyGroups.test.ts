import { describe, it, expect } from 'vitest';
import { coverFor, CHARACTER_COVER, dbStoryToGroup } from './storyGroups';

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
 * Every story arrives from the server's published list, so this adapter is
 * what a shelf card is made of: the text in the reader's language, the cover
 * (or the level character's), and the lock exactly as the server decided it.
 */
describe('dbStoryToGroup', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    storyId: 'leo',
    storyName: 'Приключения Лео',
    description: 'admin note',
    localized: {
      title: { en: "Leo's Adventures", ru: 'Приключения Лео' },
      description: { en: 'A young man', ru: 'Молодой человек' },
    },
    characterIcon: '🧑',
    category: 'general' as const,
    coverUrl: '/assets/covers/leo.jpg',
    totalParts: 10,
    ...over,
  });

  it("shows the text in the reader's language", () => {
    expect(dbStoryToGroup(row(), 'easy', 'en').title).toBe("Leo's Adventures");
    expect(dbStoryToGroup(row(), 'easy', 'ru').description).toBe('Молодой человек');
  });

  it('falls back to the admin name only when no text was written', () => {
    const blank = row({ localized: { title: { en: '', ru: '' }, description: { en: '', ru: '' } } });
    expect(dbStoryToGroup(blank, 'easy', 'en').title).toBe('Приключения Лео');
    expect(dbStoryToGroup(blank, 'easy', 'en').description).toBe('admin note');
  });

  it("keeps the story's own cover, and lends the level character to one without", () => {
    expect(dbStoryToGroup(row(), 'easy', 'en').cover).toBe('/assets/covers/leo.jpg');
    expect(dbStoryToGroup(row({ coverUrl: null }), 'medium', 'en').cover).toBe(CHARACTER_COVER.medium);
    expect(dbStoryToGroup(row({ coverUrl: null, category: 'news' }), 'easy', 'en').cover).toBeUndefined();
  });

  it('treats a story with no category as a general one', () => {
    expect(dbStoryToGroup(row({ category: null }), 'easy', 'en').category).toBe('general');
  });

  it('keeps the lock the server decided', () => {
    const locked = dbStoryToGroup(
      row({ locked: true, freeParts: 3, requiredSkus: ['sub-easy', 'sub-all'] }),
      'easy',
      'en',
    );
    expect(locked.locked).toBe(true);
    expect(locked.freeParts).toBe(3);
    expect(locked.requiredSkus).toEqual(['sub-easy', 'sub-all']);
    expect(dbStoryToGroup(row(), 'easy', 'en').locked).toBe(false);
  });
});
