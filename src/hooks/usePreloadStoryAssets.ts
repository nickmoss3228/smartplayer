import { useCallback, useRef } from 'react';
import { preloadAudio, preloadAudios } from '../services/preload';
import { resolveStory, findResolvedTrack } from '../modules/story/resolveStory';
import type { Difficulty } from '../types/Player';


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

      // Resolved the same way the player resolves it, so preloading can no
      // longer warm a different object than playback later requests — the two
      // used to build their own paths, and disagreed on letter case.
      const trackId = String(level);
      const track   = findResolvedTrack(resolveStory(difficulty, storySlug, null), trackId);

      // Main story audio — may be several MB, so we start right when the modal
      // opens, and mark it 'high' priority so it isn't starved of bandwidth by
      // the burst of vocab-clip requests fired right after it.
      if (track?.audio) {
        preloadAudio(track.audio, 'auto', 'high');
        console.debug(`[preload] main audio (high priority) → ${track.audio}`);
      }

      // Vocab clips are 50–100 KB each — plenty of time to finish before the
      // user taps "Start listening", so they're deprioritized behind the main
      // track rather than competing with it for the same connection budget.
      const vocabUrls = [...(track?.vocabulary ?? []), ...(track?.phrasalVerbs ?? [])]
        .map((word) => word.audioUrl)
        .filter(Boolean);
      preloadAudios(vocabUrls, 'auto', 'low');
      console.debug(`[preload] ${vocabUrls.length} vocab clips for level ${level}`);
    },
    [difficulty, storySlug],
  );

  return { preloadAudioAssets };
}