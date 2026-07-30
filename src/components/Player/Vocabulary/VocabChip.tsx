import React, { useCallback, useEffect, useRef, useState } from "react";

interface VocabChipProps {
  word: string;
  audioKey?: string;
  onPlay: (audioKey: string) => HTMLAudioElement | null;
  volume?: number;
  /** True once the student has correctly identified this word in the VocabQuiz */
  isLearned?: boolean;
}

export const VocabChip: React.FC<VocabChipProps> = React.memo(
  ({ word, audioKey, onPlay, volume = 1, isLearned = false }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.volume = volume;
      }
    }, [volume]);

    const handleClick = useCallback(() => {
      const key = (audioKey ?? word).toLowerCase();

      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        return;
      }

      const audio = onPlay(key);
      if (!audio) return;

      audio.volume = volume;
      audioRef.current = audio;

      audio.addEventListener("play", () => setIsPlaying(true));
      audio.addEventListener("ended", () => setIsPlaying(false));
      audio.addEventListener("pause", () => setIsPlaying(false));
      audio.addEventListener("error", () => {
        setIsPlaying(false);
        console.warn(
          `[VocabChip] Could not load audio for "${word}" key: "${key}"`,
        );
      });
    }, [word, audioKey, onPlay, volume]);

    return (
      <div className="group relative">
        <button
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 transition-all duration-200 text-xs font-semibold font-['Montserrat'] px-3 py-1.5 rounded-full cursor-pointer select-none
            ${
              isLearned
                ? "bg-green-500 text-white ring-1 ring-green-300/70 shadow-sm shadow-green-500/30"
                : "bg-white/15 text-white/90 hover:bg-white/25"
            }
            ${isPlaying ? "ring-2 ring-white/70 scale-105" : ""}`}
          title={`Hear pronunciation of "${word}"`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-3 h-3 flex-shrink-0 transition-transform duration-150 ${
              isPlaying ? "scale-110 animate-pulse text-white" : "text-white/80"
            }`}
          >
            <path d="M9.25 3.375a.75.75 0 0 0-1.28-.53L4.72 6H2.5A1.5 1.5 0 0 0 1 7.5v5A1.5 1.5 0 0 0 2.5 14h2.22l3.25 3.155a.75.75 0 0 0 1.28-.53V3.375ZM13.36 5.43a.75.75 0 0 1 1.06.02 7.5 7.5 0 0 1 0 9.1.75.75 0 1 1-1.13-.99 6 6 0 0 0 0-7.07.75.75 0 0 1 .07-1.06ZM11.3 7.92a.75.75 0 0 1 1.04.17 4.5 4.5 0 0 1 0 3.82.75.75 0 0 1-1.22-.87 3 3 0 0 0 0-2.08.75.75 0 0 1 .18-1.04Z" />
          </svg>

          <span className="text-white">{word}</span>
        </button>
      </div>
    );
  },
);

VocabChip.displayName = "VocabChip";