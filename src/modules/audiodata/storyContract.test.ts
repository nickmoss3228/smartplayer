import { describe, it, expect } from 'vitest';
import { getAudioTracksByStory } from './audioDataByDifficulty';
import { getStoryGroups, type DifficultySlug } from '../../types/storyGroups';
import en from '../../locales/en/translation.json';
import ru from '../../locales/ru/translation.json';

/**
 * Adding a story means editing three separate files that have no compile-time
 * link to each other:
 *
 *   1. src/types/storyGroups.ts        — declares the slug and totalTracks
 *   2. src/modules/audiodata/audioDataByDifficulty.ts — maps slug → tracks
 *   3. src/locales/{en,ru}/translation.json           — title + description
 *
 * Miss one and nothing fails to compile. The story renders with a raw i18n key
 * as its title, or opens to an empty track list. These tests are the missing
 * link between the three.
 */

const DIFFICULTIES: DifficultySlug[] = ['easy', 'medium', 'hard'];

/** Stand-in for i18next: returns the key itself, so a miss is detectable. */
const identityT = ((key: string) => key) as unknown as Parameters<
  typeof getStoryGroups
>[1];

/** Every declared story, flattened to (difficulty, slug) pairs. */
const allStories = DIFFICULTIES.flatMap((difficulty) =>
  getStoryGroups(difficulty, identityT).map((group) => ({
    difficulty,
    slug: group.slug,
    totalTracks: group.totalTracks,
  })),
);

function translationFor(locale: typeof en, difficulty: string, slug: string) {
  const stories = (locale as Record<string, any>).stories?.[difficulty];
  return stories?.[slug];
}

describe('story data contract', () => {
  it('declares at least one story per difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(getStoryGroups(difficulty, identityT).length).toBeGreaterThan(0);
    }
  });

  it.each(allStories)(
    'has a title and description in both locales for $difficulty/$slug',
    ({ difficulty, slug }) => {
      for (const [name, locale] of [
        ['en', en],
        ['ru', ru],
      ] as const) {
        const entry = translationFor(locale, difficulty, slug);
        expect(entry, `stories.${difficulty}.${slug} missing from ${name}`).toBeDefined();
        expect(typeof entry.title, `${name} title`).toBe('string');
        expect(entry.title.trim(), `${name} title is empty`).not.toBe('');
        expect(typeof entry.description, `${name} description`).toBe('string');
      }
    },
  );

  it.each(allStories)('resolves an audio track list for $difficulty/$slug', ({
    difficulty,
    slug,
  }) => {
    // A slug declared in storyGroups but absent from audioDataByDifficulty
    // returns [] rather than throwing, so the story opens to an empty player.
    const tracks = getAudioTracksByStory(difficulty, slug);
    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks.length, `no tracks registered for ${difficulty}/${slug}`).toBeGreaterThan(
      0,
    );
  });

  it.each(allStories)(
    "totalTracks matches the real track count for $difficulty/$slug",
    ({ difficulty, slug, totalTracks }) => {
      // totalTracks drives the progress UI. If it overshoots the real list,
      // progress can never reach 100%; if it undershoots, tracks are unreachable.
      const tracks = getAudioTracksByStory(difficulty, slug);
      expect(tracks.length).toBe(totalTracks);
    },
  );

  it('gives every track a unique id within its story', () => {
    for (const { difficulty, slug } of allStories) {
      const ids = getAudioTracksByStory(difficulty, slug).map((t) => t.id);
      expect(new Set(ids).size, `duplicate track id in ${difficulty}/${slug}`).toBe(
        ids.length,
      );
    }
  });

  it('has no duplicate slugs within a difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      const slugs = getStoryGroups(difficulty, identityT).map((g) => g.slug);
      expect(new Set(slugs).size, `duplicate slug in ${difficulty}`).toBe(slugs.length);
    }
  });
});
