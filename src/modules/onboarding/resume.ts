/**
 * Where a student left the /welcome flow, so a reload or a closed tab resumes
 * at the same step.
 *
 * Per account and per device. The answers themselves are on the server (they
 * come back on the user object); only the position is local.
 * Every access is guarded: storage can be absent or throw (private windows).
 */
export interface ResumePoint {
  step: number;
}

// v3: the flow went from 2 questions + 5 slides to 2 questions + one tour (2026-11-19).
const keyFor = (userId: string) => `onboarding:v3:${userId}`;

export const loadResume = (userId: string): ResumePoint | null => {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ResumePoint>;
    if (!Number.isInteger(parsed.step)) return null;
    return { step: parsed.step as number };
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
