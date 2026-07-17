// import { useState, useRef, useEffect, useCallback } from "react";
// import { SoundTouch, SimpleFilter, getWebAudioNode } from "soundtouchjs";

// // ─────────────────────────────────────────────────────────────────────────────
// // Local buffer source
// // Defined here so we never depend on the optional WebAudioBufferSource export.
// // SimpleFilter expects interleaved stereo frames [L0, R0, L1, R1, …].
// // ─────────────────────────────────────────────────────────────────────────────
// class STBufferSource {
//   private readonly left:  Float32Array;
//   private readonly right: Float32Array;

//   constructor(buffer: AudioBuffer) {
//     this.left  = buffer.getChannelData(0);
//     // Mono files → duplicate the single channel into both slots
//     this.right = buffer.numberOfChannels > 1
//       ? buffer.getChannelData(1)
//       : buffer.getChannelData(0);
//   }

//   extract(target: Float32Array, numFrames: number, position: number): number {
//     const available = this.left.length - position;
//     const toCopy    = Math.min(numFrames, Math.max(0, available));

//     for (let i = 0; i < toCopy; i++) {
//       target[i * 2]     = this.left[position + i];
//       target[i * 2 + 1] = this.right[position + i];
//     }

//     return toCopy;
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // One engine bundle per active play session.
// // ScriptProcessorNode cannot be "rewound" — we always rebuild on play/seek.
// // ─────────────────────────────────────────────────────────────────────────────
// interface STEngine {
//   soundTouch: SoundTouch;
//   filter:     SimpleFilter;
//   node:       ScriptProcessorNode;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Public interface — mirrors the old PitchSifter surface exactly so
// // useWavesurferInit needs zero changes.
// // ─────────────────────────────────────────────────────────────────────────────
// export interface SoundTouchControls {
//   /**
//    * Flips to true once the AudioBuffer is decoded.
//    * React state so callers can use it in useEffect dependency arrays.
//    */
//   bufferReady: boolean;

//   /** Mark SoundTouch as the active engine and store the initial tempo */
//   activate:   (fromTime: number, tempo: number) => void;
//   /** Hand audio output back to WaveSurfer's native path */
//   deactivate: () => void;
//   /** Build a fresh engine and start playing from fromTime (seconds) */
//   play:       (fromTime: number) => void;
//   /** Pause and snapshot the current playhead position */
//   pause:      () => void;
//   /** Seek to toTime; if playing, restarts immediately from that position */
//   seek:       (toTime: number) => void;
//   /** Hot-swap tempo on the running engine — no rebuild required */
//   setTempo:   (tempo: number) => void;
//   /** Set the Web Audio GainNode value (0 = silent, 1 = full) */
//   setVolume:  (gain: number) => void;
//   /** True when SoundTouch is the active engine */
//   isActive:   () => boolean;
//   /** True when the AudioBuffer has been decoded */
//   isLoaded:   () => boolean;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Hook
// // ─────────────────────────────────────────────────────────────────────────────
// export const useSoundTouchPlayback = (audioUrl: string): SoundTouchControls => {
//   // ── Web Audio graph ──────────────────────────────────────────────────────
//   const audioCtxRef = useRef<AudioContext | null>(null);
//   const gainNodeRef = useRef<GainNode | null>(null);
//   const engineRef   = useRef<STEngine | null>(null);
//   const bufferRef   = useRef<AudioBuffer | null>(null);

//   // ── Engine state — refs only, no re-renders from audio ops ──────────────
//   const isActiveRef  = useRef(false);
//   const isLoadedRef  = useRef(false);
//   const isPlayingRef = useRef(false);
//   const tempoRef     = useRef(1.0);

//   /**
//    * Position tracking via the AudioContext clock.
//    * More reliable than counting ScriptProcessor frames, which can stall
//    * when the tab is backgrounded.
//    */
//   const ctxStartTimeRef = useRef(0); // ctx.currentTime when last play() fired
//   const posAtStartRef   = useRef(0); // audio-seconds at that exact moment

//   // ── React state used only as a dep-trigger for external effects ──────────
//   const [bufferReady, setBufferReady] = useState(false);

//   // ─── Lazy AudioContext creation ───────────────────────────────────────────
//   const ensureCtx = useCallback((): AudioContext => {
//     if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
//       const ctx  = new AudioContext();
//       const gain = ctx.createGain();
//       gain.connect(ctx.destination);
//       audioCtxRef.current = ctx;
//       gainNodeRef.current = gain;
//     }
//     return audioCtxRef.current;
//   }, []);

//   // ─── Current playhead position in audio-seconds ───────────────────────────
//   const getCurrentTime = useCallback((): number => {
//     if (!isPlayingRef.current || !audioCtxRef.current) {
//       return posAtStartRef.current;
//     }
//     const elapsed = audioCtxRef.current.currentTime - ctxStartTimeRef.current;
//     // At tempo 0.75 → 0.75 audio-seconds elapse per real second
//     return posAtStartRef.current + elapsed * tempoRef.current;
//   }, []);

//   // ─── Disconnect and destroy the active engine (position is preserved) ─────
//   const destroyEngine = useCallback(() => {
//     if (engineRef.current) {
//       try { engineRef.current.node.disconnect(); } catch { /* already gone */ }
//       engineRef.current = null;
//     }
//     isPlayingRef.current = false;
//   }, []);

//   // ─── Build a brand-new engine starting at a given sample offset ───────────
//   const buildEngine = useCallback((fromSample: number): STEngine | null => {
//     if (!bufferRef.current || !audioCtxRef.current || !gainNodeRef.current) {
//       return null;
//     }

//     const soundTouch  = new SoundTouch();
//     soundTouch.tempo  = tempoRef.current;
//     soundTouch.pitch  = 1.0; // pitch preservation — the whole point

//     const source = new STBufferSource(bufferRef.current);
//     const filter = new SimpleFilter(source, soundTouch);
//     // Seek to start position before connecting — no audible gap
//     filter.sourcePosition = Math.max(0, fromSample);

//     const node = getWebAudioNode(audioCtxRef.current, filter, 4096);
//     node.connect(gainNodeRef.current);

//     return { soundTouch, filter, node };
//   }, []);

//   // ─── Fetch + decode whenever the URL changes ─────────────────────────────
//   useEffect(() => {
//     if (!audioUrl) return;

//     // Reset everything for the new track
//     isLoadedRef.current   = false;
//     isActiveRef.current   = false;
//     isPlayingRef.current  = false;
//     bufferRef.current     = null;
//     posAtStartRef.current = 0;
//     setBufferReady(false);
//     destroyEngine();

//     let cancelled = false;

//     (async () => {
//       try {
//         const ctx     = ensureCtx();
//         const res     = await fetch(audioUrl);
//         const raw     = await res.arrayBuffer();
//         if (cancelled) return;

//         const decoded = await ctx.decodeAudioData(raw);
//         if (cancelled) return;

//         bufferRef.current   = decoded;
//         isLoadedRef.current = true;
//         setBufferReady(true);
//       } catch (err) {
//         console.warn("[SoundTouch] Buffer load failed:", err);
//       }
//     })();

//     return () => { cancelled = true; };
//   }, [audioUrl, ensureCtx, destroyEngine]);

//   // ─── Cleanup on unmount ───────────────────────────────────────────────────
//   useEffect(() => {
//     return () => {
//       destroyEngine();
//       audioCtxRef.current?.close().catch(() => {});
//       audioCtxRef.current = null;
//       gainNodeRef.current = null;
//     };
//   }, [destroyEngine]);

//   // ─────────────────────────────────────────────────────────────────────────
//   // Public API
//   // All functions close over refs only — safe in WaveSurfer event handlers
//   // and effect dependency arrays without causing stale-closure bugs.
//   // ─────────────────────────────────────────────────────────────────────────

//   const activate = useCallback((fromTime: number, tempo: number) => {
//     tempoRef.current    = tempo;
//     isActiveRef.current = true;
//     ensureCtx(); // warm up on the user gesture that triggered the rate change
//   }, [ensureCtx]);

//   const deactivate = useCallback(() => {
//     destroyEngine();
//     isActiveRef.current = false;
//   }, [destroyEngine]);

//   const play = useCallback((fromTime: number) => {
//     if (!isLoadedRef.current || !isActiveRef.current || !bufferRef.current) return;

//     ensureCtx();
//     destroyEngine(); // ScriptProcessorNode is single-use — always rebuild

//     const fromSample = Math.floor(fromTime * bufferRef.current.sampleRate);
//     const engine     = buildEngine(fromSample);
//     if (!engine) return;

//     engineRef.current = engine;
//     audioCtxRef.current?.resume().catch(() => {}); // unblock suspended context

//     ctxStartTimeRef.current = audioCtxRef.current!.currentTime;
//     posAtStartRef.current   = fromTime;
//     isPlayingRef.current    = true;
//   }, [ensureCtx, destroyEngine, buildEngine]);

//   const pause = useCallback(() => {
//     const captured        = getCurrentTime();
//     destroyEngine();
//     posAtStartRef.current = captured; // remember exact position for next play()
//   }, [getCurrentTime, destroyEngine]);

//   const seek = useCallback((toTime: number) => {
//     if (isPlayingRef.current) {
//       play(toTime); // rebuild and restart from new position
//     } else {
//       posAtStartRef.current = toTime; // remember for next play()
//     }
//   }, [play]);

//   const setTempo = useCallback((tempo: number) => {
//     tempoRef.current = tempo;
//     // Live-update the running DSP — SoundTouch picks it up on the next callback
//     if (engineRef.current) engineRef.current.soundTouch.tempo = tempo;
//   }, []);

//   const setVolume = useCallback((gain: number) => {
//     if (gainNodeRef.current) gainNodeRef.current.gain.value = gain;
//   }, []);

//   const isActive = useCallback(() => isActiveRef.current, []);
//   const isLoaded = useCallback(() => isLoadedRef.current, []);

//   return {
//     bufferReady,
//     activate,
//     deactivate,
//     play,
//     pause,
//     seek,
//     setTempo,
//     setVolume,
//     isActive,
//     isLoaded,
//   };
// };