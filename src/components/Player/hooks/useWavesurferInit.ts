import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { useAppDispatch } from "../../../hooks/hooks";
import {
  setIsPlaying,
  setDurationSeconds,
  setDuration,
} from "../../../store/playerslice";
import { formatTime } from "./constants";

interface UseWavesurferInitOptions {
  audioUrl: string;
  waveformRef: React.RefObject<HTMLDivElement | null>;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  onWavesurferMount?: (ws: WaveSurfer) => void;
  onAudioComplete: (() => void) | undefined;
}

export const useWavesurferInit = ({
  audioUrl,
  waveformRef,
  volume,
  isMuted,
  playbackRate,
  onWavesurferMount,
  onAudioComplete,
}: UseWavesurferInitOptions) => {
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAudioCompleteRef = useRef(onAudioComplete);
  const dispatch = useAppDispatch();

  useEffect(() => {
    onAudioCompleteRef.current = onAudioComplete;
  }, [onAudioComplete]);

  useEffect(() => {
    if (!waveformRef.current) return;

    // An empty URL is a REAL state, not a not-yet-ready one: a DB part with no
    // audio now reaches the player as audio: "" rather than being dropped from
    // the track list. Returning early while isLoading stayed true left the UI
    // saying "Loading audio..." forever, with nothing to wait for. Clear the
    // flag so the surrounding UI can render an honest empty state instead.
    if (!audioUrl) {
      setIsLoading(false);
      setIsInitialized(false);
      return;
    }

    if (wavesurfer.current) {
      wavesurfer.current.pause();
      wavesurfer.current.destroy();
      wavesurfer.current = null;
      dispatch(setIsPlaying(false));
    }

    setIsLoading(true);
    setIsInitialized(false);

    // FIX: track intentional destruction so we can suppress expected errors
    let isDestroyed = false;

    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches;

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      // Desktop: white on a faint dark track (WaveformDisplay), played part
      // solid, the rest translucent — the same language as the phone's bar.
      waveColor: isMobile ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.42)",
      progressColor: isMobile ? "rgb(5, 223, 59)" : "#ffffff",
      cursorColor: isMobile ? "rgba(255,255,255,0.9)" : "#ffffff",
      barWidth: isMobile ? 3 : 2,
      barRadius: isMobile ? 3 : 2,
      cursorWidth: isMobile ? 2 : 2,
      height: isMobile ? 44 : 52,
      barGap: 2,
      normalize: true,
      fillParent: true,
      mediaControls: false,
      hideScrollbar: true,
      interact: true,
    });

    const instance = wavesurfer.current;

    instance.on("ready", () => {
      instance.setVolume(isMuted ? 0 : volume);
      instance.setPlaybackRate(playbackRate);

      const totalDuration = instance.getDuration();
      dispatch(setDurationSeconds(totalDuration));
      dispatch(setDuration(formatTime(totalDuration)));

      setIsInitialized(true);
      requestAnimationFrame(() => setIsLoading(false));

      if (onWavesurferMount) onWavesurferMount(instance);
    });

    instance.on("play", () => dispatch(setIsPlaying(true)));
    instance.on("pause", () => dispatch(setIsPlaying(false)));
    instance.on("finish", () => {
      dispatch(setIsPlaying(false));
      onAudioCompleteRef.current?.();
    });

    // FIX: ignore AbortError (expected on destroy) and errors after teardown
    instance.on("error", (error) => {
      if (isDestroyed || (error as Error)?.name === "AbortError") return;
      console.error("WaveSurfer error:", error);
      dispatch(setIsPlaying(false));
    });

    const handlePointerMove = (e: PointerEvent) => {
      const hover = waveformRef.current?.querySelector("#hover") as HTMLElement;
      if (hover) hover.style.width = `${e.offsetX}px`;
    };
    waveformRef.current.addEventListener("pointermove", handlePointerMove);

    // FIX: load() returns a Promise in WaveSurfer v7 — catch the AbortError
    // that is thrown when destroy() cancels the in-flight fetch
    instance.load(audioUrl).catch((error: Error) => {
      if (error?.name === "AbortError") return; // intentional, safe to ignore
      console.error("WaveSurfer load error:", error);
    });

    return () => {
      // FIX: mark as destroyed BEFORE calling destroy() so the error handler
      // above does not react to any late-firing events
      isDestroyed = true;

      if (intervalRef.current) clearTimeout(intervalRef.current);
      waveformRef.current?.removeEventListener(
        "pointermove",
        handlePointerMove,
      );
      if (instance) {
        instance.unAll();
        instance.destroy();
      }
      setIsInitialized(false);
    };
  }, [audioUrl]);

  return { wavesurfer, isInitialized, isLoading };
};
