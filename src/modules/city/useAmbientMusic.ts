// modules/city/useAmbientMusic.ts
//
// Background music without a licensed audio file: a small generative pad
// built from Web Audio oscillators — a soft, slow-breathing chord through a
// lowpass filter, in the spirit of Frutiger Aero's calm/ambient side. No
// asset to source or license, and it starts silent until the player opts in
// (browsers block autoplay with sound before a user gesture anyway).

import { useCallback, useEffect, useRef, useState } from "react";

// C major add9, spread across two octaves and detuned a few cents apart per
// voice so the chord shimmers instead of sitting dead-flat in tune.
const NOTES_HZ = [130.81, 164.81, 196.0, 246.94, 293.66];

interface AmbientEngine {
  ctx: AudioContext;
  master: GainNode;
  voices: { osc: OscillatorNode; gain: GainNode }[];
  lfo: OscillatorNode;
}

export function useAmbientMusic() {
  const [playing, setPlaying] = useState(false);
  const engineRef = useRef<AmbientEngine | null>(null);

  const stopEngine = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const { ctx, master, voices, lfo } = engine;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(0, now, 0.4);
    window.setTimeout(() => {
      voices.forEach((v) => v.osc.stop());
      lfo.stop();
      ctx.close();
    }, 900);
    engineRef.current = null;
  }, []);

  const startEngine = useCallback(() => {
    if (engineRef.current) return;
    const ctx = new AudioContext();

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.3;

    const master = ctx.createGain();
    master.gain.value = 0;
    filter.connect(master);
    master.connect(ctx.destination);

    // Slow shared tremolo so the whole chord breathes together rather than
    // droning at a constant level.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain);
    lfo.start();

    const voices = NOTES_HZ.map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      osc.detune.value = (i - NOTES_HZ.length / 2) * 4;

      const gain = ctx.createGain();
      const level = 0.05 - i * 0.006;
      gain.gain.value = level;
      lfoGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      return { osc, gain };
    });

    master.gain.setTargetAtTime(0.5, ctx.currentTime, 1.2);
    engineRef.current = { ctx, master, voices, lfo };
  }, []);

  const toggle = useCallback(() => {
    setPlaying((prev) => {
      const next = !prev;
      if (next) startEngine();
      else stopEngine();
      return next;
    });
  }, [startEngine, stopEngine]);

  useEffect(() => () => stopEngine(), [stopEngine]);

  return { playing, toggle };
}
