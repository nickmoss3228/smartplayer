// services/lastPlayed.ts
//
// The part this browser last opened in the player, for the landing's
// «Продолжить» card. Written by Player.tsx once the story has loaded; read by
// the landing. Kept per browser, for guests and members alike: the card's job
// is "one tap back to where you were on this device", and the server's
// progress has no notion of the last part opened.

const KEY = 'malako:lastPlayed';

export interface LastPlayed {
  difficulty: string;
  storySlug: string;
  part: number;
  /** The story's name per language, as it was when the part was opened. */
  titles: { ru?: string; en?: string };
  /** When it was written, ms since epoch. */
  at: number;
}

const isRecord = (v: unknown): v is LastPlayed => {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.difficulty === 'string' &&
    /^[a-z0-9-]+$/i.test(r.difficulty) &&
    typeof r.storySlug === 'string' &&
    /^[a-z0-9-]+$/i.test(r.storySlug) &&
    typeof r.part === 'number' &&
    Number.isInteger(r.part) &&
    r.part >= 1 &&
    typeof r.titles === 'object' &&
    r.titles !== null
  );
};

export function saveLastPlayed(entry: Omit<LastPlayed, 'at'>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...entry, at: Date.now() }));
  } catch {
    // private mode or full storage: the landing simply shows no card
  }
}

export function loadLastPlayed(): LastPlayed | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** The player URL for a record. */
export const lastPlayedHref = (r: LastPlayed): string =>
  `/levels/${r.difficulty}/${r.storySlug}/${r.part}`;

/** The story's name in `locale`, falling back to the other language, then the slug. */
export const lastPlayedTitle = (r: LastPlayed, locale: string): string =>
  (locale === 'en' ? r.titles.en || r.titles.ru : r.titles.ru || r.titles.en)?.trim() || r.storySlug;
