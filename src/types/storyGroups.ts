import { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { fetchPublishedStoriesList, fetchPublishedStory } from '../services/storyServices';

export type StoryCategory = 'general' | 'news';

export interface StoryGroup {
  slug: string;           // URL-friendly name, e.g. "leo"
  title: string;
  description: string;
  character: string;
  totalTracks: number;
  coverEmoji: string;
  /** Which heading/section this story is grouped under in List.tsx. Defaults to 'general'. */
  category: StoryCategory;
}

export type DifficultySlug = 'easy' | 'medium' | 'hard';
// Only non-translatable fields live here
type StoryGroupRaw = Omit<StoryGroup, 'title' | 'description' | 'category'> & {
  category?: StoryCategory;
};

const storyGroupsRaw: Record<DifficultySlug, StoryGroupRaw[]> = {
  easy: [
    { slug: 'leo', character: 'Leo', totalTracks: 10, coverEmoji: '🧑' },
    { slug: 'leo-additional',    character: 'Leo',    totalTracks: 3, coverEmoji: '🧑' },
    // Placeholder "News and Interesting things" group — students listen to a news
    // source/article first, then get a story connected to it. No real audio/text yet;
    // fill in totalTracks, coverEmoji, and src/modules/audiodata placeholder tracks
    // once content is ready.
    { slug: 'news-roland-garros', character: 'Leo', totalTracks: 2, coverEmoji: '📰', category: 'news' },
    { slug: 'news-family-visit',  character: 'Leo', totalTracks: 2, coverEmoji: '📰', category: 'news' },
    { slug: 'news-grazing-board', character: 'Leo', totalTracks: 2, coverEmoji: '📰', category: 'news' },
  ],
  medium: [
    { slug: 'maya',   character: 'Maya',   totalTracks: 10, coverEmoji: '👩' },
  ],
  hard: [
    { slug: 'daniel', character: 'Daniel', totalTracks: 10, coverEmoji: '👨' },
  ],
};

export const getStoryGroups = (diff: DifficultySlug, t: TFunction): StoryGroup[] =>
  storyGroupsRaw[diff].map(story => ({
    ...story,
    category:    story.category ?? 'general',
    title:       t(`stories.${diff}.${story.slug}.title`),
    description: t(`stories.${diff}.${story.slug}.description`),
  }));

// Single-story lookup — built on the same translated data as getStoryGroups,
// so a story's title/description never drifts from what List.tsx shows.
export const getStoryGroup = (
  difficulty: DifficultySlug,
  slug: string,
  t: TFunction,
): StoryGroup | undefined =>
  getStoryGroups(difficulty, t).find(group => group.slug === slug);

// ── DB-backed story fallback ────────────────────────────────────────────────
// Static stories (leo, leo-additional, maya, daniel, the news placeholders)
// are always available synchronously from the functions above — these hooks
// return that same list immediately and additively merge in any published
// DB-backed stories (authored via the admin Story Builder) once fetched.

function dbStoryToGroup(story: {
  storyId: string;
  storyName: string;
  description: string;
  characterIcon: string;
  totalParts: number;
}): StoryGroup {
  return {
    slug: story.storyId,
    title: story.storyName,
    description: story.description,
    character: story.storyName,
    totalTracks: story.totalParts,
    coverEmoji: story.characterIcon,
    category: 'general',
  };
}

export function useStoryGroups(difficulty: DifficultySlug, t: TFunction): StoryGroup[] {
  const staticGroups = getStoryGroups(difficulty, t);
  const [dbGroups, setDbGroups] = useState<StoryGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedStoriesList(difficulty).then((stories) => {
      if (!cancelled) setDbGroups(stories.map(dbStoryToGroup));
    });
    return () => {
      cancelled = true;
    };
  }, [difficulty]);

  return [...staticGroups, ...dbGroups];
}

// Single-story lookup with DB fallback. `loading` is true only while a DB
// lookup is in flight for a slug that isn't a static story — callers should
// wait for loading to clear before treating a missing storyGroup as "not
// found" (avoids a false redirect while the fetch is still pending).
export function useStoryGroup(
  difficulty: DifficultySlug,
  slug: string,
  t: TFunction,
): { storyGroup: StoryGroup | undefined; loading: boolean } {
  const staticGroup = getStoryGroup(difficulty, slug, t);
  const [dbGroup, setDbGroup] = useState<StoryGroup | undefined>(undefined);
  const [loading, setLoading] = useState(!staticGroup);

  useEffect(() => {
    if (staticGroup) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchPublishedStory(difficulty, slug)
      .then((story) => {
        if (!cancelled) setDbGroup(story ? dbStoryToGroup(story) : undefined);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, slug, !!staticGroup]);

  return { storyGroup: staticGroup ?? dbGroup, loading };
}