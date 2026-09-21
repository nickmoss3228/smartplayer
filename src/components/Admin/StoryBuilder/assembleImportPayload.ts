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
// Read straight from the locale files rather than through `t`: the payload
// needs BOTH languages at once, while `t` only ever answers in the one the
// admin happens to be using. Importing in the admin’s language and thereby
// deleting the other one is exactly the data loss this is meant to prevent.
import enTranslation from "../../../locales/en/translation.json";
import ruTranslation from "../../../locales/ru/translation.json";
import { builtInComicFor } from "../../../modules/story/resolveStory";
import {
  fetchStaticQuizSource,
  ImportStoryPayload,
  StoryPart,
  VocabEntry,
} from "../../../services/adminStoryServices";

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

type StoryTextEntry = { title?: string; description?: string };

function localeEntry(
  bundle: unknown,
  difficulty: DifficultySlug,
  slug: string,
): StoryTextEntry {
  const stories = (bundle as { stories?: Record<string, Record<string, StoryTextEntry>> }).stories;
  return stories?.[difficulty]?.[slug] ?? {};
}

export async function assembleImportPayload(
  token: string,
  difficulty: DifficultySlug,
  storyGroup: StoryGroup
): Promise<ImportStoryPayload> {
  const storySlug = storyGroup.slug;
  const audioTracks = getAudioTracksByStory(difficulty, storySlug);
  const quizByPart = await fetchStaticQuizSource(token, difficulty, storySlug);

  const parts: StoryPart[] = audioTracks.map((track) => {
    const partNumber = Number(track.id);
    return {
      partNumber,
      // The track names itself, so publishing keeps "Story"/"Discussion"
      // instead of falling back to a generated "Name — 1".
      title: track.title,
      audioUrl: track.audio,
      helpAudio: track.helpAudio ?? [],
      // Whatever the built-in version of this story shows — the track's own
      // page, or the difficulty manifest for the one story per level that owns
      // it. resolveStory owns that rule; this used to keep a second copy.
      comicUrl: builtInComicFor(difficulty, storySlug, partNumber),
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
    // Carry the shelf across: without it a published news story lands under
    // "Stories", because the DB copy replaces the static entry wholesale.
    category: storyGroup.category,
    localized: {
      title: {
        en: localeEntry(enTranslation, difficulty, storySlug).title ?? storyGroup.title,
        ru: localeEntry(ruTranslation, difficulty, storySlug).title ?? storyGroup.title,
      },
      description: {
        en: localeEntry(enTranslation, difficulty, storySlug).description ?? storyGroup.description,
        ru: localeEntry(ruTranslation, difficulty, storySlug).description ?? storyGroup.description,
      },
    },
    coverUrl: storyGroup.cover ?? null,
    totalParts: parts.length,
    parts,
  };
}
