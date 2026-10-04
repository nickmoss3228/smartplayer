// The single place a story's content is decided.
//
// Every story lives in the database now — the ones that used to ship inside
// the app (leo, maya, daniel and the first news stories) were moved there on
// 2026-10-02 (backend/src/scripts/seedBuiltInStories.ts). So there is one
// source, the published story the server returns, and this module adapts it
// into what the screens draw: tracks with their vocabulary resolved.
//
// It used to choose between that and a static copy compiled into the bundle,
// and the two disagreed in about ten places before this file existed. Nothing
// downstream should ever ask where a story came from again.
import { AudioTrack } from "../../types";
import {
  adaptPublishedStoryToTracks,
  type PublishedStory,
  type PublishedStoryPart,
} from "../../services/storyServices";

export type StorySource = "db";
export type VocabKind = "vocab" | "phrasal";

/** A word with its clip already resolved — no caller rebuilds a path. */
export interface ResolvedVocabEntry {
  word: string;
  definition: string;
  audioKey: string;
  /** Empty when the story has no resolvable clip for this word. */
  audioUrl: string;
}

export interface ResolvedTrack extends AudioTrack {
  vocabulary: ResolvedVocabEntry[];
  phrasalVerbs: ResolvedVocabEntry[];
}

export interface ResolvedStory {
  /** Which branch produced this. Exposed mainly so tests can assert on it. */
  source: StorySource;
  difficulty: string;
  slug: string;
  tracks: ResolvedTrack[];
}

// Entries carry a full URL already — there is nothing to build.
const adaptWords = (entries: PublishedStoryPart["vocabulary"]): ResolvedVocabEntry[] =>
  entries.map((entry) => ({
    word: entry.word,
    definition: entry.definition,
    audioKey: entry.audioKey,
    audioUrl: entry.audioUrl ?? "",
  }));

/**
 * Resolve one story from its published copy. Until the server has answered
 * (`dbStory` still null) the story has no tracks, and callers show a loader.
 */
export function resolveStory(
  difficulty: string,
  slug: string,
  dbStory: PublishedStory | null | undefined,
): ResolvedStory {
  if (!dbStory) return { source: "db", difficulty, slug, tracks: [] };
  const partByNumber = new Map(dbStory.parts.map((p) => [String(p.partNumber), p]));
  return {
    source: "db",
    difficulty,
    slug: dbStory.storyId,
    tracks: adaptPublishedStoryToTracks(dbStory).map((track) => {
      const part = partByNumber.get(track.id);
      return {
        ...track,
        vocabulary: adaptWords(part?.vocabulary ?? []),
        phrasalVerbs: adaptWords(part?.phrasalVerbs ?? []),
      };
    }),
  };
}

/**
 * A story's tracks, named in the reader's language.
 *
 * A part's name is stored once (`title`, English); the per-language name lives
 * on its "before you listen" card. The card's title wins so the grid, the
 * player header and the card all call a part the same thing.
 */
export function withLocalizedTitles(
  resolved: ResolvedStory,
  dbStory: PublishedStory | null | undefined,
  locale: "en" | "ru",
): ResolvedTrack[] {
  if (!dbStory) return resolved.tracks;
  const partByNumber = new Map(dbStory.parts.map((p) => [String(p.partNumber), p]));
  return resolved.tracks.map((track) => {
    const part = partByNumber.get(track.id);
    return {
      ...track,
      title: part?.intro?.title?.[locale]?.trim() || part?.title?.trim() || track.title,
    };
  });
}

export const findResolvedTrack = (
  story: ResolvedStory,
  trackId: string,
): ResolvedTrack | undefined => story.tracks.find((t) => t.id === trackId);
