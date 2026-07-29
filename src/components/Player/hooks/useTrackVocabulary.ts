import {
  trackPhrasalVerbs,
  trackVocabulary,
} from "../../../modules/vocabulary/Vocabulary";

// Looks up the vocab words + phrasal verbs for the current track.
export const useTrackVocabulary = (
  difficulty: string,
  storySlug: string,
  trackId: string,
) => {
  const currentVocabulary =
    trackVocabulary[difficulty]?.[storySlug]?.[String(trackId)] ?? [];

  const currentPhrasalVerbs =
    trackPhrasalVerbs[difficulty]?.[storySlug]?.[trackId] ?? [];

  return { currentVocabulary, currentPhrasalVerbs };
};
