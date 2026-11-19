// services/schoolShot.ts
//
// A small picture of the student's own school, for the hub's school card.
// The school is a live WebGL scene (modules/school/SchoolCanvas.tsx) with no
// server-side render, so the school page takes a snapshot once the scene has
// settled and keeps it here. Per account and per browser; until the student
// has opened their school on this device the card shows a stock picture.
// Every access is guarded: storage can be missing, full or throw.

const keyFor = (userId: string) => `malako:schoolShot:${userId}`;

export interface SchoolShot {
  /** A data: URL (webp, or jpeg where the browser cannot encode webp). */
  url: string;
  /** When it was taken, ms since epoch. */
  at: number;
}

export const readSchoolShot = (userId: string | undefined | null): SchoolShot | null => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SchoolShot>;
    return typeof parsed.url === 'string' && parsed.url.startsWith('data:image/') && typeof parsed.at === 'number'
      ? { url: parsed.url, at: parsed.at }
      : null;
  } catch {
    return null;
  }
};

export const saveSchoolShot = (userId: string, url: string): void => {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ url, at: Date.now() }));
  } catch {
    // Full storage: the card keeps the stock picture.
  }
};
