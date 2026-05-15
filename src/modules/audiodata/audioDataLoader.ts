import { audioTracks as easyTracks } from './audioData';
import { mediumAudioData as mediumTracks } from './audioDataMedium';
import { hardAudioData as hardTracks } from './audioDataHard';
import { AudioTrack } from '../../types';
import { DifficultySlug } from '../../types/storyGroups';

// Currently one story group per difficulty, keyed by slug
const audioDataMap: Record<string, AudioTrack[]> = {
  'easy:leo': easyTracks,
  'medium:maya': mediumTracks,
  'hard:daniel': hardTracks,
};

export const getAudioTracks = (difficulty: DifficultySlug, storySlug: string): AudioTrack[] => {
  return audioDataMap[`${difficulty}:${storySlug}`] || [];
};

export const getAudioTrack = (difficulty: DifficultySlug, storySlug: string, trackNumber: number): AudioTrack | undefined => {
  const tracks = getAudioTracks(difficulty, storySlug);
  return tracks[trackNumber - 1]; // trackNumber is 1-based
};