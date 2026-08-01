// audioDataByDiffculty.ts
import { audioTracks as leoTracks } from "../audiodata/audioData";
import { leoAdditionalAudioData as leoAdditionalTracks } from "../audiodata/audioDataLeoAdditional";
import {
  newsRolandGarrosAudioData,
  newsFamilyVisitAudioData,
  newsGrazingBoardAudioData,
} from "../audiodata/audioDataNewsPlaceholder";
import { mediumAudioData as mayaTracks } from "../audiodata/audioDataMedium";
import { hardAudioData as danielTracks } from "../audiodata/audioDataHard";
import { AudioTrack } from "../../types";

const tracksByStory: Record<string, Record<string, AudioTrack[]>> = {
  easy: {
    leo: leoTracks,
    "leo-additional": leoAdditionalTracks,
    "news-roland-garros": newsRolandGarrosAudioData,
    "news-family-visit": newsFamilyVisitAudioData,
    "news-grazing-board": newsGrazingBoardAudioData,
  },
  medium: {
    maya: mayaTracks,
  },
  hard: {
    daniel: danielTracks,
  },
};

export const getAudioTracksByStory = (
  difficulty: string,
  storySlug: string,
): AudioTrack[] => {
  console.log('[getAudioTracksByStory] called with:', difficulty, storySlug);
  const tracks = tracksByStory[difficulty]?.[storySlug] ?? [];
  console.log('[getAudioTracksByStory] returning tracks:', tracks.map(t => t.id + ':' + t.title));
  return tracks;
};

// Keep this for backward compat if anything else still calls it by difficulty only,
// defaulting to the "main" story of that difficulty.
export const getAudioTracksByDifficulty = (difficulty: string): AudioTrack[] =>
  getAudioTracksByStory(difficulty, "leo"); // or whatever default makes sense