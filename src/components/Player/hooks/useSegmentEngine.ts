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
import { computeSegmentBounds } from "../../../lib/segmentBounds";
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
  /** Fired once each time a segment finishes its full auto-repeat cycle, with
   *  the repeat-count setting (1/2/3) that was active during that cycle. */
  onSegmentRepeatComplete?: (repeatCount: number) => void;
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
  onSegmentRepeatComplete,
}: UseSegmentEngineOptions) => {
  const dispatch = useAppDispatch();

  const isPlayingRef = useRef(isPlaying);
  const currentMarkerIndexRef = useRef(currentMarkerIndex);
  const repeatCountRef = useRef(repeatCount);
  const isControlledModeRef = useRef(isControlledMode);
  const durationSecondsRef = useRef(durationSeconds);
  const timeMarkersRef = useRef(timeMarkers);
  const onAudioCompleteRef = useRef(onAudioComplete);
  const onSegmentRepeatCompleteRef = useRef(onSegmentRepeatComplete);
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
  useEffect(() => {
    onSegmentRepeatCompleteRef.current = onSegmentRepeatComplete;
  }, [onSegmentRepeatComplete]);

  const getSegmentBounds = useCallback(
    (markerIndex: number): { start: number; end: number } =>
      computeSegmentBounds(
        timeMarkersRef.current,
        markerIndex,
        durationSecondsRef.current,
      ),
    [],
  );

  useEffect(() => {
    // Guard against the case where the component is mounted but the WaveSurfer instance isn't ready yet. The RAF loop will start once the player is initialized.
    if (!isInitialized) return;

    // Guard against the case where the component is unmounted while the RAF loop is still running. The RAF loop will stop when the component is unmounted.
    const instance = wavesurfer.current;
    if (!instance) return;

    let isCancelled = false;

    // The RAF loop is responsible for updating the current time and checking if the current segment has finished playing. 
    // If the segment has finished, it will either repeat the segment or move to the next segment, depending on the repeat count and whether the player is in controlled mode.
    const tick = () => {
      if (isCancelled) return;

      // Update the current time and check if the current segment has finished playing
      if (isPlayingRef.current && instance) {
        const now = instance.getCurrentTime();
        dispatch(setCurrentTime(formatTime(now)));
        // updateActiveSubtitle(now);

        // Check if the current segment has finished playing
        if (
          isEnhancedModeRef.current && // guard
          // Only check for segment transitions if there are time markers and we're not already in the middle of a transition
          timeMarkersRef.current?.length &&
          !isSegmentTransitioningRef.current
        ) {
          // Get the current segment's end time and check if we've reached it (with a small buffer to account for timing inaccuracies)
          const idx = currentMarkerIndexRef.current;
          const { end } = getSegmentBounds(idx);

          // If we've reached the end of the segment, pause playback and either repeat the segment or move to the next segment, depending on the repeat count and whether we're in controlled mode
          if (now >= end - 0.05) {
            isSegmentTransitioningRef.current = true;
            instance.pause();

            // Increment the current repeat count. This is done before checking if we need to repeat the segment or move to the next one
            // so that we can correctly determine if we've reached the repeat limit.
            currentRepeatRef.current += 1;

            // If the current repeat count is less than the total repeat count, repeat the segment at the next speed in the sequence. 
            // Otherwise, move to the next segment or finish playback if there are no more segments.
            if (currentRepeatRef.current < repeatCountRef.current) {
              const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [1.0];
              const nextSpeed = seq[currentRepeatRef.current] ?? 1.0;

              // Update the playback rate in the store and the ref, then set a timeout to change the playback rate in WaveSurfer after a short delay. 
              dispatch(setPlaybackRate(nextSpeed));
              playbackRateRef.current = nextSpeed;

              // After a short delay, set the playback rate in WaveSurfer and seek to the start of the segment. 
              setTimeout(() => {
                // Guard against the case where the component is unmounted or the player is no longer in enhanced mode while waiting for the timeout to fire. 
                // If either of these conditions is true, we don't want to change the playback rate or seek to the start of the segment.
                if (
                  isCancelled ||
                  !wavesurfer.current ||
                  !isEnhancedModeRef.current
                )
                  return;
                //  Set the playback rate in WaveSurfer 
                wavesurfer.current.setPlaybackRate(nextSpeed);

                // Seek to the start of the segment. 
                const { start } = getSegmentBounds(
                  currentMarkerIndexRef.current,
                );
                wavesurfer.current.setTime(start);

                // After another short delay, resume playback. 
                // Second setTimeout is to allow the seek to fully propagate before resuming playback, which can help prevent audio glitches or stuttering.
                setTimeout(() => {
                  if (
                    isCancelled ||
                    !wavesurfer.current ||
                    !isEnhancedModeRef.current
                  )
                    return;
                  // Unblock the engine and resume playback at the next speed in the sequence
                  isSegmentTransitioningRef.current = false;
                  isPlayingRef.current = true;
                  wavesurfer.current.play();
                }, 50);
              }, 1000);
            } else {
              // All repeats for this segment are complete — fire the onSegmentRepeatComplete callback and reset the repeat counter. 
              // Then, either move to the next segment or finish playback if there are no more segments. 
              onSegmentRepeatCompleteRef.current?.(repeatCountRef.current);
              currentRepeatRef.current = 0;
              const restoreRate = userPlaybackRateRef.current ?? 1.0;
              dispatch(setPlaybackRate(restoreRate));
              playbackRateRef.current = restoreRate;

              // After a short delay, set the playback rate in WaveSurfer to the user's preferred playback rate.
              const nextIdx = idx + 1;
              const markers = timeMarkersRef.current;

              // If there are more segments to play, move to the next segment. 
              // Otherwise, stop playback and fire the onAudioComplete callback.
              if (nextIdx < markers.length) {
                // If we're in controlled mode, seek to the start of the next segment and update the current marker index in the store.
                if (isControlledModeRef.current) {
                  const nextMarker = markers[nextIdx];
                  const nextTime =
                    typeof nextMarker === "object"
                      ? nextMarker.time
                      : nextMarker;

                  // After a short delay, seek to the start of the next segment and update the current marker index in the store.
                  setTimeout(() => {
                    if (isCancelled || !wavesurfer.current) return;
                    if (!isEnhancedModeRef.current) {
                      // mode flipped while waiting
                      isSegmentTransitioningRef.current = false; // unblock the engine; don't stop
                      return;
                    }
                    // Seek to the start of the next segment and update the current marker index in the store.
                    dispatch(setCurrentMarkerIndex(nextIdx));
                    wavesurfer.current.setTime(nextTime);
                    // unblock the engine and stop playback.
                    isSegmentTransitioningRef.current = false;
                    isPlayingRef.current = false;
                    dispatch(setIsPlaying(false));
                  }, 200);
                } else {
                  // Free Play mode — just jump to the next segment and start playing at the first speed in the sequence
                  const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [1.0];
                  const firstSpeed = seq[0] ?? 1.0;

                  // Update the playback rate in the store and the ref, then set a timeout to change the playback rate in WaveSurfer after a short delay.
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
                    // After a short delay, seek to the start of the next segment and update the current marker index in the store. 
                    // Then, after another short delay, unblock the engine and resume playback at the first speed in the sequence.
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
                      // Unblock the engine and resume playback at the first speed in the sequence
                      isSegmentTransitioningRef.current = false;
                      isPlayingRef.current = true;
                      wavesurfer.current.play();
                    }, 50);
                  }, 1000);
                }
              } else {
                // All segments finished — stop playback and fire onAudioComplete
                isSegmentTransitioningRef.current = false;
                isPlayingRef.current = false;
                dispatch(setIsPlaying(false));
                onAudioCompleteRef.current?.();
              }
            }
          }
        }
      }
      // Schedule the next tick
      rafRef.current = requestAnimationFrame(tick);
    };

    // Start the RAF loop
    rafRef.current = requestAnimationFrame(tick);

    // Cleanup function to cancel the RAF loop when the component is unmounted or when dependencies change
    return () => {
      isCancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isInitialized, getSegmentBounds, dispatch]);

  // Reset the playback rate to the user's preferred rate when the enhanced mode is disabled.
  // This ensures that the playback rate is consistent with the user's preference when switching between enhanced and free play modes.
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

  // Handle visibility change events to pause playback when the tab is hidden and resume when it becomes visible again.
  // This ensures that playback is paused when the user switches to another tab, preventing unwanted audio playback in the background.
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