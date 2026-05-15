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
    if (!waveformRef.current || !audioUrl) return;

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
      waveColor: isMobile ? "rgba(255,255,255,0.25)" : "rgb(26, 26, 26)",
      progressColor: isMobile ? "rgb(5, 223, 59)" : "rgb(0, 209, 70)",
      cursorColor: isMobile ? "rgba(255,255,255,0.9)" : "#008206ff",
      barWidth: isMobile ? 3 : 2,
      barRadius: isMobile ? 3 : 2,
      cursorWidth: isMobile ? 2 : 3,
      height: isMobile ? 44 : 30,
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


// import { useEffect, useRef, useState } from "react";
// import WaveSurfer from "wavesurfer.js";
// import { useAppDispatch } from "../../../hooks/hooks";
// import {
//   setIsPlaying,
//   setDurationSeconds,
//   setDuration,
// } from "../../../store/playerslice";
// import { formatTime } from "./constants";
// import { useSoundTouchPlayback } from "./useSoundTouchPlayback";

// interface UseWavesurferInitOptions {
//   audioUrl: string;
//   waveformRef: React.RefObject<HTMLDivElement | null>;
//   volume: number;
//   isMuted: boolean;
//   playbackRate: number;
//   onWavesurferMount?: (ws: WaveSurfer) => void;
//   onAudioComplete: (() => void) | undefined;
// }

// export const useWavesurferInit = ({
//   audioUrl,
//   waveformRef,
//   volume,
//   isMuted,
//   playbackRate,
//   onWavesurferMount,
//   onAudioComplete,
// }: UseWavesurferInitOptions) => {
//   const wavesurfer                        = useRef<WaveSurfer | null>(null);
//   const [isInitialized, setIsInitialized] = useState(false);
//   const [isLoading, setIsLoading]         = useState(true);
//   const intervalRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const onAudioCompleteRef                = useRef(onAudioComplete);

//   const dispatch = useAppDispatch();

//   // ── Stable ref mirrors of props — prevent stale closures inside effects ──
//   const volumeRef       = useRef(volume);
//   const isMutedRef      = useRef(isMuted);
//   const playbackRateRef = useRef(playbackRate);

//   useEffect(() => { volumeRef.current       = volume;       }, [volume]);
//   useEffect(() => { isMutedRef.current      = isMuted;      }, [isMuted]);
//   useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);
//   useEffect(() => { onAudioCompleteRef.current = onAudioComplete; }, [onAudioComplete]);

//   // ── SoundTouch engine ─────────────────────────────────────────────────────
//   const {
//     bufferReady: stBufferReady,
//     activate:    stActivate,
//     deactivate:  stDeactivate,
//     play:        stPlay,
//     pause:       stPause,
//     seek:        stSeek,
//     setTempo:    stSetTempo,
//     setVolume:   stSetVolume,
//     isActive:    stIsActive,
//     isLoaded:    stIsLoaded,
//   } = useSoundTouchPlayback(audioUrl);

//   /**
//    * Tracks whether SoundTouch is currently the active audio engine.
//    * Kept as a ref (not state) so WaveSurfer event handlers can read it
//    * synchronously without re-render cycles.
//    */
//   const stActiveRef = useRef(false);

//   // ─────────────────────────────────────────────────────────────────────────
//   // WaveSurfer — re-initialised only when audioUrl changes
//   // ─────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!waveformRef.current || !audioUrl) return;

//     // ── Tear down previous instance ──────────────────────────────────────
//     if (wavesurfer.current) {
//       wavesurfer.current.pause();
//       wavesurfer.current.destroy();
//       wavesurfer.current = null;
//       dispatch(setIsPlaying(false));
//     }

//     // Deactivate SoundTouch — useSoundTouchPlayback reloads the buffer itself
//     if (stActiveRef.current) {
//       stDeactivate();
//       stActiveRef.current = false;
//     }

//     setIsLoading(true);
//     setIsInitialized(false);

//     const isMobile =
//       typeof window !== "undefined" &&
//       window.matchMedia("(max-width: 767px)").matches;

//     wavesurfer.current = WaveSurfer.create({
//       container:     waveformRef.current,
//       waveColor:     isMobile ? "rgba(255,255,255,0.25)" : "rgb(26, 26, 26)",
//       progressColor: isMobile ? "rgb(5, 223, 59)"        : "rgb(0, 209, 70)",
//       cursorColor:   isMobile ? "rgba(255,255,255,0.9)"  : "#008206ff",
//       barWidth:      isMobile ? 3 : 2,
//       barRadius:     isMobile ? 3 : 2,
//       cursorWidth:   isMobile ? 2 : 3,
//       height:        isMobile ? 44 : 20,
//       barGap:        2,
//       normalize:     true,
//       fillParent:    true,
//       mediaControls: false,
//       hideScrollbar: true,
//       interact:      true,
//     });

//     const instance = wavesurfer.current;

//     // ── ready ─────────────────────────────────────────────────────────────
//     instance.on("ready", () => {
//       const rate = playbackRateRef.current;

//       instance.setPlaybackRate(rate);

//       const totalDuration = instance.getDuration();
//       dispatch(setDurationSeconds(totalDuration));
//       dispatch(setDuration(formatTime(totalDuration)));

//       if (rate < 1.0 && stIsLoaded()) {
//         /*
//          * SoundTouch buffer already decoded (e.g. user revisiting a track).
//          * Activate immediately and silence WaveSurfer's native output.
//          * WaveSurfer still plays internally at `rate` to keep its timeline +
//          * timeupdate events accurate — the segment engine depends on those.
//          */
//         stActiveRef.current = true;
//         instance.setVolume(0);
//         stActivate(0, rate);
//         stSetVolume(isMutedRef.current ? 0 : volumeRef.current);
//       } else {
//         // Native mode — WaveSurfer handles its own audio output
//         instance.setVolume(isMutedRef.current ? 0 : volumeRef.current);
//       }

//       setIsInitialized(true);
//       requestAnimationFrame(() => setIsLoading(false));

//       if (onWavesurferMount) onWavesurferMount(instance);
//     });

//     // ── play ──────────────────────────────────────────────────────────────
//     instance.on("play", () => {
//       dispatch(setIsPlaying(true));
//       if (stActiveRef.current) {
//         /*
//          * WaveSurfer's media element started playing (silently).
//          * Mirror the play command to SoundTouch from WaveSurfer's position
//          * so both engines are locked to the same timestamp.
//          */
//         stPlay(instance.getCurrentTime());
//       }
//     });

//     // ── pause ─────────────────────────────────────────────────────────────
//     instance.on("pause", () => {
//       dispatch(setIsPlaying(false));
//       if (stActiveRef.current) stPause();
//     });

//     // ── seek — triggered by segment engine repeats and user waveform clicks ─
//     instance.on("seeking", (progress) => {
//       if (stActiveRef.current) {
//         stSeek(progress * instance.getDuration());
//       }
//     });

//     // ── finish ────────────────────────────────────────────────────────────
//     instance.on("finish", () => {
//       dispatch(setIsPlaying(false));
//       if (stActiveRef.current) stPause();
//       onAudioCompleteRef.current?.();
//     });

//     // ── error ─────────────────────────────────────────────────────────────
//     instance.on("error", (error) => {
//       console.error("WaveSurfer error:", error);
//       dispatch(setIsPlaying(false));
//     });

//     // ── hover overlay ────────────────────────────────────────────────────
//     const handlePointerMove = (e: PointerEvent) => {
//       const hover = waveformRef.current?.querySelector("#hover") as HTMLElement | null;
//       if (hover) hover.style.width = `${e.offsetX}px`;
//     };
//     waveformRef.current.addEventListener("pointermove", handlePointerMove);

//     instance.load(audioUrl);

//     return () => {
//       if (intervalRef.current) clearTimeout(intervalRef.current);
//       waveformRef.current?.removeEventListener("pointermove", handlePointerMove);
//       instance.unAll();
//       instance.destroy();
//       setIsInitialized(false);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [audioUrl]);

//   // ─────────────────────────────────────────────────────────────────────────
//   // Late activation: ST buffer finishes loading after WaveSurfer is ready.
//   // Race condition scenario: user opens track with rate < 1.0 but the
//   // SoundTouch fetch completes after the WaveSurfer "ready" event fires.
//   // ─────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!stBufferReady || !isInitialized)      return;
//     if (playbackRateRef.current >= 1.0)        return;
//     if (stActiveRef.current)                   return; // already active

//     const ws = wavesurfer.current;
//     if (!ws) return;

//     const currentTime = ws.getCurrentTime();
//     const isPlaying   = ws.isPlaying();

//     stActiveRef.current = true;
//     ws.setVolume(0);
//     stActivate(currentTime, playbackRateRef.current);
//     stSetVolume(isMutedRef.current ? 0 : volumeRef.current);

//     if (isPlaying) stPlay(currentTime);
//   }, [stBufferReady, isInitialized, stActivate, stSetVolume, stPlay]);

//   // ─────────────────────────────────────────────────────────────────────────
//   // playbackRate changes — switch engine or update tempo live
//   // ─────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!isInitialized || !wavesurfer.current) return;

//     const ws          = wavesurfer.current;
//     const currentTime = ws.getCurrentTime();
//     const isPlaying   = ws.isPlaying();

//     // Keep WaveSurfer's internal rate in sync so its cursor and timeupdate
//     // events remain accurate — the segment engine depends on these
//     ws.setPlaybackRate(playbackRate);

//     if (playbackRate < 1.0) {
//       if (!stActiveRef.current && stIsLoaded()) {
//         // ── First time switching to slow mode ────────────────────────────
//         stActiveRef.current = true;
//         ws.setVolume(0); // mute WaveSurfer; SoundTouch takes over audio output
//         stActivate(currentTime, playbackRate);
//         stSetVolume(isMutedRef.current ? 0 : volumeRef.current);
//         if (isPlaying) stPlay(currentTime);
//       } else if (stActiveRef.current) {
//         // ── Changing speed while already in ST mode (e.g. 0.8 → 0.5) ───
//         stSetTempo(playbackRate);
//       }
//       // If !stIsLoaded(), the late-activation effect above handles it
//     } else {
//       // ── Returning to native 1.0x ─────────────────────────────────────
//       if (stActiveRef.current) {
//         stPause();
//         stDeactivate();
//         stActiveRef.current = false;
//         // Restore WaveSurfer's audio output with the user's volume preference
//         ws.setVolume(isMutedRef.current ? 0 : volumeRef.current);
//       }
//     }
//   }, [
//     playbackRate,
//     isInitialized,
//     stActivate,
//     stDeactivate,
//     stPlay,
//     stPause,
//     stSetTempo,
//     stSetVolume,
//     stIsLoaded,
//   ]);

//   // ─────────────────────────────────────────────────────────────────────────
//   // Volume / mute changes
//   // Route to the correct engine depending on which is active
//   // ─────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!wavesurfer.current || !isInitialized) return;

//     if (stActiveRef.current) {
//       // Keep WaveSurfer silent; control output via the Web Audio GainNode
//       wavesurfer.current.setVolume(0);
//       stSetVolume(isMuted ? 0 : volume);
//     } else {
//       wavesurfer.current.setVolume(isMuted ? 0 : volume);
//     }
//   }, [volume, isMuted, isInitialized, stSetVolume]);

//   return { wavesurfer, isInitialized, isLoading };
// };
