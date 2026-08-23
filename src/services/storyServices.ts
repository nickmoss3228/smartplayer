// services/storyServices.ts
// Read side of DB-backed stories authored via the admin Story Builder.
// Static-file stories (leo, leo-additional, maya, daniel) never call this —
// these are purely additive fallbacks for stories that only exist in Mongo.
import axios from "axios";
import { AudioTrack } from "../types";
import { API_BASE } from "./apiClient";


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
  audioUrl: string | null;
  comicUrl?: string | null;
  timeMarkers: { time: number; label: string; color: string }[];
  vocabulary: PublishedVocabEntry[];
  phrasalVerbs: PublishedVocabEntry[];
  quiz: PublishedQuizQuestion[];
}

export interface PublishedStory {
  storyId: string;
  storyName: string;
  description: string;
  characterIcon: string;
  totalParts: number;
  parts: PublishedStoryPart[];
}

export interface PublishedStoryListItem {
  storyId: string;
  storyName: string;
  description: string;
  characterIcon: string;
  totalParts: number;
}

// Returns null if the story doesn't exist (isn't published, or was never a
// DB story at all) — callers treat that as "not found in the DB either".
export const fetchPublishedStory = async (
  difficulty: string,
  storyId: string
): Promise<PublishedStory | null> => {
  try {
    const res = await axios.get(`${API_BASE}/api/stories/${difficulty}/${storyId}`);
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
 */
export const fetchPublishedStoriesList = async (
  difficulty: string
): Promise<{ stories: PublishedStoryListItem[]; hidden: string[] }> => {
  try {
    const res = await axios.get(`${API_BASE}/api/stories/${difficulty}`);
    return { stories: res.data.stories ?? [], hidden: res.data.hidden ?? [] };
  } catch {
    return { stories: [], hidden: [] };
  }
};

// Adapts a DB story's parts into the AudioTrack[] shape audioDataByDifficulty.ts
// / Player.tsx already expect, so the player doesn't need to know the
// difference between a static and a DB-backed story.
export const adaptPublishedStoryToTracks = (story: PublishedStory): AudioTrack[] =>
  story.parts
    .filter((part): part is PublishedStoryPart & { audioUrl: string } => !!part.audioUrl)
    .map((part) => ({
      id: String(part.partNumber),
      title: `${story.storyName} — ${part.partNumber}`,
      audio: part.audioUrl,
      subtitles: [],
      timeMarkers: part.timeMarkers,
      comicUrl: part.comicUrl ?? null,
    }));
