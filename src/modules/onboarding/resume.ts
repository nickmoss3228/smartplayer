/**
 * Where a student left the /welcome flow, so a reload or a closed tab resumes
 * at the same slide with the slides already watched still unlocked.
 *
 * Per account and per device. The answers themselves are on the server (they
 * come back on the user object); only the position is local, which at worst
 * means a second device starts the slides from the first one again.
 * Every access is guarded: storage can be absent or throw (private windows).
 */
export interface ResumePoint {
  step: number;
  /** The furthest step whose "Next" has unlocked. */
  unlockedThrough: number;
}

// v2: the slides went from 7 to 5 (2026-10-04), so a v1 position means a different slide.
const keyFor = (userId: string) => `onboarding:v2:${userId}`;

export const loadResume = (userId: string): ResumePoint | null => {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ResumePoint>;
    if (!Number.isInteger(parsed.step) || !Number.isInteger(parsed.unlockedThrough)) return null;
    return { step: parsed.step as number, unlockedThrough: parsed.unlockedThrough as number };
  } catch {
    return null;
  }
};

export const saveResume = (userId: string, point: ResumePoint): void => {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(point));
  } catch {
    // Resuming is a convenience; the flow works without it.
  }
};

export const clearResume = (userId: string): void => {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    // As above.
  }
};
