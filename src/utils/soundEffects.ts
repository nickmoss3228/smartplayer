// utils/soundEffects.ts
// Tiny synthesized sound effects via the Web Audio API — no audio assets to
// fetch, no licensing concerns, and cheap enough to fire on every quiz win
// (a handful of oscillators running for under a second).

let sharedCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) sharedCtx = new Ctor();
  return sharedCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  peakGain: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/** Triumphant ascending "horns" fanfare — for passing a full Quiz. */
export function playFanfare(): void {
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      playTone(ctx, freq, now + i * 0.11, 0.45, "sawtooth", 0.12);
    });
  } catch {
    // Best-effort only — never block the UI for a sound effect.
  }
}

/** Short, pleasant two-note chime — for finishing a VocabQuiz round. */
export function playChime(): void {
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    playTone(ctx, 880, now, 0.3, "sine", 0.15);
    playTone(ctx, 1318.5, now + 0.09, 0.4, "sine", 0.13);
  } catch {
    // Best-effort only.
  }
}
