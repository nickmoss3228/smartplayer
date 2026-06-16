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
    { slug: 'leo',    character: 'Leo',    totalTracks: 10, coverEmoji: '🧑' },
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

export const storyGroups: Record<DifficultySlug, StoryGroup[]> = {
  easy: [
    {
      slug: 'leo',
      title: "Leo's Adventures",
      description: "Follow Leo, a kind young man from St.Petersburg.",
      character: 'Leo',
      totalTracks: 10,
      coverEmoji: '🧑',
    },
    // {
    //   slug: 'pete',
    //   title: "Pete's Adventures",
    //   description: "Follow Pete, a kind young man from Alwaysland, through his daily life, hobbies, and unexpected events.",
    //   character: 'Pete',
    //   totalTracks: 10,
    //   coverEmoji: '🧑',
    // },
    // {
    //   slug: 'shmepete',
    //   title: "Shmpete's Adventures",
    //   description: "Follow Pete, a kind young man from Alwaysland, through his daily life, hobbies, and unexpected events.",
    //   character: 'Schmidt',
    //   totalTracks: 10,
    //   coverEmoji: '🧑',
    // },
    
    // Add more story groups here later
  ],
  medium: [
    {
      slug: 'maya',
      title: "Maya's Journey",
      description: "Join Maya as she navigates life's challenges and discovers new experiences around the world.",
      character: 'Maya',
      totalTracks: 10,
      coverEmoji: '👩',
    },
    // {
    //   slug: 'Jessica',
    //   title: "Jessica's Journey",
    //   description: "Join Jessica as she navigates life's challenges and discovers new experiences around the world.",
    //   character: 'Jessica',
    //   totalTracks: 10,
    //   coverEmoji: '👩',
    // },
  ],
  hard: [
    {
      slug: 'daniel',
      title: "Daniel's World",
      description: "Explore the complex and fascinating life of Daniel, a man with big dreams and tough decisions.",
      character: 'Daniel',
      totalTracks: 10,
      coverEmoji: '👨',
    },
    // {
    //   slug: 'Steven',
    //   title: "Steven's World",
    //   description: "Explore the complex and fascinating life of Daniel, a man with big dreams and tough decisions.",
    //   character: 'Steven',
    //   totalTracks: 10,
    //   coverEmoji: '👨',
    // },
  ],
};

export const getStoryGroup = (difficulty: DifficultySlug, slug: string): StoryGroup | undefined => {
  return storyGroups[difficulty]?.find(group => group.slug === slug);
};

// export const getStoryGroups = (difficulty: DifficultySlug): StoryGroup[] => {
//   return storyGroups[difficulty] || [];
// };