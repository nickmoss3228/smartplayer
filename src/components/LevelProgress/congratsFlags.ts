// The "congratulations" modal's memory, kept in localStorage.
//
// Per story and per user: finishing one story must not hush the others.
// Values of the per-story key:
//   "true"    shown (or deliberately skipped): never show again
//   "pending" this user opened the story while it was incomplete, after the
//             update: finishing it later earns the modal
// Before the update the flag was one per level and browser,
// `congrats_shown_<difficulty>`. It cannot say which story it was for, so a
// story found complete with no per-story key and that flag present is taken as
// finished before the update. The old flag is never deleted: it is the only
// sign this browser ran the old version.

/** The slice of Storage this module uses, so tests can pass a fake. */
export type FlagStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const congratsKey = (diff: string, slug: string, userId?: string | null) =>
  `congrats_shown_${userId ?? 'guest'}_${diff}_${slug}`;

const legacyKey = (diff: string) => `congrats_shown_${diff}`;

/**
 * Decides whether the modal is due, and records the silent outcomes (legacy
 * skip, "pending"). Returns true when the caller should show it, and then call
 * markCongratsShown once it actually has. Call only once the page has loaded.
 * If storage throws, returns false: better never than on every visit.
 */
export function shouldShowCongrats(
  diff: string,
  slug: string,
  userId: string | null | undefined,
  isAllCompleted: boolean,
  storage: FlagStorage = localStorage,
): boolean {
  try {
    const key = congratsKey(diff, slug, userId);
    const value = storage.getItem(key);
    if (value === 'true') return false;
    const hasLegacy = storage.getItem(legacyKey(diff)) === 'true';
    if (isAllCompleted) {
      if (value === 'pending') return true;
      if (hasLegacy) {
        storage.setItem(key, 'true');
        return false;
      }
      return true;
    }
    if (hasLegacy && value === null) storage.setItem(key, 'pending');
    return false;
  } catch {
    return false;
  }
}

export function markCongratsShown(
  diff: string,
  slug: string,
  userId: string | null | undefined,
  storage: FlagStorage = localStorage,
): void {
  try {
    storage.setItem(congratsKey(diff, slug, userId), 'true');
  } catch {
    // Private mode: the modal was shown this once; nothing more to do.
  }
}
