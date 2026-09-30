// modules/school/sfx.ts
//
// The school's sound effects, made in the browser like the music (ambient.ts):
// no samples, nothing to download, nothing to license.
//
//   • build  — a few hammer knocks, a whoosh while the walls go up, and a
//              little bell arpeggio as the room lands (Arrival.tsx's rise
//              takes about a second, and this is timed to it);
//   • style  — a brush stroke and two bell notes: a new facade or roof;
//   • paint  — just the brush stroke: a new wallpaper, floor or layout;
//   • bell   — the school bell, when the school clock says lessons begin or
//              end;
//   • voice  — a few syllables of cheerful babble when you poke somebody,
//              pitched by who they are: a teacher lower, a student higher,
//              and every person a little different from the next.
//
// Its own AudioContext, separate from the music's, so switching the music off
// (which suspends that context) never silences a knock, and the other way
// round. It is created on the first tap anywhere, which is the gesture
// browsers insist on before any sound at all.

import { useCallback, useEffect, useRef, useState } from "react";

export type SfxName = "build" | "style" | "paint" | "bell";

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Base pitch of each kind of person's voice, in Hz. */
const VOICE_PITCH: Record<string, number> = {
  kid: 470,
  footballer: 400,
  keeper: 380,
  friend: 390,
  arriving: 390,
  walker: 380,
  student: 380,
  performer: 390,
  reader: 370,
  reviser: 370,
  musician: 360,
  listener: 360,
  researcher: 350,
  diner: 390,
  athlete: 340,
  visitor: 320,
  receptionist: 300,
  librarian: 280,
  coach: 250,
  director: 240,
  staff: 230,
  teacher: 220,
  cook: 230,
  head: 195,
  caretaker: 175,
};

const hashOf = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export class SchoolSfx {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  /** Creates the context, or wakes it. Call from inside a gesture. */
  unlock() {
    const ctx = this.ensure();
    if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    const out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(ctx.destination);
    // One second of white noise, reused by every knock and whoosh.
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.ctx = ctx;
    this.out = out;
    this.noise = noise;
    return ctx;
  }

  /** Only plays into a context that is already running: a sound that waits
   *  for a gesture and then goes off late is worse than no sound. */
  private ready(): AudioContext | null {
    const ctx = this.ctx;
    return ctx && ctx.state === "running" ? ctx : null;
  }

  play(name: SfxName) {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    switch (name) {
      case "build":
        [0, 0.17, 0.34, 0.56].forEach((at, i) => this.knock(t + at, [1, 0.85, 1.1, 0.95][i]));
        this.whoosh(t + 0.4, 0.75, 0.1);
        [84, 88, 91, 96].forEach((n, i) => this.bell(midi(n), t + 1.15 + i * 0.075, 0.09));
        break;
      case "style":
        this.whoosh(t, 0.28, 0.07);
        this.bell(midi(91), t + 0.18, 0.08);
        this.bell(midi(96), t + 0.27, 0.08);
        break;
      case "paint":
        this.whoosh(t, 0.22, 0.05);
        break;
      case "bell":
        this.schoolBell(t);
        break;
    }
  }

  /** A few syllables of babble. Same person, same voice: the pitch and the
   *  shape of the phrase both come from their key. */
  voice(key: string, role: string) {
    const ctx = this.ready();
    if (!ctx || !this.out) return;
    const h = hashOf(key);
    const base = (VOICE_PITCH[role] ?? 360) * (0.9 + ((h % 1000) / 1000) * 0.22);
    const syllables = 3 + (h % 3);
    let t = ctx.currentTime + 0.02;
    for (let i = 0; i < syllables; i++) {
      // A little tune: up, down, and a lift at the end, as if asking.
      const step = ((h >> (i * 3)) % 7) - 3;
      const lift = i === syllables - 1 ? 3 : 0;
      const f = base * Math.pow(2, (step + lift) / 12);
      const len = 0.065 + ((h >> (i + 5)) % 3) * 0.012;
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.linearRampToValueAtTime(f * 1.06, t + len);
      // A mouth, roughly: a formant band over a soft lowpass.
      const formant = ctx.createBiquadFilter();
      formant.type = "bandpass";
      formant.frequency.value = 900 + ((h >> (i + 2)) % 4) * 250;
      formant.Q.value = 1.4;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.16, t + 0.008);
      env.gain.exponentialRampToValueAtTime(0.001, t + len);
      osc.connect(formant);
      formant.connect(env);
      env.connect(this.out);
      osc.start(t);
      osc.stop(t + len + 0.02);
      t += len + 0.025;
    }
  }

  dispose() {
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.out = null;
    this.noise = null;
  }

  // ── Instruments ───────────────────────────────────────────────────────────

  private noiseSource(t: number, dur: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.start(t, Math.random() * 0.5, dur + 0.05);
    return src;
  }

  /** A hammer on wood: a click of filtered noise over a short, falling thud. */
  private knock(t: number, pitch: number) {
    const ctx = this.ctx!;
    const click = this.noiseSource(t, 0.06);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1300 * pitch;
    band.Q.value = 2.5;
    const clickEnv = ctx.createGain();
    clickEnv.gain.setValueAtTime(0.5, t);
    clickEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    click.connect(band);
    band.connect(clickEnv);
    clickEnv.connect(this.out!);

    const thud = ctx.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(150 * pitch, t);
    thud.frequency.exponentialRampToValueAtTime(60, t + 0.1);
    const thudEnv = ctx.createGain();
    thudEnv.gain.setValueAtTime(0.45, t);
    thudEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    thud.connect(thudEnv);
    thudEnv.connect(this.out!);
    thud.start(t);
    thud.stop(t + 0.14);
  }

  /** Air: noise through a band that sweeps up. A wall going up, a brush on a
   *  wall. */
  private whoosh(t: number, dur: number, level: number) {
    const ctx = this.ctx!;
    const src = this.noiseSource(t, dur);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.2;
    band.frequency.setValueAtTime(350, t);
    band.frequency.exponentialRampToValueAtTime(2600, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(level, t + dur * 0.4);
    env.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(band);
    band.connect(env);
    env.connect(this.out!);
  }

  /** The same bell the music box uses: a fundamental and a quiet inharmonic
   *  partial on top. */
  private bell(freq: number, t: number, level: number) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(level, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0005, t + 1.1);
    env.connect(this.out!);
    for (const [mult, gain] of [
      [1, 1],
      [4.2, 0.14],
    ]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = mult === 1 ? "triangle" : "sine";
      osc.frequency.value = freq * mult;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(env);
      osc.start(t);
      osc.stop(t + 1.2);
    }
  }

  /** An old electric school bell, kept gentle: metal partials rattled by a
   *  fast tremolo for a second and a half. */
  private schoolBell(t: number) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.05, t + 0.03);
    env.gain.setValueAtTime(0.05, t + 1.3);
    env.gain.exponentialRampToValueAtTime(0.0005, t + 1.9);
    const trem = ctx.createGain();
    trem.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 22;
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth);
    depth.connect(trem.gain);
    trem.connect(env);
    env.connect(this.out!);
    for (const [f, g] of [
      [1180, 0.6],
      [1770, 0.35],
      [2650, 0.2],
    ]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.value = g;
      osc.connect(gain);
      gain.connect(trem);
      osc.start(t);
      osc.stop(t + 2);
    }
    lfo.start(t);
    lfo.stop(t + 2);
  }
}

// ── React side ──────────────────────────────────────────────────────────────

const PREF_KEY = "school.sfx";

/** On unless switched off: effects are part of how the game answers a tap. */
const readPref = (): boolean => {
  try {
    return localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
};

const writePref = (on: boolean) => {
  try {
    localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    /* a private window just forgets — the toggle still works */
  }
};

export function useSchoolSfx() {
  const engine = useRef<SchoolSfx | null>(null);
  const [enabled, setEnabled] = useState(readPref);
  const on = useRef(enabled);
  on.current = enabled;

  const getEngine = () => {
    if (!engine.current) engine.current = new SchoolSfx();
    return engine.current;
  };

  useEffect(() => {
    // Every tap is a chance to wake the context. Cheap when it is already
    // running, and it means a sound triggered by a server reply a moment after
    // the tap still has somewhere to play.
    const wake = () => {
      if (on.current) getEngine().unlock();
    };
    window.addEventListener("pointerdown", wake);
    return () => {
      window.removeEventListener("pointerdown", wake);
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !on.current;
    on.current = next;
    writePref(next);
    setEnabled(next);
    if (next) {
      const e = getEngine();
      e.unlock();
      // A small confirmation that it is on — played once the context wakes.
      window.setTimeout(() => e.play("paint"), 60);
    }
  }, []);

  const play = useCallback((name: SfxName) => {
    if (!on.current) return;
    if (name === "bell" && document.hidden) return;
    getEngine().play(name);
  }, []);

  const voice = useCallback((key: string, role: string) => {
    if (!on.current) return;
    getEngine().voice(key, role);
  }, []);

  return { enabled, toggle, play, voice };
}
