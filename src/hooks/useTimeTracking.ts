import { useEffect, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "./hooks";
import {
  setCurrentTime,
  setActiveSubtitle,
  setCurrentMarkerIndex,
} from "../store/playerslice";
import WaveSurfer from "wavesurfer.js";

export const useTimeTracking = (
  wavesurfer: WaveSurfer | null,
  isInitialized: boolean,
  getCurrentSegmentBounds: () => { start: number; end: number }
) => {
  const dispatch = useAppDispatch();
  const {
    isPlaying,
    subtitles,
    timeMarkers,
    isPlayMode,
    currentMarkerIndex,
    // durationSeconds,
  } = useAppSelector((state) => state.player);

  const updateActiveSubtitle = useCallback(
    (currentTimeValue: number) => {
      if (!subtitles?.length) {
        dispatch(setActiveSubtitle(""));
        return;
      }

      const currentSubtitle = subtitles.find(
        (sub) =>
          currentTimeValue >= sub.startTime && currentTimeValue <= sub.endTime
      );
      dispatch(setActiveSubtitle(currentSubtitle ? currentSubtitle.text : ""));
    },
    [subtitles, dispatch]
  );

  const updateCurrentMarkerIndex = useCallback(
    (currentTimeValue: number) => {
      if (!timeMarkers?.length) return;

      for (let i = timeMarkers.length - 1; i >= 0; i--) {
        const marker = timeMarkers[i];
        const currentMarkerTime = typeof marker === "object" ? marker.time : marker;
        
        if (currentTimeValue >= currentMarkerTime) {
          if (currentMarkerIndex !== i) {
            dispatch(setCurrentMarkerIndex(i));
          }
          return;
        }
      }
      
      if (currentMarkerIndex !== -1) {
        dispatch(setCurrentMarkerIndex(-1));
      }
    },
    [timeMarkers, currentMarkerIndex, dispatch]
  );
  
  useEffect(() => {
    if (!wavesurfer || !isInitialized) return;

    let animationFrame: number;
    let isActive = true; // Flag to prevent updates after cleanup

    const updateProgress = () => {
      if (!wavesurfer || !isActive) return;

      const currentTimeValue = wavesurfer.getCurrentTime();
      dispatch(setCurrentTime(formatTime(currentTimeValue)));
      updateActiveSubtitle(currentTimeValue);
      updateCurrentMarkerIndex(currentTimeValue);

      // Handle play mode bounds checking
      if (isPlayMode && timeMarkers?.length) {
        const bounds = getCurrentSegmentBounds();
        
        if (currentTimeValue >= bounds.end - 0.02) {
          wavesurfer.pause();
          return; // Don't schedule next frame
        }
      }

      // Schedule next update if still playing
      if (isPlaying && isActive) {
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };

    // Start the animation loop if playing
    if (isPlaying) {
      updateProgress();
    } else {
      // Update once even when paused to ensure current state is reflected
      const currentTimeValue = wavesurfer.getCurrentTime();
      dispatch(setCurrentTime(formatTime(currentTimeValue)));
      updateActiveSubtitle(currentTimeValue);
      updateCurrentMarkerIndex(currentTimeValue);
    }

    return () => {
      isActive = false;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [
    wavesurfer,
    isPlaying,
    isInitialized,
    isPlayMode,
    timeMarkers,
    getCurrentSegmentBounds,
    updateActiveSubtitle,
    updateCurrentMarkerIndex,
    dispatch,
  ]);
};

const formatTime = (time: number) => {
  if (!isFinite(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};