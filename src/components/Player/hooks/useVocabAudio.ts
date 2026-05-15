// hooks/useVocabAudio.ts
import { useCallback, useRef } from "react";
import { trackFolderMap, storyFolderMap } from "../../../modules/vocabulary/Vocabulary";

export function useVocabAudio(trackId: string, difficulty: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playVocabWord = useCallback(
    (fileName: string) => {
      // Stop any currently playing vocab audio
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const storyFolder = storyFolderMap[difficulty] ?? "";
      const trackFolder = trackFolderMap[difficulty]?.[trackId] ?? "";

      if (!storyFolder || !trackFolder) {
        console.warn(
          `No folder mapping found for difficulty: "${difficulty}", trackId: "${trackId}"`
        );
        return;
      }

      
      // Build the raw path first, then encode the full URI
      // encodeURI preserves apostrophes and slashes, only encodes spaces etc.
     const rawUrl = `/assets/${storyFolder}/quiz/${trackFolder}/vocab/${fileName}.mp3`;
console.log("Attempting vocab audio:", rawUrl); // ← add this
const url = encodeURI(rawUrl);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.play().catch((err) => {
        console.warn(`Vocab audio error for "${fileName}":`, err.message);
      });
    },
    [trackId, difficulty],
  );

  return { playVocabWord };
}
