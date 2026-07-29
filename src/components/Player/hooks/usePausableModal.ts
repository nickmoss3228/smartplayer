import { useCallback, useState } from "react";
import WaveSurfer from "wavesurfer.js";

// Opens a modal, pausing the main track first so its audio doesn't overlap.
export const usePausableModal = (
  wavesurfer: React.MutableRefObject<WaveSurfer | null>,
  onPause?: (active: boolean) => void,
) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    if (wavesurfer.current?.isPlaying()) {
      wavesurfer.current.pause();
      onPause?.(false);
      // the wavesurfer 'pause' event fires → dispatches setIsPlaying(false) automatically
    }
    setIsOpen(true);
  }, [wavesurfer, onPause]);

  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
};
