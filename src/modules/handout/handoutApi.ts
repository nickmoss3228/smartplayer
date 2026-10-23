// modules/handout/handoutApi.ts
//
// The part's handout: what its PDF prints. Mirrors getPartHandout in the
// backend's controllers/story.controller.js. It is the one response that
// carries the transcript as text, so the server sends it only for a part the
// caller may open outright (a timed preview is refused with 403).
import { api } from "../../services/apiClient";
import type { LocalizedText, PartIntro } from "../../services/storyServices";

/** A stretch of the transcript. With `word`, it is words[word], said here. */
export interface HandoutRun {
  text: string;
  word?: number;
}

export interface HandoutWord {
  kind: "vocabulary" | "phrasal";
  /** The English, as it is said. */
  en: string;
  /** The Russian the app shows. */
  ru: string;
  definition: string;
}

export interface PartHandout {
  difficulty: string;
  storyId: string;
  storyName: string;
  storyTitle: LocalizedText;
  totalParts: number;
  partNumber: number;
  title: string;
  intro: PartIntro | null;
  comicUrl: string | null;
  /** Paragraphs of runs, stage directions removed. */
  text: HandoutRun[][];
  /** One Russian paragraph per English one, or null when none is written yet. */
  translation: string[] | null;
  words: HandoutWord[];
}

export class HandoutLockedError extends Error {}

export async function fetchPartHandout(
  difficulty: string,
  storyId: string,
  partNumber: number,
): Promise<PartHandout> {
  try {
    const res = await api.get(`/api/stories/${difficulty}/${storyId}/parts/${partNumber}/handout`);
    return res.data;
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 403) throw new HandoutLockedError("This part is locked.");
    throw error;
  }
}
