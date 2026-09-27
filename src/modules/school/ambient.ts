// modules/school/ambient.ts
//
// The school's background music, made live in the browser rather than played
// from a file. Three voices over one slow chord loop:
//
//   • a pad — two detuned oscillators per chord tone through a lowpass, so it
//     reads as a warm wash rather than as a synth;
//   • a music box — sparse bell notes wandering over a pentatonic scale, which
//     is what makes it a melody without ever becoming a tune you notice;
//   • a soft bass on the first beat of each bar.
//
// Everything goes through one feedback delay for space and one master gain for
// the fades. No samples, nothing to license, and it never loops exactly — the
// melody is a random walk, so twenty minutes in it is still not repeating.
//
// There are two scores. By day, the one above. At night by the school clock
// (schoolClock.ts) a slower lullaby takes over: a minor key, lower bells, a
// darker pad, no bass pulse, and now and then a cricket. The swap waits for the
// next chord change, so the old chord's pad is still ringing out as the new
// one comes in and there is no seam to hear.
//
// Browsers refuse to start audio without a gesture. `start()` therefore answers
// whether it actually got going, and `useAmbientMusic` below keeps a remembered
// "on" waiting for the first tap anywhere rather than pretending it is playing.

import { useCallback, useEffect, useRef, useState } from "react";

const STEPS_PER_BAR = 8;
/** Each chord holds for two bars. */
const STEPS_PER_CHORD = STEPS_PER_BAR * 2;
const VOLUME = 0.2;
const FADE = 1.4;
const LOOKAHEAD = 0.35;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export type MusicMood = "day" | "night";

interface Score {
  tempo: number;
  chords: { root: number; tones: number[] }[];
  /** No semitones in either scale, so no two notes of the music box can ever
   *  clash with each other or with the pad. */
  scale: number[];
  /** Chance of a bell note on the beat, and off it. */
  bells: [number, number];
  bellLevel: number;
  padLevel: number;
  padCutoff: number;
  /** Zero for no bass at all. */
  bassLevel: number;
  echo: number;
  crickets: boolean;
}

const SCORES: Record<MusicMood, Score> = {
  // Cmaj9 → Am7 → Fmaj7 → G6. Nothing in it resolves hard, which is what lets
  // it sit under a game for an hour without pulling focus. C major pentatonic
  // across two octaves for the music box.
  day: {
    tempo: 64,
    chords: [
      { root: 36, tones: [60, 64, 67, 71, 74] },
      { root: 33, tones: [57, 60, 64, 67] },
      { root: 29, tones: [57, 60, 64, 65] },
      { root: 31, tones: [59, 62, 64, 67] },
    ],
    scale: [72, 74, 76, 79, 81, 84, 86, 88, 91, 93],
    bells: [0.42, 0.14],
    bellLevel: 0.11,
    padLevel: 0.028,
    padCutoff: 900,
    bassLevel: 0.07,
    echo: 0.32,
    crickets: false,
  },
  // Am9 → Fmaj7 → Cmaj7 → Em7, slower and an octave lower, with A minor
  // pentatonic bells that come half as often.
  night: {
    tempo: 52,
    chords: [
      { root: 33, tones: [57, 60, 64, 67, 71] },
      { root: 29, tones: [53, 57, 60, 64] },
      { root: 36, tones: [55, 60, 64, 71] },
      { root: 28, tones: [55, 59, 62, 64] },
    ],
    scale: [64, 67, 69, 72, 74, 76, 79, 81, 84, 86],
    bells: [0.24, 0.05],
    bellLevel: 0.085,
    padLevel: 0.024,
    padCutoff: 620,
    bassLevel: 0,
    echo: 0.44,
    crickets: true,
  },
};

/** One eighth note, in seconds. The whole score is on this grid. */
const stepOf = (score: Score) => 60 / score.tempo / 2;

export class AmbientMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private melody = 3;
  private stopTimer: number | null = null;
  private wanted = false;
  private score: Score = SCORES.day;
  private nextScore: Score | null = null;
  private delay: DelayNode | null = null;
  private feedback: GainNode | null = null;

  /** Day or night. Takes effect at the next chord change. */
  setMood(mood: MusicMood) {
    const want = SCORES[mood];
    this.nextScore = want === this.score ? null : want;
  }

  get running(): boolean {
    return this.wanted && this.ctx?.state === "running";
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Everything plays into `bus`, which feeds the master directly and through
    // a darkened feedback delay — a cheap room that keeps single bell notes from
    // sounding like they were played in a cupboard.
    const bus = ctx.createGain();
    bus.connect(master);
    const delay = ctx.createDelay(2);
    delay.delayTime.value = stepOf(this.score) * 3;
    const feedback = ctx.createGain();
    feedback.gain.value = this.score.echo;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 1800;
    bus.connect(delay);
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);
    tone.connect(master);

    this.ctx = ctx;
    this.master = master;
    this.bus = bus;
    this.delay = delay;
    this.feedback = feedback;
    return ctx;
  }

  /** Fades in. Resolves true only if the browser actually let audio start. */
  async start(): Promise<boolean> {
    const ctx = this.ensure();
    if (!ctx || !this.master) return false;
    this.wanted = true;
    if (this.stopTimer !== null) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    try {
      // A resume() blocked by autoplay policy can stay pending forever rather
      // than rejecting, so it gets a deadline.
      await Promise.race([ctx.resume(), new Promise((r) => window.setTimeout(r, 400))]);
    } catch {
      /* reported through ctx.state below */
    }
    if (ctx.state !== "running") return false;

    const now = ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(VOLUME, now + FADE);

    if (this.timer === null) {
      this.nextTime = now + 0.1;
      this.timer = window.setInterval(() => this.schedule(), 120);
      this.schedule();
    }
    return true;
  }

  /** Fades out, then parks the context so it costs nothing while silent. */
  stop() {
    this.wanted = false;
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + FADE);
    if (this.stopTimer !== null) window.clearTimeout(this.stopTimer);
    this.stopTimer = window.setTimeout(() => {
      this.stopTimer = null;
      if (this.wanted) return;
      if (this.timer !== null) {
        window.clearInterval(this.timer);
        this.timer = null;
      }
      ctx.suspend().catch(() => {});
    }, FADE * 1000 + 100);
  }

  /** Hidden tab: stop the clock outright, no fade, and pick up where it was. */
  pause() {
    this.ctx?.suspend().catch(() => {});
  }

  resume() {
    if (this.wanted) this.ctx?.resume().catch(() => {});
  }

  dispose() {
    this.wanted = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    if (this.stopTimer !== null) window.clearTimeout(this.stopTimer);
    this.timer = null;
    this.stopTimer = null;
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.master = null;
    this.bus = null;
    this.delay = null;
    this.feedback = null;
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    // After a long suspend the clock has moved on without us; skip ahead rather
    // than firing every missed note at once.
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      // A change of mood waits for a chord change: the old pad is still
      // fading out as the new one comes in, which is the whole crossfade.
      if (this.nextScore && this.step % STEPS_PER_CHORD === 0) this.swapScore(this.nextTime);
      this.playStep(this.step, this.nextTime);
      this.step += 1;
      this.nextTime += stepOf(this.score);
    }
  }

  private swapScore(t: number) {
    this.score = this.nextScore!;
    this.nextScore = null;
    // Start the new score from its first chord.
    this.step = 0;
    this.melody = Math.min(this.melody, this.score.scale.length - 1);
    this.delay?.delayTime.setTargetAtTime(stepOf(this.score) * 3, t, 0.5);
    this.feedback?.gain.setTargetAtTime(this.score.echo, t, 0.5);
  }

  private playStep(step: number, t: number) {
    const score = this.score;
    const chord = score.chords[Math.floor(step / STEPS_PER_CHORD) % score.chords.length];
    const inChord = step % STEPS_PER_CHORD;
    const beat = stepOf(score);

    if (inChord === 0) {
      const hold = beat * STEPS_PER_CHORD;
      for (const n of chord.tones.slice(0, 4)) this.pad(midi(n), t, hold);
    }
    if (score.bassLevel > 0 && step % STEPS_PER_BAR === 0) this.bass(midi(chord.root), t);

    // The music box: more likely on the beat than off it, and never on every
    // step. The gaps are most of what makes it restful.
    const onBeat = step % 2 === 0;
    if (Math.random() < (onBeat ? score.bells[0] : score.bells[1])) {
      const move = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
      this.melody = Math.max(0, Math.min(score.scale.length - 1, this.melody + move));
      this.bell(midi(score.scale[this.melody]), t, onBeat ? score.bellLevel : score.bellLevel * 0.64);
    }

    // Now and then, far off, a cricket.
    if (score.crickets && Math.random() < 0.035) this.cricket(t + Math.random() * beat);
  }

  private pad(freq: number, t: number, hold: number) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = this.score.padCutoff;
    const level = this.score.padLevel;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(level, t + 2.2);
    env.gain.setValueAtTime(level, t + hold - 0.4);
    env.gain.linearRampToValueAtTime(0, t + hold + 2.4);
    filter.connect(env);
    env.connect(this.bus!);
    for (const [type, detune] of [
      ["sine", -6],
      ["triangle", 7],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + hold + 2.6);
    }
  }

  private bell(freq: number, t: number, level: number) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(level, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0005, t + 1.8);
    env.connect(this.bus!);
    // A fundamental plus a quiet partial a little over two octaves up: that
    // inharmonic top is the difference between a bell and a beep.
    for (const [mult, gain, type] of [
      [1, 1, "triangle"],
      [4.2, 0.12, "sine"],
    ] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq * mult;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(env);
      osc.start(t);
      osc.stop(t + 1.9);
    }
  }

  private bass(freq: number, t: number) {
    const ctx = this.ctx!;
    const ring = stepOf(this.score) * 7;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(this.score.bassLevel, t + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0005, t + ring);
    env.connect(this.bus!);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(env);
    osc.start(t);
    osc.stop(t + ring + 0.1);
  }

  /** Three quick, very quiet chirps high up: a cricket in the yard. Straight
   *  to the master, not through the echo, which would turn it into a swarm. */
  private cricket(t: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 4200 + Math.random() * 500;
    const env = ctx.createGain();
    env.gain.value = 0;
    for (let i = 0; i < 3; i++) {
      const at = t + i * 0.07;
      env.gain.setValueAtTime(0, at);
      env.gain.linearRampToValueAtTime(0.006, at + 0.012);
      env.gain.linearRampToValueAtTime(0, at + 0.045);
    }
    osc.connect(env);
    env.connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

// ── React side ──────────────────────────────────────────────────────────────

const PREF_KEY = "school.music";

const readPref = (): boolean => {
  try {
    return localStorage.getItem(PREF_KEY) === "on";
  } catch {
    return false;
  }
};

const writePref = (on: boolean) => {
  try {
    localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    /* a private window just forgets — the toggle still works */
  }
};

/**
 * The music toggle's state. `playing` is what is actually audible, not what
 * was asked for: a remembered "on" that the browser has not yet allowed shows
 * as off, and starts on the first tap anywhere on the page.
 */
export function useAmbientMusic(mood: MusicMood = "day") {
  const engine = useRef<AmbientMusic | null>(null);
  const [playing, setPlaying] = useState(false);
  const wanted = useRef(readPref());
  const moodRef = useRef(mood);
  moodRef.current = mood;

  const getEngine = () => {
    if (!engine.current) {
      engine.current = new AmbientMusic();
      engine.current.setMood(moodRef.current);
    }
    return engine.current;
  };

  useEffect(() => {
    engine.current?.setMood(mood);
  }, [mood]);

  const toggle = useCallback(async () => {
    const e = getEngine();
    if (wanted.current && e.running) {
      wanted.current = false;
      writePref(false);
      e.stop();
      setPlaying(false);
      return;
    }
    wanted.current = true;
    writePref(true);
    setPlaying(await e.start());
  }, []);

  useEffect(() => {
    // A remembered "on": try now, and if the browser says no, wait for the
    // first gesture instead of silently dropping the preference.
    let armed = false;
    const disarm = () => {
      if (armed) window.removeEventListener("pointerdown", onGesture);
      armed = false;
    };
    const onGesture = async (ev: PointerEvent) => {
      // The toggle itself is a gesture too, and its own click handler decides
      // what that tap means — starting here as well would have it switch the
      // music on and straight back off.
      if ((ev.target as Element | null)?.closest?.("[data-music-toggle]")) {
        disarm();
        return;
      }
      if (!wanted.current || getEngine().running) {
        disarm();
        return;
      }
      if (await getEngine().start()) {
        disarm();
        setPlaying(true);
      }
    };
    if (wanted.current) {
      getEngine()
        .start()
        .then((ok) => {
          setPlaying(ok);
          if (!ok && wanted.current) {
            armed = true;
            window.addEventListener("pointerdown", onGesture);
          }
        });
    }

    const onVisibility = () => {
      if (!engine.current) return;
      if (document.hidden) engine.current.pause();
      else engine.current.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      disarm();
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  return { playing, toggle };
}
