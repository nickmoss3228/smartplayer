// hooks/useVocabAudio.ts
import { useCallback, useEffect, useRef } from "react";
import { trackFolderMap, storyFolderMap } from "../../../modules/vocabulary/Vocabulary";
import { getStorageUrl } from "../../../services/yandexStorage"; // ← adjust path if needed

export function useVocabAudio(trackId: string, difficulty: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }, []);

  useEffect(() => {
    return stop;
  }, [trackId, difficulty, stop]);

  const playVocabWord = useCallback(
    (fileName: string): HTMLAudioElement | null => {
      stop();

      const storyFolder = storyFolderMap[difficulty] ?? "";
      const trackFolder = trackFolderMap[difficulty]?.[trackId] ?? "";

      if (!storyFolder || !trackFolder) {
        console.warn(
          `[useVocabAudio] No folder mapping found for difficulty: "${difficulty}", trackId: "${trackId}"`
        );
        return null;
      }

      // Build the YOS URL — getStorageUrl encodes everything except "/"
      // so spaces, apostrophes and other special chars in folder names are handled
      const path = `${storyFolder}/quiz/${trackFolder}/vocab/${fileName}.mp3`;
      const url = getStorageUrl(path);

      console.log(`[useVocabAudio] Fetching vocab audio from YOS:`, url);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("canplaythrough", () => {
        console.log(`[useVocabAudio] ✅ Successfully loaded: "${fileName}" → ${url}`);
      });

      audio.addEventListener("error", (e) => {
        console.error(
          `[useVocabAudio] ❌ Failed to load: "${fileName}" → ${url}`,
          e
        );
      });

      audio.play().catch((err) => {
        console.warn(`[useVocabAudio] Playback rejected for "${fileName}":`, err.message);
      });

      return audio;
    },
    [trackId, difficulty, stop],
  );

  return { playVocabWord, stop };
}