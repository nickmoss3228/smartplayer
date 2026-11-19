// services/lastLevel.ts
//
// The level this browser last opened, so the level picker comes back with that
// glass already lifted and the hub's «Уровни» tab opens that level's shelf
// directly. Per browser, like services/lastPlayed.ts; every access is guarded,
// because storage can be missing or throw (private windows).

const KEY = 'malako:lastLevel';
const LEVELS = ['easy', 'medium', 'hard'] as const;
export type LevelId = (typeof LEVELS)[number];

export const readLastLevel = (): LevelId | null => {
  try {
    const saved = localStorage.getItem(KEY);
    return (LEVELS as readonly string[]).includes(saved ?? '') ? (saved as LevelId) : null;
  } catch {
    return null;
  }
};

export const saveLastLevel = (id: string): void => {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // The choice simply is not remembered.
  }
};
