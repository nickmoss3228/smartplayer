import { useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { useAppDispatch } from "../../../hooks/hooks";
import { setVolume, setIsMuted } from "../../../store/playerslice";

// Converts a 0–10 stepped UI value (VolumeControl) into a normalized 0–1 volume.
export const useVolumeControl = (
  wavesurfer: React.MutableRefObject<WaveSurfer | null>,
) => {
  const dispatch = useAppDispatch();

  return useCallback(
    (stepped: number) => {
      const normalized = stepped / 10;
      dispatch(setVolume(normalized));
      dispatch(setIsMuted(stepped === 0));
      wavesurfer.current?.setVolume(normalized);
    },
    [dispatch, wavesurfer],
  );
};
