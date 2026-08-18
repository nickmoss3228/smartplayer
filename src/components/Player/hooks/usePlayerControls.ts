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

  // Apply the playback speed to the player and update the state accordingly
  const applySpeed = useCallback(
    (rate: number) => {
      dispatch(setPlaybackRate(rate));
      playbackRateRef.current = rate;
      wavesurfer.current?.setPlaybackRate(rate);
    },
    [dispatch, playbackRateRef, wavesurfer],
  );
  
  // Apply the starting speed of the sequence when playback starts or when the repeat count changes.
  const applySequenceStartSpeed = useCallback(() => {
  if (isEnhancedModeRef.current) {
    const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [1.0];
    applySpeed(seq[0] ?? 1.0);
  } else {
    applySpeed(userPlaybackRateRef.current);
  }
  }, [applySpeed, isEnhancedModeRef, repeatCountRef, userPlaybackRateRef]);
  
 // Handle play/pause functionality
  const handlePlayPause = useCallback(() => {
    if (!wavesurfer.current || !isInitialized) return;

    try {
      // If currently playing, pause the playback and notify that the enhanced session has ended.
      if (isPlaying) {
        onEnhancedSessionChange?.(false);
        wavesurfer.current.pause();
      } else {
        // If not currently playing, check if there are time markers defined. 
        // If so, ensure that the playback starts at the beginning of the current segment.
        //  If the current time is outside the bounds of the current segment, reset it to the start of the segment.
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

  // Calculate the index of the next sentence and its corresponding time
  const nextIdx = currentMarkerIndexRef.current + 1;
  const nextMarker = timeMarkersRef.current[nextIdx];
  const nextTime = typeof nextMarker === "object" ? nextMarker.time : nextMarker;

  currentRepeatRef.current = 0;
  isSegmentTransitioningRef.current = false;

  // Apply the starting speed of the sequence
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
  
  //  Replay the current sentence from the beginning
  const replayCurrentSentence = useCallback(() => {
  if (!timeMarkersRef.current?.length || !wavesurfer.current) return;

  // Get the start time of the current segment and reset the repeat count and transition state
  const { start } = getSegmentBounds(currentMarkerIndexRef.current);
  currentRepeatRef.current = 0;
  isSegmentTransitioningRef.current = false;
  applySequenceStartSpeed();
  onEnhancedSessionChange?.(true);
  wavesurfer.current.setTime(start);

    // After a short delay, resume playback to ensure the seek operation has completed
  setTimeout(() => wavesurfer.current?.play(), 10);
}, [
  getSegmentBounds,
  applySequenceStartSpeed,
  timeMarkersRef,
  currentMarkerIndexRef,
  repeatCountRef,
  currentRepeatRef,
  isSegmentTransitioningRef,
  isEnhancedModeRef,
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

  // Handle clicking on a time marker to jump to that segment and start playback
  const handleMarkerClick = useCallback(
    async (time: number) => {
      if (!wavesurfer.current) return;

      // Guard against the case where the component is unmounted or the player is no longer in enhanced mode while waiting for the timeout to fire.
      try {
        const markers = timeMarkersRef.current;
        const dur = wavesurfer.current.getDuration();

        // Find the index of the marker that corresponds to the clicked time. 
        // This is done by checking if the clicked time falls within the range of any marker and its subsequent marker 
        // (or the end of the audio if it's the last marker).
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

        // If a valid marker index is found, update the current marker index in the store.
        if (markerIndex >= 0) dispatch(setCurrentMarkerIndex(markerIndex));

        currentRepeatRef.current = 0;
        isSegmentTransitioningRef.current = false;

       applySequenceStartSpeed();

        // Seek to the clicked time and start playback after a short delay to ensure the seek operation has completed.
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