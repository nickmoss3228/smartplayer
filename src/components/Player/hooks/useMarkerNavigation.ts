import { TimeMarker } from "../../../types";

// Prev/Next segment nav — built on top of the existing handleMarkerClick (expects seconds).
export const useMarkerNavigation = (
  currentMarkerIndex: number,
  timeMarkers: TimeMarker[],
  onMarkerClick: (time: number) => void,
) => {
  const canGoPrev = currentMarkerIndex > 0;
  const canGoNext = currentMarkerIndex < timeMarkers.length - 1;

  const getMarkerTime = (idx: number): number => {
    const m = timeMarkers[idx];
    return typeof m === "object" ? m.time : (m as unknown as number);
  };

  const handlePrevMarker = () => {
    if (canGoPrev) onMarkerClick(getMarkerTime(currentMarkerIndex - 1));
  };
  const handleNextMarker = () => {
    if (canGoNext) onMarkerClick(getMarkerTime(currentMarkerIndex + 1));
  };

  return { canGoPrev, canGoNext, handlePrevMarker, handleNextMarker };
};
