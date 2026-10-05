import { useCallback, useEffect, useRef, useState } from "react";

interface UseWordClipArgs {
  word: string;
  audioKey?: string;
  /** Already-resolved clip URL. Nothing here builds one. */
  audioUrl?: string;
  onPlay: (audioKey: string, audioUrl: string) => HTMLAudioElement | null;
  volume?: number;
}

/**
 * Play / stop one vocabulary clip. Shared by the phone's chips (VocabChip) and
 * the desktop word rail (WordRow) so the two layouts cannot drift apart on how
 * a word is played, stopped, or keyed.
 */
export function useWordClip({ word, audioKey, audioUrl = "", onPlay, volume = 1 }: UseWordClipArgs) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const toggle = useCallback(() => {
    const key = (audioKey ?? word).toLowerCase();

    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    const audio = onPlay(key, audioUrl);
    if (!audio) return;

    audio.volume = volume;
    audioRef.current = audio;

    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("ended", () => setIsPlaying(false));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("error", () => {
      setIsPlaying(false);
      console.warn(`[VocabChip] Could not load audio for "${word}" key: "${key}"`);
    });
  }, [word, audioKey, audioUrl, onPlay, volume]);

  return { isPlaying, toggle };
}
