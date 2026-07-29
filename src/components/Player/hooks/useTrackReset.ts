import { useEffect, useRef } from "react";
import { useAppDispatch } from "../../../hooks/hooks";
import {
  setCurrentMarkerIndex,
  setIsPlaying,
  setCurrentTime,
  setDurationSeconds,
  setDuration,
  setActiveSubtitle,
} from "../../../store/playerslice";

// Resets playback + Redux state whenever the track (audioUrl) actually changes.
export const useTrackReset = (
  audioUrl: string,
  onReset?: (active: boolean) => void,
) => {
  const dispatch = useAppDispatch();
  const previousAudioUrl = useRef<string | null>(null);

  useEffect(() => {
    if (previousAudioUrl.current !== audioUrl) {
      dispatch(setCurrentMarkerIndex(0));
      dispatch(setIsPlaying(false));
      dispatch(setCurrentTime("0:00"));
      dispatch(setDuration("0:00"));
      dispatch(setDurationSeconds(0));
      dispatch(setActiveSubtitle(""));
      onReset?.(false);
      previousAudioUrl.current = audioUrl;
    }
  }, [audioUrl, dispatch, onReset]);
};
