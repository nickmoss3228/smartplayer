import { TFunction } from 'i18next';

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