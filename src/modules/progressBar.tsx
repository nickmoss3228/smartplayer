import React, {useEffect, useRef, useState, useMemo, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { FaVolumeHigh } from "react-icons/fa6";
import { FaVolumeMute } from "react-icons/fa";
import { IoPause, IoPlay, IoRepeat, IoArrowForward } from 'react-icons/io5';
import { WaveformPlayerProps } from '../types';
import {
  WaveformContainer, 
  HoverEffect, 
  Controls, 
  Button, 
  TimeLabel, 
  VolumeControl, 
  VolumeIcon, 
  VolumeSlider,
  ControlsContainer,
  SpeedControls,
  SpeedButton, 
  SubtitlesContainer,
  SubtitleText, 
  SubtitlesButton, 
  TimeMarkersContainer, 
  TimeMarkerLine, 
  TimeMarkerLabel, 
  PlayModeContainer, 
  PlayModeToggle, 
  NavigationControls, 
  NavButton
} from '../styledComponents'

import { useAppSelector, useAppDispatch } from '../hooks/hooks';
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
  setActiveSubtitle
} from '../store/playerslice';

const formatTime = (time:number) => {
  if (!isFinite(time)) return "0:00";
  
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

interface WaveSurferRef {
  current: WaveSurfer | null;
}

const WaveformPlayer: React.FC<WaveformPlayerProps> = React.memo(({ 
  audioUrl, 
  subtitles, 
  timeMarkers, 
  onWavesurferMount 
}) => {

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer: WaveSurferRef = useRef(null);
  const playbackRates: number[] = [0.85, 0.9, 1.0, 1.1, 1.2];

  // Simplified state management
  const [isInitialized, setIsInitialized] = useState(false);
  const intervalRef = useRef<any | null>(null);

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
    activeSubtitle
  } = useAppSelector(state => state.player);

   // Helper function to get current segment bounds
  const getCurrentSegmentBounds = useCallback(() => {
    if (!timeMarkers?.length || currentMarkerIndex < 0) {
      return { start: 0, end: durationSeconds || Infinity };
    }

    const currentMarker = timeMarkers[currentMarkerIndex];
    const nextMarker = timeMarkers[currentMarkerIndex + 1];

    const start = typeof currentMarker === 'object' ? currentMarker.time : currentMarker;
    const end = nextMarker
      ? (typeof nextMarker === 'object' ? nextMarker.time : nextMarker)
      : durationSeconds || Infinity;

    return { start, end };
  }, [timeMarkers, currentMarkerIndex, durationSeconds]);

 // Мемоизируем функцию обновления активного субтитра
  // Update subtitle based on current time
  const updateActiveSubtitle = useCallback((currentTimeValue: number) => {
    if (!subtitles?.length) {
      dispatch(setActiveSubtitle(''));
      return;
    }

    const currentSubtitle = subtitles.find(sub =>
      currentTimeValue >= sub.startTime && currentTimeValue <= sub.endTime
    );
    dispatch(setActiveSubtitle(currentSubtitle ? currentSubtitle.text : ''));
  }, [subtitles, dispatch]);

     // Update current marker based on time
  const updateCurrentMarkerIndex = useCallback((currentTimeValue: number) => {
    if (!timeMarkers?.length || !isPlayMode) return;

    const newIndex = timeMarkers.findIndex((marker, index) => {
      const currentMarkerTime = typeof marker === 'object' ? marker.time : marker;
      let nextMarkerTime: number;

      if (index < timeMarkers.length - 1) {
        const nextMarker = timeMarkers[index + 1];
        nextMarkerTime = typeof nextMarker === 'object' ? nextMarker.time : nextMarker;
      } else {
        nextMarkerTime = durationSeconds || Infinity;
      }

      return currentTimeValue >= currentMarkerTime && currentTimeValue < nextMarkerTime;
    });

    if (newIndex >= 0 && newIndex !== currentMarkerIndex) {
      dispatch(setCurrentMarkerIndex(newIndex));
    }
  }, [timeMarkers, isPlayMode, durationSeconds, currentMarkerIndex, dispatch]);

  // Simplified time update using interval instead of audioprocess
  useEffect(() => {
    if (isPlaying && wavesurfer.current && isInitialized) {
      intervalRef.current = setInterval(() => {
        const currentTimeValue = wavesurfer.current?.getCurrentTime() || 0;
        dispatch(setCurrentTime(formatTime(currentTimeValue)));
        
        updateActiveSubtitle(currentTimeValue);
        updateCurrentMarkerIndex(currentTimeValue);

        // Handle sentence mode stopping
        if (isPlayMode) {
          const { end } = getCurrentSegmentBounds();
          if (currentTimeValue >= end - 0.05) {
            wavesurfer.current?.pause();
          }
        }
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying,
    isInitialized,
    isPlayMode,
    getCurrentSegmentBounds,
    updateActiveSubtitle,
    updateCurrentMarkerIndex,
    dispatch]);

   // Main WaveSurfer initialization
  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return;

    console.log('Initializing wavesurfer');
    
    // Clean up existing instance
    if (wavesurfer.current) {
      wavesurfer.current.destroy();
    }

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#a8e4a0',
      progressColor: '#3caa3c',
      cursorColor: '#45a049',
      barWidth: 3,
      barRadius: 3,
      cursorWidth: 3,
      height: 70,
      barGap: 2,
      normalize: true,
      fillParent: true,
      mediaControls: false,
      hideScrollbar: true,
      interact: true,
    });

    const instance = wavesurfer.current;

    // Event handlers
    instance.on('ready', () => {
      console.log('WaveSurfer ready');
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

    instance.on('play', () => {
      console.log('WaveSurfer play event');
      dispatch(setIsPlaying(true));
    });

    instance.on('pause', () => {
      console.log('WaveSurfer pause event');
      dispatch(setIsPlaying(false));
    });

    instance.on('finish', () => {
      console.log('WaveSurfer finish event');
      dispatch(setIsPlaying(false));
    });

    instance.on('error', (error) => {
      console.error('WaveSurfer error:', error);
      dispatch(setIsPlaying(false));
    });

    // Hover effect
    const handlePointerMove = (e: PointerEvent) => {
      const hover = waveformRef.current?.querySelector('#hover') as HTMLElement;
      if (hover && e instanceof PointerEvent) {
        hover.style.width = `${e.offsetX}px`;
      }
    };

    waveformRef.current.addEventListener('pointermove', handlePointerMove);

    // Load audio
    instance.load(audioUrl);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      waveformRef.current?.removeEventListener('pointermove', handlePointerMove);
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
      console.log('WaveSurfer not ready');
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
      console.error('Playback error:', error);
      dispatch(setIsPlaying(false));
    }
    }, [isPlaying, isInitialized, isPlayMode, getCurrentSegmentBounds, dispatch]);
  
   // Navigation functions
  const goToNextSentence = useCallback(() => {
    if (!timeMarkers?.length || currentMarkerIndex >= timeMarkers.length - 1 || !wavesurfer.current) {
      return;
    }

    const nextIndex = currentMarkerIndex + 1;
    const nextMarker = timeMarkers[nextIndex];
    const nextTime = typeof nextMarker === 'object' ? nextMarker.time : nextMarker;

    dispatch(setCurrentMarkerIndex(nextIndex));
    wavesurfer.current.setTime(nextTime);
    wavesurfer.current.play();
  }, [timeMarkers, currentMarkerIndex, dispatch]);

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
        const markerTime = typeof timeMarkers[i] === 'object' ? timeMarkers[i].time : timeMarkers[i];
        if (currentTime >= markerTime) {
          markerIndex = i;
        } else {
          break;
        }
      }
      
      dispatch(setCurrentMarkerIndex(markerIndex));
      const marker = timeMarkers[markerIndex];
      const markerTime = typeof marker === 'object' ? marker.time : marker;
      wavesurfer.current.setTime(markerTime);
    }
  }, [isPlaying, isPlayMode, timeMarkers, dispatch]);

  const handleMuteToggle = useCallback(() => {
    const newMutedState = !isMuted;
    dispatch(setIsMuted(newMutedState));
    wavesurfer.current?.setVolume(newMutedState ? 0 : volume);
  }, [isMuted, volume, dispatch]);

  const replayCurrentSentence = useCallback(() => {
    if (!timeMarkers?.length || currentMarkerIndex < 0 || !wavesurfer.current) return;

    const { start } = getCurrentSegmentBounds();
    wavesurfer.current.setTime(start);
    wavesurfer.current.play();
  }, [getCurrentSegmentBounds]);
  
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    dispatch(setVolume(newVolume));
    dispatch(setIsMuted(newVolume === 0));
    wavesurfer.current?.setVolume(newVolume);
  }, [dispatch]);

  const changePlaybackRate = useCallback((rate: number) => {
    dispatch(setPlaybackRate(rate));
    wavesurfer.current?.setPlaybackRate(rate);
  }, [dispatch]);

  const toggleSubtitles = useCallback(() => {
    dispatch(setSubtitlesVisible(!subtitlesVisible));
  }, [subtitlesVisible, dispatch]);

  const handleMarkerClick = useCallback(async (time: number) => {
    if (!wavesurfer.current) return;

    try {
      // In sentence mode we upadte currentMarkerIndex
      if (isPlayMode) {
        const markerIndex = timeMarkers.findIndex((marker, index) => {
          const markerTime = typeof marker === 'object' ? marker.time : marker;
          const nextMarker = timeMarkers[index + 1];
          const nextTime = nextMarker 
            ? (typeof nextMarker === 'object' ? nextMarker.time : nextMarker)
            : durationSeconds;
          
          return time >= markerTime && time < nextTime;
        });
        
        if (markerIndex >= 0) {
          dispatch(setCurrentMarkerIndex(markerIndex));
        }
      }

      wavesurfer.current.seekTo(time / durationSeconds);
      await new Promise(resolve => setTimeout(resolve, 50));
      await wavesurfer.current.play();
      dispatch(setIsPlaying(true));
    } catch (error) {
      console.error('Error in handleMarkerClick:', error);
      dispatch(setIsPlaying(false));
    }
  }, [durationSeconds, dispatch, isPlayMode, timeMarkers]);

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

  // Memoize the speed buttons
  const speedButtonsRender = useMemo(() => (
    playbackRates.map((rate) => (
      <SpeedButton
        key={rate}
        onClick={() => changePlaybackRate(rate)}
        $active={playbackRate === rate}
      >
        {rate}x
      </SpeedButton>
    ))
  ), [playbackRate, changePlaybackRate]);

  // add the shortcut key bindings
  useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    switch(e.code) {
      case 'Space':
        e.preventDefault();
        handlePlayPause();
        break;
      case 'ArrowRight':
        if (isPlayMode) goToNextSentence();
        break;
      case 'KeyR':
        if (isPlayMode) replayCurrentSentence();
        break;
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [handlePlayPause, goToNextSentence, replayCurrentSentence, isPlayMode]);

  return (
    <div className='waveform-overlay'>
      <WaveformContainer ref={waveformRef}>
        <HoverEffect id="hover"/>
        <TimeLabel id="time">{currentTime}</TimeLabel>
        <TimeLabel id="duration">{duration}</TimeLabel>
        {renderTimeMarkers()}
      </WaveformContainer>
      
      <ControlsContainer>
        <Controls>
          <Button onClick={handlePlayPause}>
            {isPlaying ? 
              <IoPause style={{ fontSize: '30px', width: "60px", height: "60px", borderRadius:"30px" }} /> :
              <IoPlay style={{ fontSize: '30px', width: "60px", height: "60px", borderRadius:"30px" }} />
            }
          </Button>

          <PlayModeContainer>
            <PlayModeToggle
              $active={isPlayMode}
              onClick={togglePlayMode}
            >
              Sentence Mode: {isPlayMode ? 'ON' : 'OFF'}
            </PlayModeToggle>

            {isPlayMode && (
              <NavigationControls>
                <NavButton onClick={replayCurrentSentence}>
                  <IoRepeat style={{ fontSize: '24px' }} />
                </NavButton>
                <NavButton onClick={goToNextSentence}>
                  <IoArrowForward style={{ fontSize: '24px' }} />
                </NavButton>
              </NavigationControls>
            )}
          </PlayModeContainer>
        </Controls>

        <VolumeControl>
          <VolumeIcon onClick={handleMuteToggle}>
            {isMuted ? <FaVolumeMute size={24} /> : <FaVolumeHigh size={24} />}
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

        <SpeedControls>
          {speedButtonsRender}
        </SpeedControls>

        <SubtitlesButton
          onClick={toggleSubtitles}
          $active={subtitlesVisible}
        >
          CC
        </SubtitlesButton>
      </ControlsContainer>

      <SubtitlesContainer $visible={subtitlesVisible}>
        <SubtitleText>{activeSubtitle}</SubtitleText>
      </SubtitlesContainer>
    </div>
  );
});

WaveformPlayer.displayName = 'WaveformPlayer';

export default WaveformPlayer;

  // const [isPlaying, setIsPlaying] = useState<boolean>(false); // done
  // const [volume, setVolume] = useState<number>(1); // done
  // const [isMuted, setIsMuted] = useState<boolean>(false); // done 
  // const [currentTime, setCurrentTime] = useState<string>('0:00'); // done
  // const [durationSeconds, setDurationSeconds] = useState<number>(0); // done
  // const [duration, setDuration] = useState<number>(0); // done 
  // const [playbackRate, setPlaybackRate] = useState<number>(1.0); // done
  // const [activeSubtitle, setActiveSubtitle] = useState<string>(''); //
  // const [subtitlesVisible, setSubtitlesVisible] = useState<boolean>(true); // done
  // const [currentMarkerIndex, setCurrentMarkerIndex] = useState<number>(0); // done
  // const [isPlayMode, setIsPlayMode] = useState<boolean>(true); // done


  // wavesurfer.current = WaveSurfer.create({
  //   container: waveformRef.current,
  //   waveColor: '#a8e4a0',
  //   progressColor: '#3caa3c',
  //   cursorColor: '#45a049',
  //   barWidth: 3,
  //   barRadius: 3,
  //   cursorWidth: 3,
  //   height: 70,
  //   barGap: 2,
  //   normalize: true,
  //   responsive: true,
  //   fillParent: true,
  //   backend: 'MediaElement', // More stable on mobile
  //   mediaControls: false,
  //   hideScrollbar: true,
  //   interact: true
  // })

//   useEffect(() => {
//     if (wavesurfer.current && wavesurfer.current.isReady && timeMarkers?.length > 0) {
//         const { start } = getMarkerTimes(currentMarkerIndex);
//         wavesurfer.current.setTime(start);
//     }
// }, [currentMarkerIndex]);

  // Function to go to next sentence
  // const goToNextSentence = async () => {
  //   if (!timeMarkers?.length || currentMarkerIndex >= timeMarkers.length - 1 || !wavesurfer.current) {
  //     return;
  //   }
  
  //   const nextIndex = currentMarkerIndex + 1;
  //   const nextMarker = timeMarkers[nextIndex];
  //   const nextTime = typeof nextMarker === 'object' ? nextMarker.time : nextMarker;
  
  //   if (isFinite(nextTime) && nextTime >= 0) {
  //     setCurrentMarkerIndex(nextIndex);
      
  //     try {
  //       await wavesurfer.current.setTime(nextTime);
  //       if (isPlaying) {
  //         // Add a small delay before playing
  //         await new Promise(resolve => setTimeout(resolve, 50));
  //         await wavesurfer.current.play();
  //       }
  //     } catch (error) {
  //       console.error('Error in goToNextSentence:', error);
  //     }
  //   }
  // };

    // const handleTimeUpdate = () => {
  //   if (!wavesurfer.current) return;
    
  //   const currentTime = wavesurfer.current.getCurrentTime();
  //   const { start, end } = getMarkerTimes(currentMarkerIndex);
    
  //   // If we've passed the end of current marker
  //   if (currentTime >= end) {
  //     wavesurfer.current.pause();
  //     wavesurfer.current.setTime(start);
  //     setIsPlaying(false);
  //   }
  // };
  
   // Мемоизируем функцию получения времен маркеров
  // const getMarkerTimes = useCallback((index: number) => {
  //   if (!timeMarkers?.length || index < 0 || index >= timeMarkers.length) 
  //     return { start: 0, end: 0 };

  //   const currentMarker = timeMarkers[index];
  //   const nextMarker = timeMarkers[index + 1];

  //   const startTime = typeof currentMarker === 'object' ? currentMarker.time : currentMarker;
  //   const endTime = nextMarker
  //     ? (typeof nextMarker === 'object' ? nextMarker.time : nextMarker)
  //     : wavesurfer.current?.getDuration() || Infinity;

  //   return { start: startTime, end: endTime };
  // }, [timeMarkers]);

    
  // const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const newVolume = parseFloat(e.target?.value);
  //   dispatch(setVolume(newVolume));
  //   wavesurfer.current?.setVolume(newVolume);
  //   dispatch(setIsMuted(newVolume === 0));
  // };
  
    // const handleMuteToggle = useCallback(() => {
  //   if (isMuted) {
  //     wavesurfer.current?.setVolume(volume);
  //     dispatch(setIsMuted(false));
  //   } else {
  //     wavesurfer.current?.setVolume(0);
  //     dispatch(setIsMuted(true));
  //   }
  // }, [isMuted, volume, dispatch]);