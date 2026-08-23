import { useCallback, useEffect, useRef } from "react";

/**
 * Plays one vocabulary clip at a time.
 *
 * It takes a URL. It used to take (trackId, difficulty, storySlug) and rebuild
 * the path from storyFolderMap/trackFolderMap, which meant playback silently
 * disagreed with everything else: a DB-backed story has its own clip URLs and
 * no entry in those maps, so chips either played the built-in story's audio or
 * warned and did nothing. Resolving now happens once, in
 * modules/story/resolveStory.ts, and this hook just plays what it is handed.
 */
export function useVocabAudio(resetKey: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }, []);

  // Changing track must not leave the previous track's word still playing.
  useEffect(() => stop, [resetKey, stop]);

  const playVocabWord = useCallback(
    (audioUrl: string): HTMLAudioElement | null => {
      stop();
      if (!audioUrl) return null;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play().catch(() => {
        // Autoplay rejection or a missing file: the chip simply stays silent.
        // The Story Builder is where a broken clip gets diagnosed.
      });
      return audio;
    },
    [stop],
  );

  return { playVocabWord, stop };
}
