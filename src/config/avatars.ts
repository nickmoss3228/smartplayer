// config/avatars.ts
// Replace these URLs with your own illustrated animal images later.
// Currently using open-license placeholder illustrations from unavatar/dicebear.

export interface AvatarOption {
  id: string;
  label: string;
  emoji: string; // shown as fallback and in picker
  url: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "cat",    label: "Cat",    emoji: "🐱", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=cat&backgroundColor=ffd5dc" },
  { id: "fox",    label: "Fox",    emoji: "🦊", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=fox&backgroundColor=ffdfb0" },
  { id: "bear",   label: "Bear",   emoji: "🐻", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=bear&backgroundColor=d0e8ff" },
  { id: "rabbit", label: "Rabbit", emoji: "🐰", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=rabbit&backgroundColor=e0d4f7" },
  { id: "owl",    label: "Owl",    emoji: "🦉", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=owl&backgroundColor=d4f7d4" },
  { id: "wolf",   label: "Wolf",   emoji: "🐺", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=wolf&backgroundColor=f7f0d4" },
  { id: "deer",   label: "Deer",   emoji: "🦌", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=deer&backgroundColor=ffd5dc" },
  { id: "panda",  label: "Panda",  emoji: "🐼", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=panda&backgroundColor=d0e8ff" },
  { id: "tiger",  label: "Tiger",  emoji: "🐯", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=tiger&backgroundColor=ffdfb0" },
  { id: "frog",   label: "Frog",   emoji: "🐸", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=frog&backgroundColor=d4f7d4" },
];

export const getAvatarById = (id: string): AvatarOption =>
  AVATAR_OPTIONS.find((a) => a.id === id) ?? AVATAR_OPTIONS[0];