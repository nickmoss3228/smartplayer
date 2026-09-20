import { describe, it, expect } from 'vitest';
import {
  applyCatalogAccess,
  coverFor,
  CHARACTER_COVER,
  mergeStoryGroups,
  type StoryGroup,
} from './storyGroups';
import { PREVIEW_SECONDS, FREE_PARTS_LONG_STORY, storySku } from '../config/priceCatalog';
import type { CatalogStory } from '../services/catalogServices';

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

/**
 * The built-in stories are sold too, but the server's list endpoint never
 * mentions them — so without this they would render unlocked for everyone.
 */
describe('applyCatalogAccess', () => {
  const group = (slug: string, totalTracks: number): StoryGroup => ({
    slug,
    title: slug,
    description: '',
    character: 'Leo',
    totalTracks,
    coverEmoji: '',
    category: 'general',
  });

  // Stands in for context/CatalogContext, which serves what GET /api/catalog
  // returned. These are the rows the catalog would hold for the built-ins.
  const rows: Record<string, CatalogStory> = {
    'easy/leo': {
      key: 'easy/leo',
      character: 'leo',
      parts: 10,
      category: 'general',
      paid: true,
      freeParts: FREE_PARTS_LONG_STORY,
      previewSeconds: null,
    },
    'easy/leo-additional': {
      key: 'easy/leo-additional',
      character: 'leo',
      parts: 2,
      category: 'general',
      paid: true,
      freeParts: 0,
      previewSeconds: PREVIEW_SECONDS,
    },
    'easy/gift': {
      key: 'easy/gift',
      character: 'leo',
      parts: 4,
      category: 'general',
      paid: false,
      freeParts: 4,
      previewSeconds: null,
    },
  };
  const catalog = {
    getCatalogStory: (key: string) => rows[key] ?? null,
    skusGranting: (key: string) => (rows[key]?.paid ? [storySku(key)] : []),
  };

  it('locks an unowned long story and gives its first parts away', () => {
    const leo = applyCatalogAccess(group('leo', 10), 'easy', false, catalog);
    expect(leo.locked).toBe(true);
    expect(leo.freeParts).toBe(FREE_PARTS_LONG_STORY);
    expect(leo.previewSeconds).toBeNull();
    expect(leo.requiredSkus?.[0]).toBe(storySku('easy/leo'));
  });

  it('gives an unowned short story only a timed preview', () => {
    const short = applyCatalogAccess(group('leo-additional', 2), 'easy', false, catalog);
    expect(short.locked).toBe(true);
    expect(short.freeParts).toBe(0);
    expect(short.previewSeconds).toBe(PREVIEW_SECONDS);
  });

  it('unlocks an owned story', () => {
    const owned = applyCatalogAccess(group('leo', 10), 'easy', true, catalog);
    expect(owned.locked).toBe(false);
    expect(owned.requiredSkus).toEqual([]);
  });

  it('opens a story the catalog gives away, to owner and guest alike', () => {
    const gift = applyCatalogAccess(group('gift', 4), 'easy', false, catalog);
    expect(gift.locked).toBe(false);
    expect(gift.freeParts).toBe(4);
    expect(gift.requiredSkus).toEqual([]);
  });

  // This used to return the group untouched, i.e. with `locked: undefined` —
  // which every shelf reads as owned. That is precisely how a story created in
  // the admin Story Builder appeared, free and unlocked, on a logged-out
  // library shelf. An unlisted story is now refused instead.
  // The client keeps its own copy of the server's rule for stories that have
  // no published DB row — maya and daniel among them. Without the paywall flag
  // reaching it, a signed-in user was padlocked out of content the server was
  // perfectly willing to serve, because owns() is false for everyone while
  // nothing is for sale.
  const catalogOff = { ...catalog, paywallEnabled: false };

  it('paywall off: opens the whole story for a signed-in user who owns nothing', () => {
    const leo = applyCatalogAccess(group('leo', 10), 'easy', false, catalogOff, true);
    expect(leo.locked).toBe(false);
    expect(leo.freeParts).toBe(10);
    expect(leo.requiredSkus).toEqual([]);
  });

  it('paywall off: a guest keeps the taster and is offered nothing to buy', () => {
    const leo = applyCatalogAccess(group('leo', 10), 'easy', false, catalogOff, false);
    expect(leo.locked).toBe(true);
    expect(leo.freeParts).toBe(FREE_PARTS_LONG_STORY);
    expect(leo.requiredSkus).toEqual([]);
  });

  it('paywall off: an unlisted story is STILL locked, signed in or not', () => {
    for (const authed of [true, false]) {
      const unlisted = applyCatalogAccess(group('nope', 4), 'easy', false, catalogOff, authed);
      expect(unlisted.locked).toBe(true);
      expect(unlisted.freeParts).toBe(0);
    }
  });

  it('locks a story the catalog has never heard of, rather than passing it through', () => {
    const unlisted = applyCatalogAccess(group('not-in-the-catalog', 4), 'easy', false, catalog);
    expect(unlisted.locked).toBe(true);
    expect(unlisted.freeParts).toBe(0);
    expect(unlisted.previewSeconds).toBeNull();
    expect(unlisted.requiredSkus).toEqual([]);
  });
});
