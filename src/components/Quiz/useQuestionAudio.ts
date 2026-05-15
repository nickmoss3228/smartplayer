import { useRef, useState, useEffect, useCallback } from "react";

export type PlayState = "idle" | "playing-fast" | "played-fast" | "playing-slow" | "played-slow";

interface UseQuestionAudioProps {
  fastSrc?: string;
  slowSrc?: string;
}

export function useQuestionAudio({ fastSrc, slowSrc }: UseQuestionAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playState, setPlayState] = useState<PlayState>("idle");

  // Cleanup on unmount or when sources change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [fastSrc, slowSrc]);

  // Reset when the question changes (sources change)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayState("idle");
  }, [fastSrc, slowSrc]);

  const playAudio = useCallback(
    (src: string, onEnd: () => void) => {
      console.log("Attempting to play:", src); // <-- add this
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(encodeURI(src)); // <-- encode spaces in path
      audioRef.current = audio;
      audio.play().catch(console.error);
      audio.addEventListener("ended", onEnd, { once: true });
    },
    []
  );

  const handlePress = useCallback(() => {
    if (!fastSrc) return;

    if (playState === "idle" || playState === "played-slow") {
      // (Re)play fast version
      setPlayState("playing-fast");
      playAudio(fastSrc, () => setPlayState("played-fast"));
    } else if (playState === "playing-fast") {
      // Already playing fast — do nothing (or you could restart)
      return;
    } else if (playState === "played-fast") {
      // Play slow version on second click
      if (!slowSrc) return;
      setPlayState("playing-slow");
      playAudio(slowSrc, () => setPlayState("played-slow"));
    } else if (playState === "playing-slow") {
      // Already playing slow — do nothing
      return;
    }
  }, [fastSrc, slowSrc, playState, playAudio]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayState("idle");
  }, []);

  return { playState, handlePress, stop };
}