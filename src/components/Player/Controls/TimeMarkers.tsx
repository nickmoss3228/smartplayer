import React  from "react";
import { TimeMarker } from "../../../types";

interface TimeMarkersProps {
  timeMarkers: TimeMarker[];
  durationSeconds: number;
  onMarkerClick: (time: number) => void;
}

export const TimeMarkers: React.FC<TimeMarkersProps> = React.memo(
  ({ timeMarkers, durationSeconds, onMarkerClick }) => {
    if (durationSeconds === 0) return null;

    return (
      <div className="absolute top-0 left-0 right-0 h-full bottom-0">
        {timeMarkers.map((marker, index) => {
          const position = (marker.time / durationSeconds) * 100;
          return (
            <div
              key={index}
              className="absolute top-0 bottom-0 w-1 md:w-[0.5px] cursor-pointer transition-opacity duration-300 z-10 hover:opacity-80"
              style={{ left: `${position}%`, backgroundColor: marker.color || "red" }}
              onClick={() => onMarkerClick(marker.time)}
              title={`Jump to ${marker.label}`}
            >
              {/* <span onClick={() => onMarkerClick(marker.time)} className="absolute top-1 left-1/2 -translate-x-1/2 bg-black/75 text-white px-1.5 py-0.5 md:px-[6px] md:py-0.5 rounded text-[11px] md:text-[11px] whitespace-nowrap">
                {marker.label}
              </span> */}
            </div>
          );
        })}
      </div>
    );
  },
);

TimeMarkers.displayName = "TimeMarkers";

// import React, { useCallback } from 'react';
// import { TimeMarkersContainer, TimeMarkerLine, TimeMarkerLabel } from '../../../styledComponents';
// import { useAppDispatch, useAppSelector } from '../../../hooks/hooks';
// import { setCurrentMarkerIndex, setIsPlaying } from '../../../store/playerslice';
// import WaveSurfer from 'wavesurfer.js';

// interface TimeMarkersProps {
//   timeMarkers: Array<{ time: number; label: string; color?: string }>;
//   durationSeconds: number;
//   wavesurfer: WaveSurfer | null;
// }

// export const TimeMarkers: React.FC<TimeMarkersProps> = React.memo(({ 
//   timeMarkers, 
//   durationSeconds, 
//   wavesurfer 
// }) => {
//   const dispatch = useAppDispatch();
//   const { isPlayMode } = useAppSelector((state) => state.player);

//   const handleMarkerClick = useCallback(async (time: number) => {
//     if (!wavesurfer) return;

//     try {
//       if (isPlayMode) {
//         const markerIndex = timeMarkers.findIndex((marker, index) => {
//           const markerTime = typeof marker === "object" ? marker.time : marker;
//           const nextMarker = timeMarkers[index + 1];
//           const nextTime = nextMarker
//             ? typeof nextMarker === "object" ? nextMarker.time : nextMarker
//             : durationSeconds;

//           return time >= markerTime && time < nextTime;
//         });

//         if (markerIndex >= 0) {
//           dispatch(setCurrentMarkerIndex(markerIndex));
//         }
//       }

//       wavesurfer.seekTo(time / durationSeconds);
//       await new Promise((resolve) => setTimeout(resolve, 50));
//       await wavesurfer.play();
//       dispatch(setIsPlaying(true));
//     } catch (error) {
//       console.error("Error in handleMarkerClick:", error);
//       dispatch(setIsPlaying(false));
//     }
//   }, [durationSeconds, dispatch, isPlayMode, timeMarkers, wavesurfer]);

//   if (durationSeconds === 0 || !timeMarkers.length) return null;

//   return (
//     <TimeMarkersContainer>
//       {timeMarkers.map((marker, index) => {
//         const position = (marker.time / durationSeconds) * 100;

//         return (
//           <TimeMarkerLine
//             key={index}
//             $position={position}
//             color={marker.color}
//             onClick={() => handleMarkerClick(marker.time)}
//             title={`Jump to ${marker.label}`}
//           >
//             <TimeMarkerLabel>{marker.label}</TimeMarkerLabel>
//           </TimeMarkerLine>
//         );
//       })}
//     </TimeMarkersContainer>
//   );
// });

// TimeMarkers.displayName = 'TimeMarkers';