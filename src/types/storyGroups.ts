export interface StoryGroup {
  slug: string;           // URL-friendly name, e.g. "leo"
  title: string;          // Display name, e.g. "Leo's Adventures"
  description: string;    // Short description for the card
  character: string;      // Main character name
  totalTracks: number;
  coverEmoji: string;     // replace with an image later
}

export type DifficultySlug = 'easy' | 'medium' | 'hard';

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

export const getStoryGroups = (difficulty: DifficultySlug): StoryGroup[] => {
  return storyGroups[difficulty] || [];
};