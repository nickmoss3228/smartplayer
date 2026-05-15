import { audioTracks } from './audioData';
import { mediumAudioData } from './audioDataMedium';
import { hardAudioData } from './audioDataHard';
import { AudioTrack } from '../../types';

export const getAudioTracksByDifficulty = (difficulty: string): AudioTrack[] => {
  switch (difficulty) {
    case 'easy':
      return audioTracks;
    case 'medium':
      return mediumAudioData;
    case 'hard':
      return hardAudioData;
    default:
      return audioTracks;
  }
};