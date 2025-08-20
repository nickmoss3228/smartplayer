import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  ReactEventHandler,
} from "react";
import WaveSurfer from "wavesurfer.js";
import { FaVolumeHigh } from "react-icons/fa6";
import { FaVolumeMute } from "react-icons/fa";
import { IoPause, IoPlay, IoRepeat, IoArrowForward } from "react-icons/io5";
import { WaveformPlayerProps } from "../types";
import {
  WaveformContainer,
  HoverEffect,
  Button,
  TimeLabel,
  VolumeControl,
  VolumeIcon,
  VolumeSlider,
  ControlsContainer,
  SubtitlesContainer,
  SubtitleText,
  SubtitlesButton,
  TimeMarkersContainer,
  TimeMarkerLine,
  TimeMarkerLabel,
  PlayModeContainer,
  PlayModeToggle,
  NavigationControls,
  NavButton,
  DropdownContainer,
  VolumeSpeedContainer,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from "../styledComponents";

import { useAppSelector, useAppDispatch } from "../hooks/hooks";
import {
  setCurrentMarkerIndex,
  setIsPlaying,
  setVolume,
  setIsMuted,
  setPlaybackRate,
  setSubtitlesVisible,
  setIsPlayMode,
  setCurrentTime,
  setDurationSeconds,
  setDuration,
  setActiveSubtitle,
} from "../store/playerslice";

const formatTime = (time: number) => {
  if (!isFinite(time)) return "0:00";

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

interface WaveSurferRef {
  current: WaveSurfer | null;
}

const WaveformPlayer: React.FC<WaveformPlayerProps> = React.memo(
  ({ audioUrl, subtitles, timeMarkers, onWavesurferMount }) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurfer: WaveSurferRef = useRef(null);
    const playbackRates: number[] = [0.85, 0.9, 1.0, 1.1, 1.2];

    // Simplified state management
    const [isInitialized, setIsInitialized] = useState(false);
    const intervalRef = useRef<any | null>(null);

    const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);

    const dispatch = useAppDispatch();

    const {
      currentMarkerIndex,
      isPlaying,
      volume,
      isMuted,
      playbackRate,
      subtitlesVisible,
      isPlayMode,
      currentTime,
      durationSeconds,
      duration,
      activeSubtitle,
    } = useAppSelector((state) => state.player);

    // Helper function to get current segment bounds
    const getCurrentSegmentBounds = useCallback(() => {
      if (!timeMarkers?.length || currentMarkerIndex < 0) {
        return { start: 0, end: durationSeconds || Infinity };
      }
      const currentMarker = timeMarkers[currentMarkerIndex];
      const nextMarker = timeMarkers[currentMarkerIndex + 1];

      const start =
        typeof currentMarker === "object" ? currentMarker.time : currentMarker;
      const end = nextMarker
        ? typeof nextMarker === "object"
          ? nextMarker.time
          : nextMarker
        : durationSeconds || Infinity;

      return { start, end };
    }, [timeMarkers, currentMarkerIndex, durationSeconds]);

    // Мемоизируем функцию обновления активного субтитра
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
        dispatch(
          setActiveSubtitle(currentSubtitle ? currentSubtitle.text : "")
        );
      },
      [subtitles, dispatch]
    );

    // Update current marker based on time
    const updateCurrentMarkerIndex = useCallback(
      (currentTimeValue: number) => {
        if (!timeMarkers?.length || !isPlayMode) return;

        // Don't update if we're very close to stopping
        const { end } = getCurrentSegmentBounds();
        if (currentTimeValue >= end - 0.1) return;

        const newIndex = timeMarkers.findIndex((marker, index) => {
          const currentMarkerTime =
            typeof marker === "object" ? marker.time : marker;
          let nextMarkerTime: number;

          if (index < timeMarkers.length - 1) {
            const nextMarker = timeMarkers[index + 1];
            nextMarkerTime =
              typeof nextMarker === "object" ? nextMarker.time : nextMarker;
          } else {
            nextMarkerTime = durationSeconds || Infinity;
          }

          return (
            currentTimeValue >= currentMarkerTime &&
            currentTimeValue < nextMarkerTime
          );
        });

        if (newIndex >= 0 && newIndex !== currentMarkerIndex) {
          dispatch(setCurrentMarkerIndex(newIndex));
        }
      },
      [timeMarkers, isPlayMode, durationSeconds, currentMarkerIndex, dispatch]
    );

    // Remove the existing interval useEffect and replace with:
    useEffect(() => {
      if (!wavesurfer.current || !isInitialized) return;

      const instance = wavesurfer.current;
      let animationFrame: number;

      const updateProgress = () => {
        if (!instance) return;

        const currentTimeValue = instance.getCurrentTime();
        dispatch(setCurrentTime(formatTime(currentTimeValue)));
        updateActiveSubtitle(currentTimeValue);

        // Handle stopping BEFORE updating marker index
        if (isPlayMode && timeMarkers?.length) {
          const { end } = getCurrentSegmentBounds();

          // More precise stopping with smaller threshold
          if (currentTimeValue >= end - 0.02) {
            instance.pause();
            // Ensure we don't update marker index after stopping
            if (isPlaying) {
              animationFrame = requestAnimationFrame(updateProgress);
            }
            return;
          }
        }

        // Update marker index only if we're not stopping
        updateCurrentMarkerIndex(currentTimeValue);

        if (isPlaying) {
          animationFrame = requestAnimationFrame(updateProgress);
        }
      };

      if (isPlaying) {
        animationFrame = requestAnimationFrame(updateProgress);
      }

      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      };
    }, [
      isPlaying,
      isInitialized,
      isPlayMode,
      getCurrentSegmentBounds,
      updateActiveSubtitle,
      updateCurrentMarkerIndex,
      dispatch,
    ]);

    // Main WaveSurfer initialization
    useEffect(() => {
      if (!waveformRef.current || !audioUrl) return;

      console.log("Initializing wavesurfer");

      // Clean up existing instance
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }

      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#8cef7eff",
        progressColor: "#3caa3c",
        cursorColor: "#45a049",
        barWidth: 4,
        barRadius: 3,
        cursorWidth: 3,
        height: 100,
        barGap: 2,
        normalize: true,
        fillParent: true,
        mediaControls: false,
        hideScrollbar: true,
        interact: true,
      });

      const instance = wavesurfer.current;

      // Event handlers
      instance.on("ready", () => {
        console.log("WaveSurfer ready");
        instance.setVolume(isMuted ? 0 : volume);
        instance.setPlaybackRate(playbackRate);

        const totalDuration = instance.getDuration();
        dispatch(setDurationSeconds(totalDuration));
        dispatch(setDuration(formatTime(totalDuration)));

        setIsInitialized(true);

        if (onWavesurferMount) {
          onWavesurferMount(instance);
        }
      });

      instance.on("play", () => {
        console.log("WaveSurfer play event");
        dispatch(setIsPlaying(true));
      });

      instance.on("pause", () => {
        console.log("WaveSurfer pause event");
        dispatch(setIsPlaying(false));
      });

      instance.on("finish", () => {
        console.log("WaveSurfer finish event");
        dispatch(setIsPlaying(false));
      });

      instance.on("error", (error) => {
        console.error("WaveSurfer error:", error);
        dispatch(setIsPlaying(false));
      });

      // Hover effect
      const handlePointerMove = (e: PointerEvent) => {
        const hover = waveformRef.current?.querySelector(
          "#hover"
        ) as HTMLElement;
        if (hover && e instanceof PointerEvent) {
          hover.style.width = `${e.offsetX}px`;
        }
      };

      waveformRef.current.addEventListener("pointermove", handlePointerMove);

      // Load audio
      instance.load(audioUrl);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        waveformRef.current?.removeEventListener(
          "pointermove",
          handlePointerMove
        );
        if (instance) {
          instance.unAll();
          instance.destroy();
        }
        setIsInitialized(false);
      };
    }, [audioUrl]); // Only depend on audioUrl

    // Memoize the handlers
    const handlePlayPause = useCallback(() => {
      if (!wavesurfer.current || !isInitialized) {
        console.log("WaveSurfer not ready");
        return;
      }
      try {
        if (isPlaying) {
          wavesurfer.current.pause();
        } else {
          // In sentence mode, check if we need to go to segment start
          if (isPlayMode) {
            const currentTime = wavesurfer.current.getCurrentTime();
            const { start, end } = getCurrentSegmentBounds();

            // If we're outside the current segment or at the end, go to start
            if (currentTime < start || currentTime >= end - 0.05) {
              wavesurfer.current.setTime(start);
            }
          }
          wavesurfer.current.play();
        }
      } catch (error) {
        console.error("Playback error:", error);
        dispatch(setIsPlaying(false));
      }
    }, [
      isPlaying,
      isInitialized,
      isPlayMode,
      getCurrentSegmentBounds,
      dispatch,
    ]);

    // Navigation functions
    const goToNextSentence = useCallback(() => {
      if (
        !timeMarkers?.length ||
        currentMarkerIndex >= timeMarkers.length - 1 ||
        !wavesurfer.current ||
        !isPlayMode
      ) {
        return;
      }

      const nextIndex = currentMarkerIndex + 1;
      const nextMarker = timeMarkers[nextIndex];
      const nextTime =
        typeof nextMarker === "object" ? nextMarker.time : nextMarker;

      dispatch(setCurrentMarkerIndex(nextIndex));
      wavesurfer.current.setTime(nextTime);
      wavesurfer.current.play();
    }, [isPlayMode, timeMarkers, currentMarkerIndex, dispatch]);

    const togglePlayMode = useCallback(() => {
      const wasPlaying = isPlaying;

      if (wasPlaying) {
        wavesurfer.current?.pause();
      }

      const newPlayMode = !isPlayMode;
      dispatch(setIsPlayMode(newPlayMode));

      // If enabling sentence mode, go to appropriate segment
      if (newPlayMode && timeMarkers?.length && wavesurfer.current) {
        const currentTime = wavesurfer.current.getCurrentTime();

        let markerIndex = 0;
        for (let i = 0; i < timeMarkers.length; i++) {
          const markerTime =
            typeof timeMarkers[i] === "object"
              ? timeMarkers[i].time
              : timeMarkers[i];
          if (currentTime >= markerTime) {
            markerIndex = i;
          } else {
            break;
          }
        }

        dispatch(setCurrentMarkerIndex(markerIndex));
        const marker = timeMarkers[markerIndex];
        const markerTime = typeof marker === "object" ? marker.time : marker;
        wavesurfer.current.setTime(markerTime);
      }
    }, [isPlaying, isPlayMode, timeMarkers, dispatch]);

    const handleMuteToggle = useCallback(() => {
      const newMutedState = !isMuted;
      dispatch(setIsMuted(newMutedState));
      wavesurfer.current?.setVolume(newMutedState ? 0 : volume);
    }, [isPlayMode, isMuted, volume, dispatch]);

    // click on the window to close the dropdown
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (!event.target.closest(".speed-dropdown")) {
          setIsSpeedDropdownOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const changePlaybackRate = useCallback(
      (rate: number) => {
        dispatch(setPlaybackRate(rate));
        wavesurfer.current?.setPlaybackRate(rate);
      },
      [dispatch]
    );

    // Create dropdown render function
    const renderSpeedDropdown = useMemo(
      () => (
        <DropdownContainer className="speed-dropdown">
          <DropdownButton
            onClick={() => setIsSpeedDropdownOpen(!isSpeedDropdownOpen)}
          >
            {playbackRate}x
          </DropdownButton>
          <DropdownMenu $isOpen={isSpeedDropdownOpen}>
            {playbackRates.map((speed) => (
              <DropdownItem
                key={speed}
                $active={playbackRate === speed}
                onClick={() => {
                  changePlaybackRate(speed); // Use your original function
                  setIsSpeedDropdownOpen(false);
                }}
              >
                {speed}x
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownContainer>
      ),
      [playbackRate, isSpeedDropdownOpen, changePlaybackRate]
    );

    const replayCurrentSentence = useCallback(() => {
      if (!timeMarkers?.length || !wavesurfer.current || !isPlayMode) return;

      // Always use the current marker index, don't recalculate
      const markerIndex = Math.max(0, currentMarkerIndex);
      const currentMarker = timeMarkers[markerIndex];
      const start =
        typeof currentMarker === "object" ? currentMarker.time : currentMarker;

      console.log(
        `Replaying sentence ${markerIndex + 1} starting at ${start}s`
      );

      wavesurfer.current.setTime(start);
      // Small delay to ensure setTime completes
      setTimeout(() => {
        wavesurfer.current?.play();
      }, 10);
    }, [isPlayMode, timeMarkers, currentMarkerIndex]);

    const handleVolumeChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        dispatch(setVolume(newVolume));
        dispatch(setIsMuted(newVolume === 0));
        wavesurfer.current?.setVolume(newVolume);
      },
      [dispatch]
    );

    const toggleSubtitles = useCallback(() => {
      dispatch(setSubtitlesVisible(!subtitlesVisible));
    }, [subtitlesVisible, dispatch]);

    const handleMarkerClick = useCallback(
      async (time: number) => {
        if (!wavesurfer.current) return;

        try {
          // In sentence mode we upadte currentMarkerIndex
          if (isPlayMode) {
            const markerIndex = timeMarkers.findIndex((marker, index) => {
              const markerTime =
                typeof marker === "object" ? marker.time : marker;
              const nextMarker = timeMarkers[index + 1];
              const nextTime = nextMarker
                ? typeof nextMarker === "object"
                  ? nextMarker.time
                  : nextMarker
                : durationSeconds;

              return time >= markerTime && time < nextTime;
            });

            if (markerIndex >= 0) {
              dispatch(setCurrentMarkerIndex(markerIndex));
            }
          }

          wavesurfer.current.seekTo(time / durationSeconds);
          await new Promise((resolve) => setTimeout(resolve, 50));
          await wavesurfer.current.play();
          dispatch(setIsPlaying(true));
        } catch (error) {
          console.error("Error in handleMarkerClick:", error);
          dispatch(setIsPlaying(false));
        }
      },
      [durationSeconds, dispatch, isPlayMode, timeMarkers]
    );

    // Memoize the markers
    const renderTimeMarkers = useCallback(() => {
      if (durationSeconds === 0) return null;

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
    }, [durationSeconds, timeMarkers, handleMarkerClick]);

    // add the shortcut key bindings
    useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
        switch (e.code) {
          case "Space":
            e.preventDefault();
            handlePlayPause();
            break;
          case "ArrowRight":
            if (isPlayMode) goToNextSentence();
            break;
          case "KeyR":
            if (isPlayMode) replayCurrentSentence();
            break;
        }
      };

      window.addEventListener("keydown", handleKeyPress);
      return () => window.removeEventListener("keydown", handleKeyPress);
    }, [handlePlayPause, goToNextSentence, replayCurrentSentence, isPlayMode]);

    return (
      <div className="waveform-overlay">
        <WaveformContainer ref={waveformRef}>
          <HoverEffect id="hover" />
          <TimeLabel id="time">{currentTime}</TimeLabel>
          <TimeLabel id="duration">{duration}</TimeLabel>
          {renderTimeMarkers()}
        </WaveformContainer>

        <SubtitlesContainer $visible={subtitlesVisible}>
          <SubtitleText>{activeSubtitle}</SubtitleText>
        </SubtitlesContainer>

        <ControlsContainer>
          {/* 1. Sentence Mode (maintains space) */}
          <PlayModeContainer>
            <PlayModeToggle $active={isPlayMode} onClick={togglePlayMode}>
              Sentence Mode: {isPlayMode ? "ON" : "OFF"}
            </PlayModeToggle>
            <NavigationControls>
              <NavButton disabled={!isPlayMode} onClick={replayCurrentSentence}>
                <IoRepeat style={{ fontSize: "24px" }} />
              </NavButton>
              <NavButton disabled={!isPlayMode} onClick={goToNextSentence}>
                <IoArrowForward style={{ fontSize: "24px" }} />
              </NavButton>
            </NavigationControls>
          </PlayModeContainer>

          {/* 2. Play/Pause Button in the middle */}
          <Button onClick={handlePlayPause}>
            {isPlaying ? (
              <IoPause
                style={{
                  fontSize: "30px",
                  width: "60px",
                  height: "60px",
                  borderRadius: "30px",
                }}
              />
            ) : (
              <IoPlay
                style={{
                  fontSize: "30px",
                  width: "60px",
                  height: "60px",
                  borderRadius: "30px",
                }}
              />
            )}
          </Button>

          {/* 3. Volume and Speed Controls */}
          <VolumeSpeedContainer>
            <VolumeControl>
              <VolumeIcon onClick={handleMuteToggle}>
                {isMuted ? (
                  <FaVolumeMute size={24} />
                ) : (
                  <FaVolumeHigh size={24} />
                )}
              </VolumeIcon>
              <VolumeSlider
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
              />
            </VolumeControl>

            {renderSpeedDropdown}
          </VolumeSpeedContainer>

          {/* 4. Subtitles Button */}
          <SubtitlesButton onClick={toggleSubtitles} $active={subtitlesVisible}>
            CC
          </SubtitlesButton>
        </ControlsContainer>
      </div>
    );
  }
);
WaveformPlayer.displayName = "WaveformPlayer";

export default WaveformPlayer;