import React  from "react";
import { useTranslation } from "react-i18next";
import { TimeMarker } from "../../../types";

interface TimeMarkersProps {
  timeMarkers: TimeMarker[];
  durationSeconds: number;
  onMarkerClick: (time: number) => void;
  /** Phrase being drilled (phrase-by-phrase mode); shaded on the waveform. */
  activeIndex?: number | null;
}

/**
 * The phrase boundaries over the desktop waveform (phones draw their own dots
 * in MobileProgressBar). The stored marker colour is ignored: red lines on
 * the level gradient were the loudest thing on the screen. Each line sits in
 * a 9 px hit area, because the line itself is too thin to click.
 *
 * Positioned against an inset matching the waveform container's horizontal
 * padding, so a marker lines up with the bar it belongs to.
 */
export const TimeMarkers: React.FC<TimeMarkersProps> = React.memo(
  ({ timeMarkers, durationSeconds, onMarkerClick, activeIndex = null }) => {
    const { t } = useTranslation();
    if (durationSeconds === 0) return null;

    const pct = (time: number) => `${(time / durationSeconds) * 100}%`;
    const active = activeIndex != null ? timeMarkers[activeIndex] : undefined;
    const activeEnd = activeIndex != null ? (timeMarkers[activeIndex + 1]?.time ?? durationSeconds) : 0;

    return (
      <div className="absolute inset-y-0 left-2 right-2">
        {active && (
          <div
            className="pointer-events-none absolute inset-y-0 bg-white/15"
            style={{ left: pct(active.time), width: `${((activeEnd - active.time) / durationSeconds) * 100}%` }}
          />
        )}
        {timeMarkers.map((marker, index) => (
          <button
            key={index}
            type="button"
            className="group/mk absolute inset-y-1.5 z-10 w-[9px] -translate-x-1/2 cursor-pointer"
            style={{ left: pct(marker.time) }}
            onClick={() => onMarkerClick(marker.time)}
            aria-label={t("controls.jumpToPhrase", { n: index + 1 })}
          >
            <span className="mx-auto block h-full w-[1.5px] rounded-full bg-black/35 transition-colors group-hover/mk:bg-white" />
          </button>
        ))}
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