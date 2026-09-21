// The single place a story's content is decided.
//
// A story exists in two forms: the built-in ones compiled into the app (see
// types/storyGroups.ts, modules/audiodata/*, modules/vocabulary/Vocabulary.ts,
// Player/Comics/comicsData.ts) and DB-backed ones authored in the Story
// Builder. The backend has always stated the rule for choosing between them,
// in helpers/storyLookup.js:
//
//   whole-story, DB-first. If a published Story doc exists it is 100%
//   authoritative — no mixing with the static file.
//
// The frontend used to decide that question independently in about ten places,
// each with its own answer. Tracks came from the database while the vocabulary
// chips came from the static file, so a published story was only ever half
// itself: editing a word in the builder changed the Vocab Quiz but not the
// chips beside the waveform, and the two could show different word lists for
// the same track on the same screen.
//
// So: this module picks a BRANCH and never blends. Everything downstream
// consumes the result and asks no further questions about where it came from.
// The static path-building below is the only copy left in the app — nothing
// outside this file reconstructs a clip URL from folder maps.
import { AudioTrack } from "../../types";
import { getAudioTracksByStory } from "../audiodata/audioDataByDifficulty";
import {
  trackVocabulary,
  trackPhrasalVerbs,
  trackFolderMap,
  storyFolderMap,
  VocabEntry,
} from "../vocabulary/Vocabulary";
import { getStorageUrl } from "../../services/yandexStorage";
import { getOrderedComics } from "../../components/Player/Comics/comicsData";
import {
  adaptPublishedStoryToTracks,
  type PublishedStory,
  type PublishedStoryPart,
} from "../../services/storyServices";

export type StorySource = "db" | "static";
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

// comicsData's manifest is keyed by difficulty alone, so its pages belong to
// that level's original character story and nothing else. A second story on the
// same level must not borrow them — that is how an easy story ended up showing
// Leo's artwork.
const COMIC_OWNER_BY_DIFFICULTY: Record<string, string> = {
  easy: "leo",
  medium: "maya",
  hard: "daniel",
};

/**
 * Bucket URL for a built-in story's vocab clip.
 *
 * Lowercased deliberately: the objects in the bucket are lowercase, and the
 * preload path (usePreloadStoryAssets) and the import path
 * (assembleImportPayload) already lowercase. The old chip playback did not, so
 * a capitalised audioKey preloaded one object and tried to play another.
 */
export function staticVocabClipUrl(
  difficulty: string,
  slug: string,
  trackId: string,
  audioKey: string,
  kind: VocabKind,
): string {
  const storyFolder = storyFolderMap[difficulty]?.[slug] ?? "";
  const trackFolder = trackFolderMap[difficulty]?.[slug]?.[trackId] ?? "";
  if (!storyFolder || !trackFolder) return "";
  const subfolder = kind === "phrasal" ? "phrasal-verbs" : "vocab";
  return getStorageUrl(
    `${storyFolder}/quiz/${trackFolder}/${subfolder}/${audioKey.toLowerCase()}.mp3`,
  );
}

const adaptStaticWords = (
  entries: VocabEntry[],
  difficulty: string,
  slug: string,
  trackId: string,
  kind: VocabKind,
): ResolvedVocabEntry[] =>
  entries.map((entry) => ({
    word: entry.word,
    definition: entry.definition,
    audioKey: entry.audioKey,
    audioUrl: staticVocabClipUrl(difficulty, slug, trackId, entry.audioKey, kind),
  }));

// DB entries already carry a full URL — there is nothing to build.
const adaptDbWords = (entries: PublishedStoryPart["vocabulary"]): ResolvedVocabEntry[] =>
  entries.map((entry) => ({
    word: entry.word,
    definition: entry.definition,
    audioKey: entry.audioKey,
    audioUrl: entry.audioUrl ?? "",
  }));

function resolveFromDb(story: PublishedStory, difficulty: string): ResolvedStory {
  const partByNumber = new Map(story.parts.map((p) => [String(p.partNumber), p]));
  return {
    source: "db",
    difficulty,
    slug: story.storyId,
    tracks: adaptPublishedStoryToTracks(story).map((track) => {
      const part = partByNumber.get(track.id);
      return {
        ...track,
        vocabulary: adaptDbWords(part?.vocabulary ?? []),
        phrasalVerbs: adaptDbWords(part?.phrasalVerbs ?? []),
      };
    }),
  };
}

function resolveFromStatic(difficulty: string, slug: string): ResolvedStory {
  const ownsManifestComics = COMIC_OWNER_BY_DIFFICULTY[difficulty] === slug;
  const manifestComics = ownsManifestComics ? getOrderedComics(difficulty) : [];

  return {
    source: "static",
    difficulty,
    slug,
    tracks: getAudioTracksByStory(difficulty, slug).map((track) => ({
      ...track,
      // Resolved here so ComicsDisplay can take an explicit src and drop its
      // own difficulty-keyed fallback, which could not tell one story on a
      // level from another.
      comicUrl: track.comicUrl ?? manifestComics[Number(track.id) - 1] ?? null,
      vocabulary: adaptStaticWords(
        trackVocabulary[difficulty]?.[slug]?.[track.id] ?? [],
        difficulty,
        slug,
        track.id,
        "vocab",
      ),
      phrasalVerbs: adaptStaticWords(
        trackPhrasalVerbs[difficulty]?.[slug]?.[track.id] ?? [],
        difficulty,
        slug,
        track.id,
        "phrasal",
      ),
    })),
  };
}

/**
 * Resolve one story. `dbStory` is the published document if the caller found
 * one; passing it is what selects the DB branch.
 */
export function resolveStory(
  difficulty: string,
  slug: string,
  dbStory: PublishedStory | null | undefined,
): ResolvedStory {
  return dbStory ? resolveFromDb(dbStory, difficulty) : resolveFromStatic(difficulty, slug);
}

/**
 * The comic page the BUILT-IN version of this story would show for a part.
 *
 * The static and DB branches get their artwork from different places: the
 * static branch reads comicsData's manifest (keyed by difficulty, so only that
 * level's original character story owns those pages), while the DB branch
 * reads `part.comicUrl` and nothing else. That is by design — but it means a
 * story imported before the importer learned about the manifest carries no
 * comic URLs, and publishing it swaps a story that HAD comics for one that
 * does not.
 *
 * This is exported so the Story Builder can offer the built-in page rather than
 * making someone re-upload artwork that already ships with the app, and so the
 * offer uses this file's rule instead of a fourth copy of it.
 */
export function builtInComicFor(
  difficulty: string,
  slug: string,
  partNumber: number,
): string | null {
  const track = resolveFromStatic(difficulty, slug).tracks.find(
    (t) => Number(t.id) === partNumber,
  );
  return track?.comicUrl ?? null;
}

export const findResolvedTrack = (
  story: ResolvedStory,
  trackId: string,
): ResolvedTrack | undefined => story.tracks.find((t) => t.id === trackId);
