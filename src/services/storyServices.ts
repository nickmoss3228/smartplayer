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

export const fetchPublishedStoriesList = async (
  difficulty: string
): Promise<PublishedStoryListItem[]> => {
  try {
    const res = await axios.get(`${API_BASE}/api/stories/${difficulty}`);
    return res.data.stories;
  } catch {
    return [];
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
    }));
