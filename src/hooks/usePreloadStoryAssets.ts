import { useCallback, useRef } from 'react';
import { preloadAudio, preloadAudios } from '../services/preload';
import {
  trackVocabulary,
  trackFolderMap,
  storyFolderMap,
} from '../modules/vocabulary/Vocabulary';
import { getStorageUrl } from '../services/yandexStorage';
import { getAudioTracksByStory } from '../modules/audiodata/audioDataByDifficulty';
import type { Difficulty } from '../types/Player';

/** Mirrors the URL-building logic from useVocabAudio. */
function buildVocabUrls(difficulty: string, storySlug: string, trackId: string): string[] {
  const words       = trackVocabulary[difficulty]?.[storySlug]?.[trackId] ?? [];
  const storyFolder = storyFolderMap[difficulty]?.[storySlug] ?? '';
  const trackFolder = trackFolderMap[difficulty]?.[storySlug]?.[trackId] ?? '';

  if (!storyFolder || !trackFolder || words.length === 0) return [];

  return words.map(({ word, audioKey }) => {
    const key = (audioKey ?? word).toLowerCase();
    return getStorageUrl(`${storyFolder}/quiz/${trackFolder}/vocab/${key}.mp3`);
  });
}

/**
 * Call preloadAudioAssets(level) when the story preview modal opens.
 * It starts buffering the main audio track + all vocab clips so they're
 * ready by the time the user navigates to the Player.
 */
export function usePreloadStoryAssets(difficulty: Difficulty, storySlug: string) {
  // Deduplication: never preload the same level twice in a session.
  const preloadedLevels = useRef<Set<number>>(new Set());

  const preloadAudioAssets = useCallback(
    (level: number) => {
      if (preloadedLevels.current.has(level)) return;
      preloadedLevels.current.add(level);

      const trackId     = String(level);
      const audioTracks = getAudioTracksByStory(difficulty, storySlug);
      const track       = audioTracks.find(t => t.id === trackId);

      // Main story audio — may be several MB, so we start right when the modal opens.
      if (track?.audio) {
        preloadAudio(track.audio, 'auto');
        console.debug(`[preload] main audio → ${track.audio}`);
      }

      // Vocab clips are 50–100 KB each, loads almost instantly.
      const vocabUrls = buildVocabUrls(difficulty, storySlug, trackId);
      preloadAudios(vocabUrls, 'auto');
      console.debug(`[preload] ${vocabUrls.length} vocab clips for level ${level}`);
    },
    [difficulty, storySlug],
  );

  return { preloadAudioAssets };
}