import { useEffect, useRef, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { useAppDispatch } from "../../../hooks/hooks";
import {
  setCurrentMarkerIndex,
  setIsPlaying,
  setPlaybackRate,
  setCurrentTime,
  // setActiveSubtitle,
} from "../../../store/playerslice";
import { SPEED_SEQUENCES, formatTime } from "./constants";
import { Subtitle, TimeMarker } from "../../../types";

interface UseSegmentEngineOptions {
  wavesurfer: React.MutableRefObject<WaveSurfer | null>;
  isInitialized: boolean;
  isPlaying: boolean;
  subtitles: Subtitle[] | undefined;
  timeMarkers: TimeMarker[];
  durationSeconds: number;
  currentMarkerIndex: number;
  repeatCount: number;
  isControlledMode: boolean;
  playbackRateRef: React.MutableRefObject<number>;
  isEnhancedMode: boolean; 
  onAudioComplete: (() => void) | undefined;
  userPlaybackRateRef: React.MutableRefObject<number>;
}

export const useSegmentEngine = ({
  wavesurfer,
  isInitialized,
  isPlaying,
  // subtitles,
  timeMarkers,
  durationSeconds,
  currentMarkerIndex,
  repeatCount,
  isControlledMode,
  playbackRateRef,
  onAudioComplete,
  isEnhancedMode,
  userPlaybackRateRef,
}: UseSegmentEngineOptions) => {
  const dispatch = useAppDispatch();

  const isPlayingRef = useRef(isPlaying);
  const currentMarkerIndexRef = useRef(currentMarkerIndex);
  const repeatCountRef = useRef(repeatCount);
  const isControlledModeRef = useRef(isControlledMode);
  const durationSecondsRef = useRef(durationSeconds);
  const timeMarkersRef = useRef(timeMarkers);
  const onAudioCompleteRef = useRef(onAudioComplete);
  const currentRepeatRef = useRef(0);
  const isSegmentTransitioningRef = useRef(false);
  const pausedByVisibilityRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const isEnhancedModeRef = useRef(isEnhancedMode);
  useEffect(() => {
    isEnhancedModeRef.current = isEnhancedMode;
  }, [isEnhancedMode]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    currentMarkerIndexRef.current = currentMarkerIndex;
  }, [currentMarkerIndex]);
  useEffect(() => {
    repeatCountRef.current = repeatCount;
  }, [repeatCount]);
  useEffect(() => {
    isControlledModeRef.current = isControlledMode;
  }, [isControlledMode]);
  useEffect(() => {
    durationSecondsRef.current = durationSeconds;
  }, [durationSeconds]);
  useEffect(() => {
    timeMarkersRef.current = timeMarkers;
  }, [timeMarkers]);
  useEffect(() => {
    onAudioCompleteRef.current = onAudioComplete;
  }, [onAudioComplete]);

  const getSegmentBounds = useCallback(
    (markerIndex: number): { start: number; end: number } => {
      const markers = timeMarkersRef.current;
      const dur = durationSecondsRef.current;

      if (!markers?.length || markerIndex < 0) {
        return { start: 0, end: dur || Infinity };
      }

      const currentMarker = markers[markerIndex];
      const nextMarker = markers[markerIndex + 1];

      const start =
        typeof currentMarker === "object" ? currentMarker.time : currentMarker;
      const end = nextMarker
        ? typeof nextMarker === "object"
          ? nextMarker.time
          : nextMarker
        : dur || Infinity;

      return { start, end };
    },
    [],
  );

  useEffect(() => {
    if (!isInitialized) return;

    const instance = wavesurfer.current;
    if (!instance) return;

    let isCancelled = false;

    const tick = () => {
      if (isCancelled) return;

      if (isPlayingRef.current && instance) {
        const now = instance.getCurrentTime();
        dispatch(setCurrentTime(formatTime(now)));
        // updateActiveSubtitle(now);

        if (
          isEnhancedModeRef.current && // guard
          timeMarkersRef.current?.length &&
          !isSegmentTransitioningRef.current
        ) {
          const idx = currentMarkerIndexRef.current;
          const { end } = getSegmentBounds(idx);

          if (now >= end - 0.05) {
            isSegmentTransitioningRef.current = true;
            instance.pause();

            currentRepeatRef.current += 1;

            if (currentRepeatRef.current < repeatCountRef.current) {
              const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [1.0];
              const nextSpeed = seq[currentRepeatRef.current] ?? 1.0;

              dispatch(setPlaybackRate(nextSpeed));
              playbackRateRef.current = nextSpeed;

              setTimeout(() => {
                if (
                  isCancelled ||
                  !wavesurfer.current ||
                  !isEnhancedModeRef.current
                )
                  return;
                wavesurfer.current.setPlaybackRate(nextSpeed);
                const { start } = getSegmentBounds(
                  currentMarkerIndexRef.current,
                );
                wavesurfer.current.setTime(start);
                setTimeout(() => {
                  if (
                    isCancelled ||
                    !wavesurfer.current ||
                    !isEnhancedModeRef.current
                  )
                    return;
                  isSegmentTransitioningRef.current = false;
                  isPlayingRef.current = true;
                  wavesurfer.current.play();
                }, 50);
              }, 1000);
            } else {
              currentRepeatRef.current = 0;
              const restoreRate = userPlaybackRateRef.current ?? 1.0;
              dispatch(setPlaybackRate(restoreRate));
              playbackRateRef.current = restoreRate;

              const nextIdx = idx + 1;
              const markers = timeMarkersRef.current;

              if (nextIdx < markers.length) {
                if (isControlledModeRef.current) {
                  const nextMarker = markers[nextIdx];
                  const nextTime =
                    typeof nextMarker === "object"
                      ? nextMarker.time
                      : nextMarker;

                  setTimeout(() => {
                    if (isCancelled || !wavesurfer.current) return;
                    if (!isEnhancedModeRef.current) {
                      // mode flipped while waiting
                      isSegmentTransitioningRef.current = false; // unblock the engine; don't stop
                      return;
                    }
                    dispatch(setCurrentMarkerIndex(nextIdx));
                    wavesurfer.current.setTime(nextTime);
                    isSegmentTransitioningRef.current = false;
                    isPlayingRef.current = false;
                    dispatch(setIsPlaying(false));
                  }, 200);
                } else {
                  const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [1.0];
                  const firstSpeed = seq[0] ?? 1.0;

                  dispatch(setPlaybackRate(firstSpeed));
                  playbackRateRef.current = firstSpeed;

                  setTimeout(() => {
                    if (
                      isCancelled ||
                      !wavesurfer.current ||
                      !isEnhancedModeRef.current
                    )
                      return;
                    const nextMarker = markers[nextIdx];
                    const nextTime =
                      typeof nextMarker === "object"
                        ? nextMarker.time
                        : nextMarker;

                    dispatch(setCurrentMarkerIndex(nextIdx));
                    wavesurfer.current.setTime(nextTime);
                    wavesurfer.current.setPlaybackRate(firstSpeed);

                    setTimeout(() => {
                      if (
                        isCancelled ||
                        !wavesurfer.current ||
                        !isEnhancedModeRef.current
                      )
                        return;
                      isSegmentTransitioningRef.current = false;
                      isPlayingRef.current = true;
                      wavesurfer.current.play();
                    }, 50);
                  }, 1000);
                }
              } else {
                isSegmentTransitioningRef.current = false;
                isPlayingRef.current = false;
                dispatch(setIsPlaying(false));
                onAudioCompleteRef.current?.();
              }
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      isCancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isInitialized, getSegmentBounds, dispatch]);

  useEffect(() => {
  if (isEnhancedMode) return;
  isSegmentTransitioningRef.current = false;
  currentRepeatRef.current = 0;

  const rate = userPlaybackRateRef.current ?? 1.0;
  dispatch(setPlaybackRate(rate));
  playbackRateRef.current = rate;
  wavesurfer.current?.setPlaybackRate(rate);

  if (isPlayingRef.current && wavesurfer.current && !wavesurfer.current.isPlaying()) {
    wavesurfer.current.play();
  }
}, [isEnhancedMode, dispatch, userPlaybackRateRef]);

  useEffect(() => {
    if (!isInitialized) return;

    const handleVisibilityChange = () => {
      const ws = wavesurfer.current;
      if (!ws) return;

      // Free Play has no segment boundaries to enforce — let it keep playing
      if (!isEnhancedModeRef.current) return;

      if (document.hidden) {
        // ── Tab is being hidden ──────────────────────────────────────────
        // 1. Abort any in-flight segment transition so pending setTimeouts
        //    don't fire .play() or seek while we're hidden
        isSegmentTransitioningRef.current = false;
        currentRepeatRef.current = 0;

        // 2. Reset speed to first in sequence (matches the reset repeat counter)
        const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [1.0];
        const firstSpeed = seq[0] ?? 1.0;
        dispatch(setPlaybackRate(firstSpeed));
        playbackRateRef.current = firstSpeed;
        ws.setPlaybackRate(firstSpeed);

        // 3. Pause + snap to segment start only if actually playing
        if (isPlayingRef.current) {
          pausedByVisibilityRef.current = true;
          ws.pause(); // triggers WaveSurfer 'pause' event → setIsPlaying(false)

          // Snap to segment start so resume feels clean
          const { start } = getSegmentBounds(currentMarkerIndexRef.current);
          ws.setTime(start);
        }
      } else {
        // ── Tab is visible again ─────────────────────────────────────────
        if (pausedByVisibilityRef.current) {
          pausedByVisibilityRef.current = false;
          // Brief delay to let the browser restart RAF before we trigger play
          setTimeout(() => {
            wavesurfer.current?.play();
          }, 100);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isInitialized, getSegmentBounds, dispatch]);

  return {
    getSegmentBounds,
    currentRepeatRef,
    isSegmentTransitioningRef,
    currentMarkerIndexRef,
    repeatCountRef,
    timeMarkersRef,
    durationSecondsRef,
    isEnhancedModeRef,
  };
};




  // const updateActiveSubtitle = useCallback(
  //   (currentTimeValue: number) => {
  //     if (!subtitles?.length) {
  //       dispatch(setActiveSubtitle(""));
  //       return;
  //     }
  //     const currentSubtitle = subtitles.find(
  //       (sub) =>
  //         currentTimeValue >= sub.startTime &&
  //         currentTimeValue <= sub.endTime,
  //     );
  //     dispatch(setActiveSubtitle(currentSubtitle ? currentSubtitle.text : ""));
  //   },
  //   [subtitles, dispatch],
  // );