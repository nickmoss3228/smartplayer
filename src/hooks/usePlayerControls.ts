import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from './hooks';
import { setIsPlaying, setCurrentMarkerIndex, setIsPlayMode } from '../store/playerslice';
import WaveSurfer from 'wavesurfer.js';
import { computeSegmentBounds, markerTime, findMarkerIndexAt } from '../lib/segmentBounds';

export const usePlayerControls = (wavesurfer: WaveSurfer | null, isInitialized: boolean) => {
  const dispatch = useAppDispatch();
  const { 
    isPlaying, 
    isPlayMode, 
    currentMarkerIndex, 
    timeMarkers, 
    durationSeconds 
  } = useAppSelector((state) => state.player);

// When we are listening to the track, it is needed to count the time of the track
// in real-time. So whatever the marker is, we always can replay the audio
// within bounds. And also to traverse the markers.
    
  const getCurrentSegmentBounds = useCallback(
    () => computeSegmentBounds(timeMarkers, currentMarkerIndex, durationSeconds),
    [timeMarkers, currentMarkerIndex, durationSeconds],
  );

  const handlePlayPause = useCallback(() => {
    if (!wavesurfer || !isInitialized) return;

    try {
      if (isPlaying) {
        wavesurfer.pause();
      } else {
        if (isPlayMode) {
          const currentTime = wavesurfer.getCurrentTime();
          const { start, end } = getCurrentSegmentBounds();

          if (currentTime < start || currentTime >= end - 0.05) {
            wavesurfer.setTime(start);
          }
        }
        wavesurfer.play();
      }
    } catch (error) {
      console.error("Playback error:", error);
      dispatch(setIsPlaying(false));
    }
  }, [isPlaying, isInitialized, isPlayMode, getCurrentSegmentBounds, wavesurfer, dispatch]);

  const goToNextSentence = useCallback(() => {
    if (!timeMarkers?.length || currentMarkerIndex >= timeMarkers.length - 1 || !wavesurfer || !isPlayMode) {
      return;
    }

    const nextIndex = currentMarkerIndex + 1;

    dispatch(setCurrentMarkerIndex(nextIndex));
    wavesurfer.setTime(markerTime(timeMarkers[nextIndex]));
    wavesurfer.play();
  }, [isPlayMode, timeMarkers, currentMarkerIndex, wavesurfer, dispatch]);

  const replayCurrentSentence = useCallback(() => {
    if (!timeMarkers?.length || !wavesurfer || !isPlayMode) return;

    const markerIndex = Math.max(0, currentMarkerIndex);

    wavesurfer.setTime(markerTime(timeMarkers[markerIndex]));
    setTimeout(() => {
      wavesurfer?.play();
    }, 10);
  }, [isPlayMode, timeMarkers, currentMarkerIndex, wavesurfer]);

  const togglePlayMode = useCallback(() => {
    const wasPlaying = isPlaying;
    
    if (wasPlaying) {
      wavesurfer?.pause();
    }

    const newPlayMode = !isPlayMode;
    dispatch(setIsPlayMode(newPlayMode));

    if (newPlayMode && timeMarkers?.length && wavesurfer) {
      const markerIndex = findMarkerIndexAt(timeMarkers, wavesurfer.getCurrentTime());

      dispatch(setCurrentMarkerIndex(markerIndex));
      wavesurfer.setTime(markerTime(timeMarkers[markerIndex]));
    }
  }, [isPlaying, isPlayMode, timeMarkers, wavesurfer, dispatch]);

  return {
    handlePlayPause,
    goToNextSentence,
    replayCurrentSentence,
    togglePlayMode,
    getCurrentSegmentBounds
  };
};