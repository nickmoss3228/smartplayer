import { useCallback, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { useAppDispatch } from "../../../hooks/hooks";
import {
  setCurrentMarkerIndex,
  setIsPlaying,
  // setVolume,
  setIsMuted,
  setPlaybackRate,
} from "../../../store/playerslice";
import { SPEED_SEQUENCES } from "./constants";

interface UsePlayerControlsOptions {
  wavesurfer: React.MutableRefObject<WaveSurfer | null>;
  isInitialized: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackRateRef: React.MutableRefObject<number>;
  currentMarkerIndexRef: React.MutableRefObject<number>;
  repeatCountRef: React.MutableRefObject<number>;
  timeMarkersRef: React.MutableRefObject<any[]>;
  currentRepeatRef: React.MutableRefObject<number>;
  isSegmentTransitioningRef: React.MutableRefObject<boolean>;
  getSegmentBounds: (index: number) => { start: number; end: number };
  repeatCount: number;
  setRepeatCount: (count: number) => void;
  setIsControlledMode: React.Dispatch<React.SetStateAction<boolean>>;
  isControlledMode: boolean;
  isEnhancedModeRef: React.MutableRefObject<boolean>;  // ← add
  userPlaybackRateRef: React.MutableRefObject<number>;
  onEnhancedSessionChange?: (active: boolean) => void; 
}

export const usePlayerControls = ({
  wavesurfer,
  isInitialized,
  isPlaying,
  isMuted,
  volume,
  playbackRateRef,
  currentMarkerIndexRef,
  repeatCountRef,
  timeMarkersRef,
  currentRepeatRef,
  isSegmentTransitioningRef,
  getSegmentBounds,
  isEnhancedModeRef,
  userPlaybackRateRef,
  // repeatCount,
  setRepeatCount,
  setIsControlledMode,
  onEnhancedSessionChange,
  // isControlledMode,
}: UsePlayerControlsOptions) => {
  const dispatch = useAppDispatch();

  const applySpeed = useCallback(
    (rate: number) => {
      dispatch(setPlaybackRate(rate));
      playbackRateRef.current = rate;
      wavesurfer.current?.setPlaybackRate(rate);
    },
    [dispatch, playbackRateRef, wavesurfer],
  );

  const applySequenceStartSpeed = useCallback(() => {
  if (isEnhancedModeRef.current) {
    const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [1.0];
    applySpeed(seq[0] ?? 1.0);
  } else {
    applySpeed(userPlaybackRateRef.current);
  }
}, [applySpeed, isEnhancedModeRef, repeatCountRef, userPlaybackRateRef]);

  const handlePlayPause = useCallback(() => {
    if (!wavesurfer.current || !isInitialized) return;

    try {
      if (isPlaying) {
        onEnhancedSessionChange?.(false);
        wavesurfer.current.pause();
      } else {
        if (timeMarkersRef.current?.length) {
          const current = wavesurfer.current.getCurrentTime();
          const { start, end } = getSegmentBounds(currentMarkerIndexRef.current);
          if (current < start || current >= end - 0.05) {
            wavesurfer.current.setTime(start);
          }
        }
        isSegmentTransitioningRef.current = false;
        currentRepeatRef.current = 0;

        applySequenceStartSpeed();
        onEnhancedSessionChange?.(!!isEnhancedModeRef.current); // ← session starts
        wavesurfer.current.play();
      }
    } catch (error) {
      console.error("Playback error:", error);
      dispatch(setIsPlaying(false));
      onEnhancedSessionChange?.(false);            // ← rollback on error
    }
  }, [
    isPlaying,
    isInitialized,
    getSegmentBounds,
    applySequenceStartSpeed,
    dispatch,
    timeMarkersRef,
    currentMarkerIndexRef,
    repeatCountRef,
    currentRepeatRef,
    isSegmentTransitioningRef,
    wavesurfer,
    onEnhancedSessionChange,
  ]);

  const goToNextSentence = useCallback(() => {
  if (
    !timeMarkersRef.current?.length ||
    currentMarkerIndexRef.current >= timeMarkersRef.current.length - 1 ||
    !wavesurfer.current
  ) return;

  const nextIdx = currentMarkerIndexRef.current + 1;
  const nextMarker = timeMarkersRef.current[nextIdx];
  const nextTime = typeof nextMarker === "object" ? nextMarker.time : nextMarker;

  currentRepeatRef.current = 0;
  isSegmentTransitioningRef.current = false;

  applySequenceStartSpeed();
  onEnhancedSessionChange?.(true);// (keyboard ArrowRight keeps session alive)
  dispatch(setCurrentMarkerIndex(nextIdx));
  wavesurfer.current.setTime(nextTime);
  wavesurfer.current.play();
}, [
  applySequenceStartSpeed,
  dispatch,
  timeMarkersRef,
  currentMarkerIndexRef,
  repeatCountRef,
  currentRepeatRef,
  isSegmentTransitioningRef,
  isEnhancedModeRef, 
  wavesurfer,
  onEnhancedSessionChange,
  ]);
  
  
  const replayCurrentSentence = useCallback(() => {
  if (!timeMarkersRef.current?.length || !wavesurfer.current) return;

  const { start } = getSegmentBounds(currentMarkerIndexRef.current);
  currentRepeatRef.current = 0;
  isSegmentTransitioningRef.current = false;

    applySequenceStartSpeed();
    onEnhancedSessionChange?.(true);
  wavesurfer.current.setTime(start);
  setTimeout(() => wavesurfer.current?.play(), 10);
}, [
  getSegmentBounds,
  applySequenceStartSpeed,
  timeMarkersRef,
  currentMarkerIndexRef,
  repeatCountRef,
  currentRepeatRef,
  isSegmentTransitioningRef,
  isEnhancedModeRef,  // ← add to deps
    wavesurfer,
  onEnhancedSessionChange,
]);

  const handleMuteToggle = useCallback(() => {
    const newMuted = !isMuted;
    dispatch(setIsMuted(newMuted));
    wavesurfer.current?.setVolume(newMuted ? 0 : volume);
  }, [isMuted, volume, dispatch, wavesurfer]);

 const changePlaybackRate = useCallback(
  (rate: number) => {
    // Allowed in BOTH modes now — Enhanced uses sequence only during repeats
    userPlaybackRateRef.current = rate;
    applySpeed(rate);
    currentRepeatRef.current = 0;
    isSegmentTransitioningRef.current = false;
  },
  [applySpeed, currentRepeatRef, isSegmentTransitioningRef, userPlaybackRateRef],
);

  const handleSetRepeatCount = useCallback(
    (count: number) => {
      setRepeatCount(count);
      currentRepeatRef.current = 0;
      isSegmentTransitioningRef.current = false;

       applySequenceStartSpeed();
    },
    [applySequenceStartSpeed, setRepeatCount, currentRepeatRef, isSegmentTransitioningRef, wavesurfer],
  );

  const toggleControlledMode = useCallback(() => {
    setIsControlledMode((prev) => !prev);
  }, [setIsControlledMode]);

  const handleMarkerClick = useCallback(
    async (time: number) => {
      if (!wavesurfer.current) return;

      try {
        const markers = timeMarkersRef.current;
        const dur = wavesurfer.current.getDuration();

        const markerIndex = markers.findIndex((marker, index) => {
          const markerTime = typeof marker === "object" ? marker.time : marker;
          const nextMarker = markers[index + 1];
          const nextTime = nextMarker
            ? typeof nextMarker === "object"
              ? nextMarker.time
              : nextMarker
            : dur;
          return time >= markerTime && time < nextTime;
        });

        if (markerIndex >= 0) dispatch(setCurrentMarkerIndex(markerIndex));

        currentRepeatRef.current = 0;
        isSegmentTransitioningRef.current = false;

       applySequenceStartSpeed();

        wavesurfer.current.seekTo(time / dur);
        await new Promise((r) => setTimeout(r, 50));
        await wavesurfer.current.play();
        dispatch(setIsPlaying(true));
      } catch (error) {
        console.error("handleMarkerClick error:", error);
        dispatch(setIsPlaying(false));
        onEnhancedSessionChange?.(false);
      }
    },
    [
      applySequenceStartSpeed,
      dispatch,
      timeMarkersRef,
      repeatCountRef,
      currentRepeatRef,
      isSegmentTransitioningRef,
      wavesurfer,
      onEnhancedSessionChange,
    ],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.code) {
        case "Space":
          e.preventDefault();
          handlePlayPause();
          break;
        case "ArrowRight":
          goToNextSentence();
          break;
        case "KeyR":
          replayCurrentSentence();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handlePlayPause, goToNextSentence, replayCurrentSentence]);

  return {
    applySpeed,
    handlePlayPause,
    goToNextSentence,
    replayCurrentSentence,
    handleMuteToggle,
    changePlaybackRate,
    handleSetRepeatCount,
    toggleControlledMode,
    handleMarkerClick,
  };
};