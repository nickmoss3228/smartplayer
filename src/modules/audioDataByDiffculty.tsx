import { audioTracks } from '../modules/audioData';
import { mediumAudioData } from '../modules/audioDataMedium';
import { hardAudioData } from '../modules/audioDataHard';
import { AudioTrack } from '../types';

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