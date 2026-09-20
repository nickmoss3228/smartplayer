// services/storyServices.ts
// Read side of DB-backed stories authored via the admin Story Builder.
// Static-file stories (leo, leo-additional, maya, daniel) never call this —
// these are purely additive fallbacks for stories that only exist in Mongo.
//
// These go through the shared `api` instance rather than bare axios BECAUSE of
// the paywall: the server decides how much of a story to hand back from the
// caller's entitlements, and a request with no Authorization header looks
// anonymous. Called with bare axios (as this file used to), a paying customer
// would be served the locked, audio-stripped version of a story they own.
import { api } from "./apiClient";
import { AudioTrack } from "../types";


export interface PublishedVocabEntry {
  word: string; // Russian text shown to the student
  definition: string;
  audioKey: string;
  audioUrl: string;
}

export interface PublishedQuizQuestion {
  question: string;
  options: string[];
  referenceTime: number;
  audio: { fast: string; slow: string };
  // never includes correctAnswer — the backend strips it, same as getPublicQuiz
}

export interface PublishedStoryPart {
  partNumber: number;
  /** Track name. Empty on parts created before the field existed. */
  title?: string;
  audioUrl: string | null;
  helpAudio?: string[];
  comicUrl?: string | null;
  timeMarkers: { time: number; label: string; color: string }[];
  vocabulary: PublishedVocabEntry[];
  phrasalVerbs: PublishedVocabEntry[];
  quiz: PublishedQuizQuestion[];
  /**
   * The caller has not paid for this part. The server sends the part number
   * and title and nothing else — no audio, no comic, no vocabulary, no quiz.
   * Parts are never dropped, only emptied, so numbering stays honest (the same
   * reasoning as adaptPublishedStoryToTracks below).
   */
  locked?: boolean;
  /** Audible, but only for the story's previewSeconds; no quiz is sent. */
  preview?: boolean;
}

export interface LocalizedText {
  en: string;
  ru: string;
}

export interface PublishedStory {
  storyId: string;
  storyName: string;
  description: string;
  characterIcon: string;
  /** What students see, per locale. Null on stories imported before it existed. */
  localized?: { title: LocalizedText; description: LocalizedText } | null;
  totalParts: number;
  parts: PublishedStoryPart[];
  /** True when the caller owns none of this story beyond its free preview. */
  locked?: boolean;
  /** Any one of these SKUs unlocks it — what the paywall modal offers to sell. */
  requiredSkus?: string[];
  freeParts?: number;
  previewSeconds?: number | null;
}

export interface PublishedStoryListItem {
  storyId: string;
  storyName: string;
  description: string;
  characterIcon: string;
  /** Which list heading it belongs under; null means "use the static entry's". */
  category?: 'general' | 'news' | null;
  /** 4:5 card art; null means "use the static entry's cover". */
  coverUrl?: string | null;
  /** Per-locale display text; empty strings fall back to storyName. */
  localized?: { title: LocalizedText; description: LocalizedText } | null;
  totalParts: number;
  /**
   * Paywall state, decided by the server from the caller's entitlements — the
   * list is the one place that knows about stories the caller does NOT own, so
   * it has to carry the lock rather than the client inferring it.
   */
  locked?: boolean;
  requiredSkus?: string[];
  freeParts?: number;
  previewSeconds?: number | null;
}

// Returns null if the story doesn't exist (isn't published, or was never a
// DB story at all) — callers treat that as "not found in the DB either".
export const fetchPublishedStory = async (
  difficulty: string,
  storyId: string
): Promise<PublishedStory | null> => {
  try {
    const res = await api.get(`/api/stories/${difficulty}/${storyId}`);
    return res.data;
  } catch {
    return null;
  }
};

/**
 * Published DB stories for a difficulty, plus the ids the admin panel has
 * hidden — which covers the BUILT-IN stories too, and is the only way to take
 * one of those out of the list, since they are declared in storyGroups.ts and
 * render whether or not the database knows them.
 *
 * On failure both come back empty, so a backend outage shows the full built-in
 * catalogue rather than an empty app. Failing open is the right way round here:
 * hiding is an editorial choice, not a security boundary.
 *
 * `ok` says which of the two happened. An empty failure is not an answer, and a
 * caller that already holds a real list must not replace it with one.
 */
export const fetchPublishedStoriesList = async (
  difficulty: string
): Promise<{ stories: PublishedStoryListItem[]; hidden: string[]; ok: boolean }> => {
  try {
    const res = await api.get(`/api/stories/${difficulty}`);
    return { stories: res.data.stories ?? [], hidden: res.data.hidden ?? [], ok: true };
  } catch {
    return { stories: [], hidden: [], ok: false };
  }
};

// Adapts a DB story's parts into the AudioTrack[] shape audioDataByDifficulty.ts
// / Player.tsx already expect, so the player doesn't need to know the
// difference between a static and a DB-backed story.
export const adaptPublishedStoryToTracks = (story: PublishedStory): AudioTrack[] =>
  // Deliberately NOT filtered by audioUrl. Dropping a part renumbered every
  // track after it, so requesting part 5 silently played a different one while
  // the vocabulary panel still showed part 5 — the audio and the words on
  // screen disagreed. A part with no audio is emitted with audio: "" and the
  // player reports it as unavailable, which is honest and keeps numbering.
  [...story.parts]
    .sort((a, b) => a.partNumber - b.partNumber)
    .map((part) => ({
      id: String(part.partNumber),
      // The part names its own track. Falling back to a generated label only
      // when it has none keeps "Story"/"Discussion" instead of "Name — 1".
      title: part.title?.trim() || `${story.storyName} — ${part.partNumber}`,
      audio: part.audioUrl ?? "",
      subtitles: [],
      timeMarkers: part.timeMarkers,
      helpAudio: part.helpAudio ?? [],
      comicUrl: part.comicUrl ?? null,
    }));
