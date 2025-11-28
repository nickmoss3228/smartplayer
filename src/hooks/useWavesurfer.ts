import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useAppDispatch } from './hooks';
import { setDurationSeconds, setDuration, setIsPlaying } from '../store/playerslice';

const formatTime = (time: number) => {
  if (!isFinite(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const useWaveSurfer = (audioUrl: string, onWavesurferMount?: (ws:WaveSurfer)=> void) => {
    const waveformRef = useRef<HTMLDivElement>(null)
    const wavesurfer = useRef<WaveSurfer | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const dispatch = useAppDispatch()

    const initializeWavesurfer = useCallback(() => {
        if (!waveformRef.current || !audioUrl) return;
        
        //cleanup existing instance
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

        const instance = wavesurfer.current

        instance.on("ready", () => {
            const totalDuration = instance.getDuration();
            dispatch(setDurationSeconds(totalDuration))
            dispatch(setDuration(formatTime(totalDuration)))
            setIsInitialized(true)

            if (onWavesurferMount) {
                onWavesurferMount(instance)
            }
        });

        instance.on("play", () => {dispatch(setIsPlaying(true))})
        instance.on("pause", () => dispatch(setIsPlaying(false)));
        instance.on("finish", () => dispatch(setIsPlaying(false)));
        instance.on("error", (error) => {
          console.error("WaveSurfer error:", error);
          dispatch(setIsPlaying(false));
        });

    instance.load(audioUrl);
    }, [audioUrl, dispatch, onWavesurferMount]);
    
    //initialize WS and cleanup the existed instance
    useEffect(() => {
        initializeWavesurfer()

        return () => {
            if (wavesurfer.current) {
                wavesurfer.current.destroy();
            }
            setIsInitialized(false)
        }
    }, [audioUrl])

    return {
        waveformRef,
        wavesurfer: wavesurfer.current,
        isInitialized
    }
}

