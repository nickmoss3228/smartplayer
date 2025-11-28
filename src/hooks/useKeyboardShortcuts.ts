import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  handlePlayPause: () => void;
  goToNextSentence: () => void;
  replayCurrentSentence: () => void;
  isPlayMode: boolean;
}

export const useKeyboardShortcuts = ({
  handlePlayPause,
  goToNextSentence,
  replayCurrentSentence,
  isPlayMode
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.code) {
        case "Space":
          e.preventDefault();
          handlePlayPause();
          break;
        case "ArrowRight":
          if (isPlayMode) goToNextSentence();
          break;
        case "KeyR":
          if (isPlayMode) replayCurrentSentence();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handlePlayPause, goToNextSentence, replayCurrentSentence, isPlayMode]);
};