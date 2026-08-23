import { describe, it, expect } from 'vitest';
import { mergeStoryGroups, type StoryGroup } from './storyGroups';

/**
 * Guards what students can see.
 *
 * Two mechanisms live here and they are easy to confuse, which is exactly how
 * the bug arose: deleting a story in the builder appeared to do nothing,
 * because deleting only removed a DB *override* and the built-in entry
 * underneath came straight back. Hiding is the separate thing that actually
 * takes a story off the shelves, and it has to work on built-in stories or it
 * solves nothing.
 */
const group = (slug: string, title = slug): StoryGroup => ({
  slug,
  title,
  description: '',
  character: 'x',
  totalTracks: 1,
  coverEmoji: '📖',
  category: 'general',
});

const none = new Set<string>();

describe('mergeStoryGroups', () => {
  it('shows the built-in catalogue when the database has nothing', () => {
    const out = mergeStoryGroups([group('leo'), group('maya')], [], none);
    expect(out.map((g) => g.slug)).toEqual(['leo', 'maya']);
  });

  it('lets a published DB story replace the static entry of the same slug', () => {
    const out = mergeStoryGroups([group('leo', 'Static Leo')], [group('leo', 'Edited Leo')], none);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Edited Leo');
  });

  it('appends DB stories that have no static counterpart', () => {
    const out = mergeStoryGroups([group('leo')], [group('brand-new')], none);
    expect(out.map((g) => g.slug)).toEqual(['leo', 'brand-new']);
  });

  // The actual bug: this is the only way a built-in story can be removed.
  it('hides a built-in story that has no DB story at all', () => {
    const out = mergeStoryGroups(
      [group('leo'), group('news-family-visit')],
      [],
      new Set(['news-family-visit']),
    );
    expect(out.map((g) => g.slug)).toEqual(['leo']);
  });

  it('hides a DB-backed story too', () => {
    const out = mergeStoryGroups([], [group('db-only')], new Set(['db-only']));
    expect(out).toEqual([]);
  });

  // Hiding is about the slug, so it must not be defeated by the story also
  // having been imported and published.
  it('hides a story that is both static and overridden by a published DB copy', () => {
    const out = mergeStoryGroups([group('leo')], [group('leo')], new Set(['leo']));
    expect(out).toEqual([]);
  });

  it('ignores hidden ids that match nothing', () => {
    const out = mergeStoryGroups([group('leo')], [], new Set(['does-not-exist']));
    expect(out.map((g) => g.slug)).toEqual(['leo']);
  });

  // Failing open matters: the list endpoint returns empty on error, and an
  // outage should show the full catalogue rather than an empty app.
  it('shows everything when nothing is hidden', () => {
    const statics = [group('a'), group('b'), group('c')];
    expect(mergeStoryGroups(statics, [], none)).toHaveLength(3);
  });
});

/**
 * Publishing a story must not move it to a different shelf. A published DB
 * story REPLACES its static counterpart wholesale, so the category has to
 * survive the swap — otherwise every news story silently lands under
 * "Stories" the moment it goes live, which is exactly what happened.
 */
describe('category survives publishing', () => {
  const dbGroup = (slug: string, category: 'general' | 'news'): StoryGroup => ({
    ...group(slug),
    category,
  });

  it('keeps a news story under news when its DB copy says so', () => {
    const out = mergeStoryGroups(
      [{ ...group('news-roland-garros'), category: 'news' }],
      [dbGroup('news-roland-garros', 'news')],
      none,
    );
    expect(out).toHaveLength(1);
    expect(out[0].category).toBe('news');
  });

  it('lets an explicit category move a story between shelves', () => {
    const out = mergeStoryGroups(
      [{ ...group('leo'), category: 'general' }],
      [dbGroup('leo', 'news')],
      none,
    );
    expect(out[0].category).toBe('news');
  });
});
