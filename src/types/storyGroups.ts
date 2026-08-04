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
// are always available synchronously from the functions above, so these
// hooks return that same data immediately (no loading flash for existing
// content) and swap in a published DB-backed story once fetched — a DB
// story *overrides* its static counterpart by slug (imported+published
// stories replace the built-in entry instead of appearing twice), matching
// the whole-story "DB wins once published" precedence in the backend's
// helpers/storyLookup.js.

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

  const dbSlugs = new Set(dbGroups.map((g) => g.slug));
  return [...staticGroups.filter((g) => !dbSlugs.has(g.slug)), ...dbGroups];
}

// Single-story lookup with DB fallback. `loading` is true only while nothing
// is available to show yet (a slug that isn't a static story, still waiting
// on the DB check) — callers should wait for loading to clear before
// treating a missing storyGroup as "not found" (avoids a false redirect).
// A published DB story overrides its static counterpart once the fetch
// resolves, without blocking the initial render for existing content.
export function useStoryGroup(
  difficulty: DifficultySlug,
  slug: string,
  t: TFunction,
): { storyGroup: StoryGroup | undefined; loading: boolean } {
  const staticGroup = getStoryGroup(difficulty, slug, t);
  const [dbGroup, setDbGroup] = useState<StoryGroup | undefined>(undefined);
  const [dbChecked, setDbChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDbChecked(false);
    fetchPublishedStory(difficulty, slug)
      .then((story) => {
        if (cancelled) return;
        setDbGroup(story ? dbStoryToGroup(story) : undefined);
        setDbChecked(true);
      })
      .catch(() => {
        if (!cancelled) setDbChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [difficulty, slug]);

  return {
    storyGroup: dbGroup ?? staticGroup,
    loading: !staticGroup && !dbChecked,
  };
}