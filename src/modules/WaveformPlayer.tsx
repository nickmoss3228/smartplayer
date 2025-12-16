import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import WaveSurfer from "wavesurfer.js";
import { FaVolumeHigh } from "react-icons/fa6";
import { FaVolumeMute } from "react-icons/fa";
import { IoPause, IoPlay, IoRepeat, IoArrowForward } from "react-icons/io5";
import { WaveformPlayerProps } from "../types";
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
    isPlaying,              // Главный триггер запуска/остановки
    isInitialized,          // Проверка готовности wavesurfer
    isPlayMode,             // Режим воспроизведения (весь трек / сегмент)
    getCurrentSegmentBounds, // Функция получения границ
    updateActiveSubtitle,   // Функция обновления субтитров
    updateCurrentMarkerIndex, // Функция обновления маркера
    dispatch,               // Redux 
  ]);

    // Main WaveSurfer initialization
    useEffect(() => {
      if (!waveformRef.current || !audioUrl) return;

      // console.log("Initializing wavesurfer");

      // Clean up existing instance
      if (wavesurfer.current) {
        wavesurfer.current.pause();
        wavesurfer.current.destroy();
        wavesurfer.current = null;
        dispatch(setIsPlaying(false));
      }

      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#717171ff",
        progressColor: "#05df3bff",
        cursorColor: "#008206ff",
        barWidth: 3,
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
        console.log("WS ready");
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
        // console.log("WaveSurfer play event");
        dispatch(setIsPlaying(true));
      });

      instance.on("pause", () => {
        // console.log("WaveSurfer pause event");
        dispatch(setIsPlaying(false));
      });

      instance.on("finish", () => {
        // console.log("WaveSurfer finish event");
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
    }, [audioUrl]); // depends on audioUrl

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
          const markerTime = (
            typeof timeMarkers[i] === "object"
              ? (timeMarkers[i] as { time: number }).time
              : timeMarkers[i]
          ) as number;
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
      const handleClickOutside = (event: MouseEvent) => {
        if (
          event.target instanceof Element &&
          !event.target.closest(".speed-dropdown")
        ) {
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
        <div className="speed-dropdown relative inline-block tracking-[0px] font-medium font-['Montserrat']">
          <button
            className="bg-white/90 text-black/90 border-none px-3 py-2 rounded cursor-pointer text-xs flex items-center gap-[5px] transition-all duration-200 hover:bg-white/80 after:content-['▼'] after:text-[10px]"
            onClick={() => setIsSpeedDropdownOpen(!isSpeedDropdownOpen)}
          >
            {playbackRate}x
          </button>
          <div
            className={`absolute top-full left-0 bg-white/90 text-black rounded shadow-[0_4px_12px_rgba(0,0,0,0.3)] z-[1000] min-w-[80px] overflow-hidden ${
              isSpeedDropdownOpen ? "block" : "hidden"
            }`}
          >
            {playbackRates.map((speed) => (
              <button
                key={speed}
                className={`w-full px-3 py-2 border-none ${
                  playbackRate === speed ? "bg-white" : "bg-transparent"
                } text-black cursor-pointer text-xs text-left [&:not(:last-child)]:border-b [&:not(:last-child)]:border-black/10 font-['Montserrat']`}
                onClick={() => {
                  changePlaybackRate(speed);
                  setIsSpeedDropdownOpen(false);
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
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

      clearTimeout(intervalRef.current);
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

    const renderTimeMarkers = useCallback(() => {
      if (durationSeconds === 0) return null;

      return (
        <div className="absolute top-0 left-0 right-0 h-full bottom-0">
          {timeMarkers.map((marker, index) => {
            const position = (marker.time / durationSeconds) * 100;

            return (
              <div
                key={index}
                className="absolute top-0 bottom-0 w-0.5 md:w-[2px] cursor-pointer transition-opacity duration-300 z-10 hover:opacity-80"
                style={{
                  left: `${position}%`,
                  backgroundColor: marker.color || "red",
                }}
                onClick={() => handleMarkerClick(marker.time)}
                title={`Jump to ${marker.label}`}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black/75 text-white px-1.5 py-0.5 md:px-[6px] md:py-0.5 rounded text-[11px] md:text-[11px] whitespace-nowrap">
                  {marker.label}
                </span>
              </div>
            );
          })}
        </div>
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
        {/* WaveformContainer */}
        <div
          ref={waveformRef}
          className="w-full bg-[#212121ff] h-[100px] sm:h-[60px] md:h-25 mx-auto rounded-lg overflow-visible relative px-0.5 group"
        >
          {/* HoverEffect */}
          <div
            id="hover"
            className="absolute left-0 top-0 z-10 pointer-events-none h-[100px] sm:h-[60px] md:h-25 w-0 mix-blend-overlay bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          />

          {/* TimeLabel - Current Time */}
          <div
            id="time"
            className="absolute z-[11] bottom-[5px] left-[5px] text-[11px] md:text-[10px] bg-black/75 px-1.5 py-0.5 md:px-1 md:py-[1px] text-[#ddd] rounded-[3px] pointer-events-none"
          >
            {currentTime}
          </div>

          {/* TimeLabel - Duration */}
          <div
            id="duration"
            className="absolute z-[11] bottom-[5px] right-[5px] text-[11px] md:text-[10px] bg-black/75 px-1.5 py-0.5 md:px-1 md:py-[1px] text-[#ddd] rounded-[3px] pointer-events-none"
          >
            {duration}
          </div>

          {renderTimeMarkers()}
        </div>

        {/* SubtitlesContainer */}
        <div
          className={`relative w-full bg-[#212121ff] mt-5 md:mt-2.5 p-1.5 h-[70px] md:h-10 text-white font-mono rounded z-10 flex items-center justify-center ${
            subtitlesVisible ? "flex" : "hidden"
          }`}
        >
          {/* SubtitleText */}
          <p className="text-sm sm:text-base md:text-xl text-white tracking-[0px] font-medium font-['Montserrat']">
            {activeSubtitle}
          </p>
        </div>

        {/* ControlsContainer */}
        <div className="max-w-[1100px] bg-[#212121ff] mx-auto p-[35px] md:p-5 sm:p-4 flex flex-col justify-between items-center gap-5 md:gap-4 sm:gap-3 mt-[15px]">
          {/* 1. Sentence Mode Section */}
          <div className="flex md:flex-col sm:flex-col items-center md:items-stretch sm:items-stretch justify-center gap-5 md:gap-3 sm:gap-2.5 w-full">
            {/* PlayModeToggle */}
            <button
              className={`${
                isPlayMode ? "bg-[#05df3bff]" : "bg-white/90"
              } text-black border-none rounded-[20px] px-4 py-2 md:px-3 md:py-2 sm:px-3 sm:py-1.5 cursor-pointer transition-all duration-200 hover:opacity-90 text-sm md:text-xs sm:text-xs font-medium whitespace-nowrap md:w-full sm:w-full`}
              onClick={togglePlayMode}
            >
              Sentence Mode: {isPlayMode ? "ON" : "OFF"}
            </button>

            {/* NavigationControls */}
            <div className="flex items-center gap-[15px] md:gap-3 sm:gap-2.5 md:justify-center sm:justify-center md:w-full sm:w-full">
              {/* NavButton - Replay */}
              <button
                className="bg-white border-2 border-[#ddd] rounded-full w-10 h-10 md:w-12 md:h-12 sm:w-11 sm:h-11 flex items-center justify-center cursor-pointer text-black transition-all duration-200 hover:bg-[#05df3bff] hover:text-white hover:border-green-500 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-black disabled:hover:border-[#ddd]"
                disabled={!isPlayMode}
                onClick={replayCurrentSentence}
              >
                <IoRepeat className="text-[20px] md:text-[22px] sm:text-[20px]" />
              </button>

              {/* NavButton - Next */}
              <button
                className="bg-white border-2 border-[#ddd] rounded-full w-10 h-10 md:w-12 md:h-12 sm:w-11 sm:h-11 flex items-center justify-center cursor-pointer text-black transition-all duration-200 hover:bg-[#05df3bff] hover:text-white hover:border-green-500 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-black disabled:hover:border-[#ddd]"
                disabled={!isPlayMode}
                onClick={goToNextSentence}
              >
                <IoArrowForward className="text-[20px] md:text-[22px] sm:text-[20px]" />
              </button>
            </div>
          </div>

          {/* 2. Main Controls: Volume, Play/Pause, Speed */}
          <div className="flex md:flex-row flex-row items-center justify-between w-full gap-3 sm:gap-4 md:gap-5">
            {/* VolumeControl */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 w-full justify-center">
              {/* VolumeIcon */}
              <div
                className="cursor-pointer text-white/90 flex items-center hover:text-white transition-colors duration-200"
                onClick={handleMuteToggle}
              >
                {isMuted ? (
                  <FaVolumeMute className="text-[18px] sm:text-[20px] md:text-[24px]" />
                ) : (
                  <FaVolumeHigh className="text-[18px] sm:text-[20px] md:text-[24px]" />
                )}
              </div>

              {/* VolumeSlider */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-[60px] sm:w-[80px] md:w-[130px] h-[3px] bg-[#ddd] rounded-[3px] outline-none opacity-70 hover:opacity-100 cursor-pointer transition-opacity duration-200 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:hover:bg-[#f0f0f0] [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-200 [&::-moz-range-thumb]:hover:bg-[#f0f0f0] [&::-moz-range-thumb]:hover:scale-110"
              />
            </div>

            {/* Play/Pause Button */}
            <button
              className="p-3 md:p-2 sm:p-1 border-none bg-white rounded-full cursor-pointer hover:bg-[#f5f5f5] transition-all duration-200 active:scale-95 flex items-center justify-center flex-shrink-0"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <IoPause className="text-black text-[28px] md:text-[32px] sm:text-[30px] w-[50px] h-[50px] md:w-[60px] md:h-[60px] sm:w-[55px] sm:h-[55px]" />
              ) : (
                <IoPlay className="text-black text-[28px] md:text-[32px] sm:text-[30px] w-[50px] h-[50px] md:w-[60px] md:h-[60px] sm:w-[55px] sm:h-[55px]" />
              )}
            </button>

            {/* Speed Dropdown */}
            <div className="md:w-full sm:w-full md:flex md:justify-center sm:flex sm:justify-center">
              {renderSpeedDropdown}
            </div>
          </div>

          {/* 3. Subtitles Button */}
          <button
            className={`${
              subtitlesVisible
                ? "bg-[#05df3bff] text-black"
                : "bg-white/90 text-black"
            } px-6 py-3 w-xs md:px-5 md:py-2.5 sm:px-4 sm:py-2 rounded cursor-pointer text-xs md:text-[11px] sm:text-[10px] transition-all duration-200 ease-in-out flex items-center justify-center gap-[5px] tracking-wider font-semibold font-['Montserrat'] border-2 ${
              subtitlesVisible
                ? "border-[#05df3bff] hover:bg-[#05df3bff]"
                : "border-white/90 hover:bg-white/80"
            } active:scale-95 w-full`}
            onClick={toggleSubtitles}
          >
            CC
          </button>
        </div>
      </div>
    );
  }
);

WaveformPlayer.displayName = "WaveformPlayer";

export default WaveformPlayer;
