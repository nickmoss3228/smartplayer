import { TFunction } from 'i18next';

export interface StoryGroup {
  slug: string;           // URL-friendly name, e.g. "leo"
  title: string;          
  description: string;    
  character: string;      
  totalTracks: number;
  coverEmoji: string;       
}

export type DifficultySlug = 'easy' | 'medium' | 'hard';
// Only non-translatable fields live here
type StoryGroupRaw = Omit<StoryGroup, 'title' | 'description'>;

const storyGroupsRaw: Record<DifficultySlug, StoryGroupRaw[]> = {
  easy: [
    { slug: 'leo', character: 'Leo', totalTracks: 10, coverEmoji: '🧑' },
    { slug: 'leo-additional',    character: 'Leo',    totalTracks: 3, coverEmoji: '🧑' },
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