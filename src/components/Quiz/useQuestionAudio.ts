import { useCallback, useEffect, useRef, useState } from "react";

export type QuestionSpeed = "fast" | "slow";

interface UseQuestionAudioProps {
  fastSrc?: string;
  slowSrc?: string;
}

/**
 * One quiz question's recording: play it at normal or slow speed, and know
 * when it has been heard to the end — the answers stay locked until then.
 *
 * A clip that fails to load or play counts as heard. Otherwise a broken file
 * would lock the answers for good, and the student could never finish the quiz.
 *
 * `progress()` reads the playhead (0–1) without re-rendering, for a ring the
 * caller animates itself.
 */
export function useQuestionAudio({ fastSrc, slowSrc }: UseQuestionAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<QuestionSpeed | null>(null);
  const [heard, setHeard] = useState(false);

  const release = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audioRef.current = null;
  };

  // A new question starts unheard.
  useEffect(() => {
    release();
    setPlaying(null);
    setHeard(false);
    return release;
  }, [fastSrc, slowSrc]);

  const play = useCallback(
    (speed: QuestionSpeed = "fast") => {
      const src = speed === "slow" && slowSrc ? slowSrc : fastSrc;
      if (!src) return;
      release();
      const audio = new Audio(src);
      audioRef.current = audio;
      const finish = () => {
        if (audioRef.current !== audio) return;
        audioRef.current = null;
        setPlaying(null);
        setHeard(true);
      };
      audio.onended = finish;
      audio.onerror = finish;
      setPlaying(speed);
      audio.play().catch((error: unknown) => {
        // Blocked autoplay is not a broken clip: the student taps to play it.
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          if (audioRef.current === audio) audioRef.current = null;
          setPlaying(null);
          return;
        }
        finish();
      });
    },
    [fastSrc, slowSrc],
  );

  const stop = useCallback(() => {
    release();
    setPlaying(null);
  }, []);

  const progress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return 0;
    return Math.min(1, audio.currentTime / audio.duration);
  }, []);

  return { playing, heard, play, stop, progress, hasSlow: Boolean(slowSrc) };
}
