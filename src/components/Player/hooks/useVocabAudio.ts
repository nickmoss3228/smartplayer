import { useCallback, useEffect, useRef } from "react";
import { trackFolderMap, storyFolderMap } from "../../../modules/vocabulary/Vocabulary";
import { getStorageUrl } from "../../../services/yandexStorage";

type VocabType = "vocab" | "phrasal";

export function useVocabAudio(trackId: string, difficulty: string, storySlug: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }, []);

  useEffect(() => {
    return stop;
  }, [trackId, difficulty, storySlug, stop]);

  const playVocabWord = useCallback(
    (fileName: string, type: VocabType = "vocab"): HTMLAudioElement | null => {
      stop();

      const storyFolder = storyFolderMap[difficulty]?.[storySlug] ?? "";
      const trackFolder = trackFolderMap[difficulty]?.[storySlug]?.[trackId] ?? "";

      if (!storyFolder || !trackFolder) {
        console.warn(
          `[useVocabAudio] No folder mapping found for difficulty: "${difficulty}", storySlug: "${storySlug}", trackId: "${trackId}"`
        );
        return null;
      }

      // разные подпапки для обычной лексики и фразовых глаголов
      const subfolder = type === "phrasal" ? "phrasal-verbs" : "vocab";

      const path = `${storyFolder}/quiz/${trackFolder}/${subfolder}/${fileName}.mp3`;
      const url = getStorageUrl(path);

      console.log(`[useVocabAudio] Fetching ${type} audio from YOS:`, url);

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
    [trackId, difficulty, storySlug, stop],
  );

  return { playVocabWord, stop };
}