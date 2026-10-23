import axios from "axios";
import { Wallet } from "../types/Wallet";
import { API_BASE } from "./apiClient";


export const fetchLearnedWords = async (token: string): Promise<string[]> => {
  const res = await axios.get(`${API_BASE}/api/progress/vocab-learned`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.learnedWords;
};

export const submitLearnedWords = async (
  token: string,
  words: string[],
): Promise<{ learnedWords: string[]; wallet: Wallet | null }> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/vocab-complete`,
    { words },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return { learnedWords: res.data.learnedWords, wallet: res.data.wallet ?? null };
};

// ── Bookmarks: words a student chose to come back to ───────────────────────

export const fetchVocabBookmarks = async (token: string): Promise<string[]> => {
  const res = await axios.get(`${API_BASE}/api/progress/vocab-bookmarks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.bookmarks;
};

/** Set one word's bookmark; answers with the full list, newest first. */
export const setVocabBookmark = async (
  token: string,
  key: string,
  bookmarked: boolean,
): Promise<string[]> => {
  const res = await axios.put(
    `${API_BASE}/api/progress/vocab-bookmarks`,
    { key, bookmarked },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data.bookmarks;
};

// ── Where words come from ───────────────────────────────────────────────────

/** One place a word appears — a row of the копилка. Mirrors VocabPlace in the backend's stories repo. */
export interface VocabPlace {
  key: string;
  /** Russian, as the student sees it. */
  word: string;
  kind: "vocabulary" | "phrasal";
  audioUrl: string | null;
  difficulty: string;
  storyId: string;
  storyName: string;
  storyTitle: { en: string; ru: string };
  partNumber: number;
  partTitle: string;
  partTitleLocalized: { en: string; ru: string } | null;
}

/**
 * Every place these word keys appear in a story the caller may open. Public:
 * a guest's копилка lives in the browser and is looked up from there.
 */
export const lookupVocabPlaces = async (keys: string[], token?: string | null): Promise<VocabPlace[]> => {
  if (keys.length === 0) return [];
  const res = await axios.post(
    `${API_BASE}/api/progress/vocab-lookup`,
    { keys },
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );
  return res.data.places;
};
