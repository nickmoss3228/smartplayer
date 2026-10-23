import { useCallback, useEffect, useRef, useState } from "react";
import {
  VoiceGate,
  fallbackWaitMs,
  levelDb,
  type VoiceGateState,
} from "../../../modules/repeatMode/voiceGate";
import {
  dialogueTrack,
  encodeWav,
  studentTrack,
  trimToSpeech,
  type Take,
} from "../../../modules/repeatMode/takes";

/**
 * «Повтори за мной»: after each sentence the player stops and waits for the
 * student to say it back, then plays the next one.
 *
 * With the microphone it waits as long as it takes — until it has heard the
 * student speak and go quiet (modules/repeatMode/voiceGate.ts), and keeps
 * what they said, sentence by sentence, to play back as one track at the end
 * of the part (modules/repeatMode/takes.ts) — in memory only, never sent
 * anywhere, gone with the part. Without the microphone (refused, or no browser
 * support) it waits a fixed time instead, from the sentence's length.
 *
 * The segment engine calls `waitForRepeat` when a sentence ends; it resolves
 * true to play on, false when the wait was called off (the student pressed
 * play or turned the mode off), in which case the engine does nothing.
 */

export type RepeatPhase =
  | "off"
  | "idle" // on, paused, nothing to wait for
  | "listen" // a sentence is playing
  | "wait" // waiting for the student, microphone open
  | "hear" // the student is speaking
  | "count" // waiting a fixed time, no microphone
  | "next"; // said — a beat of «Хорошо, дальше» before the next sentence

export type MicState = "asking" | "on" | "off";

/** How long «Хорошо, дальше» stays before the next sentence plays. */
const NEXT_MS = 700;
/** Measured right after the microphone opens, to learn the room. */
const CALIBRATE_MS = 350;
/** Longer than the engine's 1 s gap between repeats of a sentence. */
const IDLE_AFTER_MS = 1500;
/** Sample rate of a shared recording (buildShareWav). */
const SHARE_RATE = 22050;

interface Pending {
  resolve: (go: boolean) => void;
  timer: number | null;
}

/** The sentence just played: its marker index and where it sits in the part. */
export interface RepeatSentence {
  index: number;
  start: number;
  end: number;
}

export const useRepeatMode = ({
  isPlaying,
  resetKey,
  partKey,
}: {
  isPlaying: boolean;
  /** Changes when the player is left — drops the wait in progress. */
  resetKey: string;
  /** Changes with the part — also drops the student's recording. */
  partKey: string;
}) => {
  const [enabled, setEnabled] = useState(false);
  const [mic, setMic] = useState<MicState>("off");
  const [waitPhase, setWaitPhase] = useState<"wait" | "hear" | "count" | "next" | null>(null);
  /** The fixed wait in progress, for the countdown bar; `id` is new per wait. */
  const [count, setCount] = useState({ ms: 0, id: 0 });

  /** 0–1, how far above the room the student is — read by the level bars every frame. */
  const levelRef = useRef(0);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const gateRef = useRef(new VoiceGate());
  const pendingRef = useRef<Pending | null>(null);
  const listeningRef = useRef(false); // the gate is being fed
  const enabledRef = useRef(false);

  // ── The student's sentences, kept for the playback at the end ──────────
  // Raw samples from the microphone while waiting, one take per sentence; a
  // sentence said again replaces its take. In memory only, never uploaded.
  const capturingRef = useRef(false);
  const chunksRef = useRef<Float32Array[]>([]);
  const waitInfoRef = useRef<RepeatSentence | null>(null);
  const takesRef = useRef(new Map<number, Take>());
  const [takeCount, setTakeCount] = useState(0);
  const originalRef = useRef<{ url: string; rate: number; channels: Promise<Float32Array[]> } | null>(null);

  const stopCapture = useCallback((keep: boolean) => {
    if (!capturingRef.current) return;
    capturingRef.current = false;
    const chunks = chunksRef.current;
    chunksRef.current = [];
    const info = waitInfoRef.current;
    const ctx = ctxRef.current;
    if (!keep || !info || !ctx || !chunks.length) return;
    const all = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
    let at = 0;
    for (const c of chunks) {
      all.set(c, at);
      at += c.length;
    }
    const speech = trimToSpeech(all, ctx.sampleRate, gateRef.current.threshold);
    if (!speech) return;
    takesRef.current.set(info.index, { ...info, samples: speech, sampleRate: ctx.sampleRate });
    setTakeCount(takesRef.current.size);
  }, []);

  const settle = useCallback(
    (go: boolean) => {
      const pending = pendingRef.current;
      if (!pending) return;
      pendingRef.current = null;
      listeningRef.current = false;
      stopCapture(go);
      if (pending.timer !== null) window.clearTimeout(pending.timer);
      setWaitPhase(null);
      pending.resolve(go);
    },
    [stopCapture],
  );

  /** «Хорошо, дальше» for a beat, then play on. */
  const finish = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    listeningRef.current = false;
    stopCapture(true);
    if (pending.timer !== null) window.clearTimeout(pending.timer);
    setWaitPhase("next");
    pending.timer = window.setTimeout(() => settle(true), NEXT_MS);
  }, [settle, stopCapture]);

  const stopMic = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    levelRef.current = 0;
  }, []);

  const startMic = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") return false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      return false;
    }
    // Turned off while the browser was asking.
    if (!enabledRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return false;
    }
    streamRef.current = stream;
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    // Only the speech band: no rumble, no hiss.
    const highpass = new BiquadFilterNode(ctx, { type: "highpass", frequency: 120 });
    const lowpass = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 4000 });
    const analyser = new AnalyserNode(ctx, { fftSize: 1024 });
    source.connect(highpass).connect(lowpass).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);

    // The take is the unfiltered voice. ScriptProcessorNode is deprecated but
    // is the one way to read samples that needs no worklet file and runs in
    // every browser, Safari included; it only fires when wired to the output,
    // hence the silent gain.
    const capture = ctx.createScriptProcessor(4096, 1, 1);
    const mute = new GainNode(ctx, { gain: 0 });
    source.connect(capture).connect(mute).connect(ctx.destination);
    capture.onaudioprocess = (event) => {
      if (capturingRef.current) chunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };
    // Created after the permission prompt, so possibly without a user gesture.
    void ctx.resume().catch(() => {});

    const startedAt = performance.now();
    const calibration: number[] = [];
    let calibrated = false;
    let last = startedAt;
    let lastState: VoiceGateState = "waiting";

    const tick = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      analyser.getFloatTimeDomainData(samples);
      const db = levelDb(samples);
      const gate = gateRef.current;

      if (!calibrated) {
        calibration.push(db);
        if (now - startedAt >= CALIBRATE_MS) {
          gate.calibrate(calibration);
          calibrated = true;
        }
      }
      levelRef.current = Math.min(1, Math.max(0, (db - gate.floorDb) / 30));

      if (listeningRef.current && calibrated) {
        const state = gate.push(db, dt);
        if (state === "done") finish();
        // Only on a change: this runs every frame.
        else if (state !== lastState) setWaitPhase(state === "hearing" ? "hear" : "wait");
        lastState = state;
      } else {
        lastState = "waiting";
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return true;
  }, [finish]);

  const enable = useCallback(async () => {
    enabledRef.current = true;
    setEnabled(true);
    setMic("asking");
    const ok = await startMic();
    if (enabledRef.current) setMic(ok ? "on" : "off");
  }, [startMic]);

  const disable = useCallback(() => {
    enabledRef.current = false;
    setEnabled(false);
    setMic("off");
    settle(false);
    stopMic();
  }, [settle, stopMic]);

  const toggle = useCallback(() => {
    if (enabledRef.current) disable();
    else void enable();
  }, [enable, disable]);

  const micRef = useRef(mic);
  micRef.current = mic;

  /** Called by the segment engine when a sentence has finished playing. */
  const waitForRepeat = useCallback(
    (segmentSeconds: number, sentence?: RepeatSentence) =>
      new Promise<boolean>((resolve) => {
        settle(false); // one wait at a time
        if (!enabledRef.current) return resolve(true);
        const pending: Pending = { resolve, timer: null };
        pendingRef.current = pending;
        if (micRef.current === "on") {
          gateRef.current.start(segmentSeconds);
          listeningRef.current = true;
          if (sentence) {
            waitInfoRef.current = sentence;
            chunksRef.current = [];
            capturingRef.current = true;
          }
          setWaitPhase("wait");
        } else {
          const ms = fallbackWaitMs(segmentSeconds);
          setCount((prev) => ({ ms, id: prev.id + 1 }));
          setWaitPhase("count");
          // No «Хорошо, дальше» here: nothing was heard to answer to.
          pending.timer = window.setTimeout(() => settle(true), ms);
        }
      }),
    [settle],
  );

  /** «Дальше»: stop waiting and play the next sentence now. */
  const skip = useCallback(() => {
    if (pendingRef.current) settle(true);
  }, [settle]);

  // The student pressed play themselves: that is their answer.
  useEffect(() => {
    if (isPlaying && pendingRef.current) settle(false);
  }, [isPlaying, settle]);

  // Leaving the player: whatever it was waiting for is gone.
  useEffect(() => {
    settle(false);
  }, [resetKey, settle]);

  // A new part starts a new recording.
  useEffect(() => {
    takesRef.current = new Map();
    setTakeCount(0);
  }, [partKey]);

  /**
   * The part as the student said it, as a WAV object URL (the caller revokes
   * it): "me" is the student alone, "dialogue" puts the narrator's sentence
   * before each of theirs. The original is fetched again (it is in the HTTP
   * cache by now) and decoded at the takes' rate, because WaveSurfer keeps
   * only a low-rate copy for drawing.
   */
  const loadOriginal = useCallback((audioUrl: string, rate: number) => {
    const cached = originalRef.current;
    if (cached && cached.url === audioUrl && cached.rate === rate) return cached.channels;
    const channels = (async () => {
      const bytes = await (await fetch(audioUrl)).arrayBuffer();
      const buffer = await new OfflineAudioContext(1, 1, rate).decodeAudioData(bytes);
      return Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    })();
    originalRef.current = { url: audioUrl, rate, channels };
    // A failed load is not kept, so the next try fetches again.
    channels.catch(() => {
      if (originalRef.current?.channels === channels) originalRef.current = null;
    });
    return channels;
  }, []);

  /**
   * Start fetching and decoding the original as soon as there is a take, so
   * «Диктор и я» is ready by the end of the part instead of after it.
   */
  const preloadOriginal = useCallback(
    (audioUrl: string) => {
      const rate = takesRef.current.values().next().value?.sampleRate;
      if (rate) loadOriginal(audioUrl, rate).catch(() => {});
    },
    [loadOriginal],
  );

  const buildSamples = useCallback(
    async (kind: "me" | "dialogue", audioUrl: string): Promise<{ samples: Float32Array; rate: number } | null> => {
      const takes = [...takesRef.current.values()];
      if (!takes.length) return null;
      const rate = takes[0].sampleRate;
      if (kind === "me") return { samples: studentTrack(takes), rate };
      const channels = await loadOriginal(audioUrl, rate);
      return { samples: dialogueTrack(takes, channels), rate };
    },
    [loadOriginal],
  );

  const buildTrack = useCallback(
    async (kind: "me" | "dialogue", audioUrl: string): Promise<string | null> => {
      const track = await buildSamples(kind, audioUrl);
      return track ? URL.createObjectURL(encodeWav(track.samples, track.rate)) : null;
    },
    [buildSamples],
  );

  /**
   * The same track for a share link, at 22.05 kHz: still clear for a voice,
   * and a quarter of the 48 kHz size to upload (about 2.6 MB a minute).
   */
  const buildShareWav = useCallback(
    async (kind: "me" | "dialogue", audioUrl: string): Promise<Blob | null> => {
      const track = await buildSamples(kind, audioUrl);
      if (!track) return null;
      const length = Math.ceil((track.samples.length * SHARE_RATE) / track.rate);
      const offline = new OfflineAudioContext(1, length, SHARE_RATE);
      const buffer = offline.createBuffer(1, track.samples.length, track.rate);
      buffer.copyToChannel(track.samples, 0);
      const source = offline.createBufferSource();
      source.buffer = buffer;
      source.connect(offline.destination);
      source.start();
      const rendered = await offline.startRendering();
      return encodeWav(rendered.getChannelData(0), SHARE_RATE);
    },
    [buildSamples],
  );

  useEffect(
    () => () => {
      enabledRef.current = false;
      settle(false);
      stopMic();
    },
    [settle, stopMic],
  );

  // The engine pauses for a moment between a sentence's repeats (×2, ×3);
  // only a pause that lasts is the student's, and only then is it «idle».
  const [pausedLong, setPausedLong] = useState(true);
  useEffect(() => {
    if (isPlaying) {
      setPausedLong(false);
      return;
    }
    const id = window.setTimeout(() => setPausedLong(true), IDLE_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [isPlaying]);

  const phase: RepeatPhase = !enabled
    ? "off"
    : waitPhase ?? (isPlaying || !pausedLong ? "listen" : "idle");

  return {
    enabled,
    mic,
    phase,
    count,
    levelRef,
    toggle,
    skip,
    waitForRepeat,
    takeCount,
    buildTrack,
    buildShareWav,
    preloadOriginal,
  };
};
