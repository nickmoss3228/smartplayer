// services/guestProgress.ts
// Local persistence for guest (unauthenticated) trial progress — level
// completions, quiz scores, and vocab words learned — so a guest never loses
// their trial-story progress just because they haven't signed up yet. Once
// they do sign up (or log into an existing account), AuthContext migrates
// this into their account server-side and clears it.

const STORAGE_KEY = "guestProgress";

interface GuestLevelResult {
  correctAnswers: number;
  totalQuestions: number;
  completed: boolean;
  completedAt: string;
}

interface GuestStoryProgress {
  completedParts: number[];
  currentPart: number;
  results: Record<number, GuestLevelResult>;
}

interface GuestProgressData {
  // key: `${difficulty}:${storySlug}`
  stories: Record<string, GuestStoryProgress>;
  learnedWords: string[];
}

export interface GuestMigrationPayload {
  stories: {
    difficulty: string;
    storyId: string;
    results: { partNumber: number; correctAnswers: number; totalQuestions: number }[];
  }[];
  learnedWords: string[];
}

const defaultStoryProgress = (): GuestStoryProgress => ({
  completedParts: [],
  currentPart: 1,
  results: {},
});

const defaultProgressData = (): GuestProgressData => ({
  stories: {},
  learnedWords: [],
});

const storyKey = (difficulty: string, storySlug: string) => `${difficulty}:${storySlug}`;

function getGuestProgressData(): GuestProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgressData();
    const parsed = JSON.parse(raw);
    return {
      stories: parsed.stories ?? {},
      learnedWords: Array.isArray(parsed.learnedWords) ? parsed.learnedWords : [],
    };
  } catch {
    return defaultProgressData();
  }
}

function saveGuestProgressData(data: GuestProgressData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.error("Failed to save guest progress");
  }
}

export function getGuestStoryProgress(difficulty: string, storySlug: string): GuestStoryProgress {
  const data = getGuestProgressData();
  return data.stories[storyKey(difficulty, storySlug)] ?? defaultStoryProgress();
}

/**
 * Mirrors backend/src/controllers/progress.controller.js completeLevel()'s
 * exact transition logic (0.7 pass threshold, completedParts/currentPart
 * advance rules) so the guest-facing UI stays consistent with what the
 * backend will compute once this gets migrated into an account — keep in
 * sync if either side changes.
 */
export function saveGuestQuizResult(
  difficulty: string,
  storySlug: string,
  partNumber: number,
  correctAnswers: number,
  totalQuestions: number,
  totalParts: number,
): GuestStoryProgress {
  const data = getGuestProgressData();
  const key = storyKey(difficulty, storySlug);
  const story = data.stories[key] ?? defaultStoryProgress();

  const isCompleted = correctAnswers >= Math.ceil(totalQuestions * 0.7);

  if (isCompleted) {
    if (!story.completedParts.includes(partNumber)) {
      story.completedParts.push(partNumber);
      story.completedParts.sort((a, b) => a - b);
    }
    if (partNumber === story.currentPart && partNumber < totalParts) {
      story.currentPart = partNumber + 1;
    }
  }

  // Never downgrade — once a part is recorded completed:true, a later worse
  // retry must not overwrite it, or this record would contradict completedParts.
  const existing = story.results[partNumber];
  if (!existing?.completed) {
    story.results[partNumber] = {
      correctAnswers,
      totalQuestions,
      completed: isCompleted,
      completedAt: new Date().toISOString(),
    };
  }

  data.stories[key] = story;
  saveGuestProgressData(data);
  return story;
}

export function getGuestLearnedWords(): string[] {
  return getGuestProgressData().learnedWords;
}

export function saveGuestLearnedWords(words: string[]): string[] {
  if (words.length === 0) return getGuestLearnedWords();
  const data = getGuestProgressData();
  const merged = new Set(data.learnedWords);
  words.forEach((w) => merged.add(w));
  data.learnedWords = Array.from(merged);
  saveGuestProgressData(data);
  return data.learnedWords;
}

export function hasGuestProgress(): boolean {
  const data = getGuestProgressData();
  return (
    Object.values(data.stories).some((s) => s.completedParts.length > 0) ||
    data.learnedWords.length > 0
  );
}

export function buildGuestMigrationPayload(): GuestMigrationPayload {
  const data = getGuestProgressData();
  const stories = Object.entries(data.stories)
    .filter(([, story]) => story.completedParts.length > 0)
    .map(([key, story]) => {
      const [difficulty, storyId] = key.split(":");
      const results = Object.entries(story.results)
        .filter(([, r]) => r.completed)
        .map(([partNumber, r]) => ({
          partNumber: Number(partNumber),
          correctAnswers: r.correctAnswers,
          totalQuestions: r.totalQuestions,
        }));
      return { difficulty, storyId, results };
    });

  return { stories, learnedWords: data.learnedWords };
}

export function clearGuestProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.error("Failed to clear guest progress");
  }
}
