// Assembles a full Story Builder import payload for a built-in (static-file)
// story, client-side — the backend can't read audioDataByDifficulty.ts /
// Vocabulary.ts itself (plain frontend TypeScript), so this combines them
// with the one server-only piece (quiz answer keys) into the same shape the
// rest of the builder already saves.
import { StoryGroup, DifficultySlug } from "../../../types/storyGroups";
import { getAudioTracksByStory } from "../../../modules/audiodata/audioDataByDifficulty";
import {
  trackVocabulary,
  trackPhrasalVerbs,
  trackFolderMap,
  storyFolderMap,
} from "../../../modules/vocabulary/Vocabulary";
import { getStorageUrl } from "../../../services/yandexStorage";
import { getOrderedComics } from "../../../components/Player/Comics/comicsData";
import {
  fetchStaticQuizSource,
  ImportStoryPayload,
  StoryPart,
  VocabEntry,
} from "../../../services/adminStoryServices";

// comicManifest is keyed by difficulty alone, so each level's pages belong to
// that level's original character story and nothing else. Importing any other
// story on the same level (leo-additional, the news placeholders) must NOT
// claim them, or it would ship someone else's artwork — those import with no
// comics, and get their pages from the builder's Comics tab instead.
const COMIC_OWNER_BY_DIFFICULTY: Record<DifficultySlug, string> = {
  easy: "leo",
  medium: "maya",
  hard: "daniel",
};

function buildVocabAudioUrl(
  difficulty: DifficultySlug,
  storySlug: string,
  trackId: string,
  audioKey: string,
  type: "vocab" | "phrasal"
): string {
  const storyFolder = storyFolderMap[difficulty]?.[storySlug] ?? "";
  const trackFolder = trackFolderMap[difficulty]?.[storySlug]?.[trackId] ?? "";
  const subfolder = type === "phrasal" ? "phrasal-verbs" : "vocab";
  return getStorageUrl(`${storyFolder}/quiz/${trackFolder}/${subfolder}/${audioKey.toLowerCase()}.mp3`);
}

function adaptWords(
  difficulty: DifficultySlug,
  storySlug: string,
  trackId: string,
  type: "vocab" | "phrasal"
): VocabEntry[] {
  const source = type === "vocab" ? trackVocabulary : trackPhrasalVerbs;
  const words = source[difficulty]?.[storySlug]?.[trackId] ?? [];
  return words.map((w) => ({
    word: w.word,
    definition: w.definition,
    audioKey: w.audioKey,
    audioUrl: buildVocabAudioUrl(difficulty, storySlug, trackId, w.audioKey, type),
  }));
}

export async function assembleImportPayload(
  token: string,
  difficulty: DifficultySlug,
  storyGroup: StoryGroup
): Promise<ImportStoryPayload> {
  const storySlug = storyGroup.slug;
  const audioTracks = getAudioTracksByStory(difficulty, storySlug);
  const quizByPart = await fetchStaticQuizSource(token, difficulty, storySlug);
  const comics =
    COMIC_OWNER_BY_DIFFICULTY[difficulty] === storySlug ? getOrderedComics(difficulty) : [];

  const parts: StoryPart[] = audioTracks.map((track) => {
    const partNumber = Number(track.id);
    return {
      partNumber,
      audioUrl: track.audio,
      // A track that names its own page wins; the manifest only answers for the
      // one story per difficulty that owns those pages. Without this, importing
      // leo-additional or a news story would drop the artwork they now carry.
      comicUrl: track.comicUrl ?? comics[partNumber - 1] ?? null,
      timeMarkers: track.timeMarkers,
      vocabulary: adaptWords(difficulty, storySlug, track.id, "vocab"),
      phrasalVerbs: adaptWords(difficulty, storySlug, track.id, "phrasal"),
      quiz: (quizByPart[track.id] ?? []).map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        referenceTime: q.referenceTime,
        audio: q.audio,
      })),
    };
  });

  return {
    difficulty,
    storyId: storySlug,
    storyName: storyGroup.title,
    description: storyGroup.description,
    characterIcon: storyGroup.coverEmoji,
    totalParts: parts.length,
    parts,
  };
}
