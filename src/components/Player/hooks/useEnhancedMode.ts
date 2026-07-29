import { useState } from "react";

// Enhanced (repeat-sequence) mode + whether a session is currently active.
export const useEnhancedMode = () => {
  const [isEnhancedMode, setIsEnhancedMode] = useState(true);
  const [isEnhancedSessionActive, setIsEnhancedSessionActive] =
    useState(false);

  // ── reset session when switching modes ───────────────────
  const handleToggleEnhancedMode = () => {
    setIsEnhancedMode((prev) => !prev);
    setIsEnhancedSessionActive(false);
  };

  return {
    isEnhancedMode,
    isEnhancedSessionActive,
    setIsEnhancedSessionActive,
    handleToggleEnhancedMode,
  };
};
