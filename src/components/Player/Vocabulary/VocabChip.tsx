import React, { useCallback, useEffect, useRef, useState } from "react";

interface VocabChipProps {
  word: string;
  audioKey?: string;
  onPlay: (audioKey: string) => HTMLAudioElement | null; // ← now returns the element
  volume?: number;
}

export const VocabChip: React.FC<VocabChipProps> = React.memo(
  ({ word, audioKey, onPlay, volume = 1 }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Keep live volume in sync with parent (mute / volume slider)
    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.volume = volume;
      }
    }, [volume]);

    const handleClick = useCallback(() => {
      const key = (audioKey ?? word).toLowerCase();

      // ── Toggle off if this chip is already playing ──────────────────────
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        return;
      }

      // ── Delegate playback to the hook, get back the Audio element ───────
      const audio = onPlay(key);
      if (!audio) return;

      audio.volume = volume; // apply current volume immediately
      audioRef.current = audio;

      // Wire up isPlaying state
      audio.addEventListener("play", () => setIsPlaying(true));
      audio.addEventListener("ended", () => setIsPlaying(false));
      audio.addEventListener("pause", () => setIsPlaying(false)); // also fires when another chip stops this one
      audio.addEventListener("error", () => {
        setIsPlaying(false);
        console.warn(`[VocabChip] Could not load audio for "${word}" (key: "${key}")`);
      });
    }, [word, audioKey, onPlay, volume]);

    return (
      <div className="group relative">
        <button
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 transition-colors duration-200 text-white text-xs font-semibold font-['Montserrat'] px-3 py-1.5 rounded-full cursor-pointer select-none shadow-sm
            ${
              isPlaying
                ? "bg-green-400 ring-2 ring-green-300 ring-offset-1 ring-offset-transparent"
                : "bg-green-600 hover:bg-green-500"
            }`}
          title={`Hear pronunciation of "${word}"`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-3 h-3 flex-shrink-0 transition-transform duration-150 ${
              isPlaying ? "scale-110 animate-pulse" : ""
            }`}
          >
            <path d="M9.25 3.375a.75.75 0 0 0-1.28-.53L4.72 6H2.5A1.5 1.5 0 0 0 1 7.5v5A1.5 1.5 0 0 0 2.5 14h2.22l3.25 3.155a.75.75 0 0 0 1.28-.53V3.375ZM13.36 5.43a.75.75 0 0 1 1.06.02 7.5 7.5 0 0 1 0 9.1.75.75 0 1 1-1.13-.99 6 6 0 0 0 0-7.07.75.75 0 0 1 .07-1.06ZM11.3 7.92a.75.75 0 0 1 1.04.17 4.5 4.5 0 0 1 0 3.82.75.75 0 0 1-1.22-.87 3 3 0 0 0 0-2.08.75.75 0 0 1 .18-1.04Z" />
          </svg>
          {word}
        </button>
      </div>
    );
  },
);

VocabChip.displayName = "VocabChip";