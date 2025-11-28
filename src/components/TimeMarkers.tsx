import React, { useCallback } from 'react';
import { TimeMarkersContainer, TimeMarkerLine, TimeMarkerLabel } from '../styledComponents';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { setCurrentMarkerIndex, setIsPlaying } from '../store/playerslice';
import WaveSurfer from 'wavesurfer.js';

interface TimeMarkersProps {
  timeMarkers: Array<{ time: number; label: string; color?: string }>;
  durationSeconds: number;
  wavesurfer: WaveSurfer | null;
}

export const TimeMarkers: React.FC<TimeMarkersProps> = React.memo(({ 
  timeMarkers, 
  durationSeconds, 
  wavesurfer 
}) => {
  const dispatch = useAppDispatch();
  const { isPlayMode } = useAppSelector((state) => state.player);

  const handleMarkerClick = useCallback(async (time: number) => {
    if (!wavesurfer) return;

    try {
      if (isPlayMode) {
        const markerIndex = timeMarkers.findIndex((marker, index) => {
          const markerTime = typeof marker === "object" ? marker.time : marker;
          const nextMarker = timeMarkers[index + 1];
          const nextTime = nextMarker
            ? typeof nextMarker === "object" ? nextMarker.time : nextMarker
            : durationSeconds;

          return time >= markerTime && time < nextTime;
        });

        if (markerIndex >= 0) {
          dispatch(setCurrentMarkerIndex(markerIndex));
        }
      }

      wavesurfer.seekTo(time / durationSeconds);
      await new Promise((resolve) => setTimeout(resolve, 50));
      await wavesurfer.play();
      dispatch(setIsPlaying(true));
    } catch (error) {
      console.error("Error in handleMarkerClick:", error);
      dispatch(setIsPlaying(false));
    }
  }, [durationSeconds, dispatch, isPlayMode, timeMarkers, wavesurfer]);

  if (durationSeconds === 0 || !timeMarkers.length) return null;

  return (
    <TimeMarkersContainer>
      {timeMarkers.map((marker, index) => {
        const position = (marker.time / durationSeconds) * 100;

        return (
          <TimeMarkerLine
            key={index}
            $position={position}
            color={marker.color}
            onClick={() => handleMarkerClick(marker.time)}
            title={`Jump to ${marker.label}`}
          >
            <TimeMarkerLabel>{marker.label}</TimeMarkerLabel>
          </TimeMarkerLine>
        );
      })}
    </TimeMarkersContainer>
  );
});

TimeMarkers.displayName = 'TimeMarkers';