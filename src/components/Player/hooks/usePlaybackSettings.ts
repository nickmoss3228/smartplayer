import { useState } from "react";

// Repeat count + controlled-mode toggle — shared between useSegmentEngine and usePlayerControls.
export const usePlaybackSettings = () => {
  const [repeatCount, setRepeatCount] = useState(2);
  const [isControlledMode, setIsControlledMode] = useState(false);

  return { repeatCount, setRepeatCount, isControlledMode, setIsControlledMode };
};
