import { useRef, useState, useCallback, useEffect } from "react";
import { PitchShifter } from "soundtouchjs";

interface UseSoundTouchEngineOptions {
  audioUrl: string;
  volume: number;
  isMuted: boolean;
  onReady?: (duration: number) => void;
  onFinish?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export interface SoundTouchEngine {
  play: () => Promise<void>;
  pause: () => void;
  isPlaying: () => boolean;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setTempo: (rate: number) => void; // pitch-preserving speed change
  setVolume: (v: number) => void;
  setMuted: (muted: boolean) => void;
}

export const useSoundTouchEngine = ({
  audioUrl,
  volume,
  isMuted,
  onReady,
  onFinish,
  onTimeUpdate,
}: UseSoundTouchEngineOptions) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const shifterRef = useRef<PitchShifter | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);
  const tempoRef = useRef(1);
  const durationRef = useRef(0);

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const onReadyRef = useRef(onReady);
  const onFinishRef = useRef(onFinish);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);

  useEffect(() => {
    if (!audioUrl) return;
    let cancelled = false;

    setIsLoading(true);
    setIsReady(false);

    if (shifterRef.current) {
      try { shifterRef.current.disconnect(); } catch {}
      shifterRef.current = null;
    }
    isPlayingRef.current = false;

    const ctx = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = ctx;

    fetch(audioUrl)
      .then((res) => res.arrayBuffer())
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {
        if (cancelled) return;
        durationRef.current = audioBuffer.duration;

        const shifter = new PitchShifter(ctx, audioBuffer, 4096);
        shifter.tempo = tempoRef.current;
        shifter.pitch = 1; // never touch pitch — only tempo/speed

        const gainNode = ctx.createGain();
        gainNode.gain.value = isMuted ? 0 : volume;
        gainNodeRef.current = gainNode;
        gainNode.connect(ctx.destination);

        shifter.on("play", (detail) => {
          onTimeUpdateRef.current?.(detail.timePlayed);
          if (detail.percentagePlayed >= 1) {
            isPlayingRef.current = false;
            shifter.disconnect();
            onFinishRef.current?.();
          }
        });

        shifterRef.current = shifter;
        setIsReady(true);
        setIsLoading(false);
        onReadyRef.current?.(audioBuffer.duration);
      })
      .catch((err) => {
        if (!cancelled) console.error("SoundTouch decode error:", err);
      });

    return () => { cancelled = true; };
  }, [audioUrl]);

  useEffect(() => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const play = useCallback(async () => {
    const ctx = audioContextRef.current;
    const shifter = shifterRef.current;
    const gainNode = gainNodeRef.current;
    if (!ctx || !shifter || !gainNode) return;
    if (ctx.state === "suspended") await ctx.resume(); // required after user gesture
    shifter.connect(gainNode);
    isPlayingRef.current = true;
  }, []);

  const pause = useCallback(() => {
    shifterRef.current?.disconnect();
    isPlayingRef.current = false;
  }, []);

  const isPlaying = useCallback(() => isPlayingRef.current, []);

  const seekTo = useCallback((seconds: number) => {
    const shifter = shifterRef.current;
    const duration = durationRef.current;
    if (!shifter || !duration) return;
    shifter.percentagePlayed = Math.min(Math.max(seconds / duration, 0), 1);
  }, []);

  const getCurrentTime = useCallback(() => {
    const shifter = shifterRef.current;
    return shifter ? shifter.percentagePlayed * durationRef.current : 0;
  }, []);

  const getDuration = useCallback(() => durationRef.current, []);

  const setTempo = useCallback((rate: number) => {
    tempoRef.current = rate;
    if (shifterRef.current) shifterRef.current.tempo = rate;
  }, []);

  const setVolume = useCallback((v: number) => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = v;
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = muted ? 0 : volume;
  }, [volume]);

  useEffect(() => {
    return () => {
      shifterRef.current?.disconnect?.();
      audioContextRef.current?.close?.();
    };
  }, []);

  const engine: SoundTouchEngine = {
    play, pause, isPlaying, seekTo, getCurrentTime, getDuration, setTempo, setVolume, setMuted,
  };

  return { engine, isReady, isLoading };
};