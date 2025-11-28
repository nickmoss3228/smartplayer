import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from './hooks';
import { setIsPlaying, setCurrentMarkerIndex, setIsPlayMode } from '../store/playerslice';
import WaveSurfer from 'wavesurfer.js';

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
    
  const getCurrentSegmentBounds = useCallback(() => {
    if (!timeMarkers?.length || currentMarkerIndex < 0) {
      return { start: 0, end: durationSeconds || Infinity };
    }
    const currentMarker = timeMarkers[currentMarkerIndex];
    const nextMarker = timeMarkers[currentMarkerIndex + 1];

    const start = typeof currentMarker === "object" ? currentMarker.time : currentMarker;
    const end = nextMarker
      ? typeof nextMarker === "object" ? nextMarker.time : nextMarker
      : durationSeconds || Infinity;

    return { start, end };
  }, [timeMarkers, currentMarkerIndex, durationSeconds]);

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
    const nextMarker = timeMarkers[nextIndex];
    const nextTime = typeof nextMarker === "object" ? nextMarker.time : nextMarker;

    dispatch(setCurrentMarkerIndex(nextIndex));
    wavesurfer.setTime(nextTime);
    wavesurfer.play();
  }, [isPlayMode, timeMarkers, currentMarkerIndex, wavesurfer, dispatch]);

  const replayCurrentSentence = useCallback(() => {
    if (!timeMarkers?.length || !wavesurfer || !isPlayMode) return;

    const markerIndex = Math.max(0, currentMarkerIndex);
    const currentMarker = timeMarkers[markerIndex];
    const start = typeof currentMarker === "object" ? currentMarker.time : currentMarker;

    wavesurfer.setTime(start);
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
      const currentTime = wavesurfer.getCurrentTime();
      let markerIndex = 0;
      
      for (let i = 0; i < timeMarkers.length; i++) {
        const markerTime = (typeof timeMarkers[i] === "object" 
          ? (timeMarkers[i] as { time: number }).time 
          : timeMarkers[i]) as number;
        if (currentTime >= markerTime) {
          markerIndex = i;
        } else {
          break;
        }
      }

      dispatch(setCurrentMarkerIndex(markerIndex));
      const marker = timeMarkers[markerIndex];
      const markerTime = typeof marker === "object" ? marker.time : marker;
      wavesurfer.setTime(markerTime);
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