/**
 * «Повтори за мной»: the student's sentences, joined into one track to play
 * back at the end of a part. Plain PCM in, a WAV blob out — no codecs, so it
 * behaves the same in every browser.
 *
 * Everything here stays on the device; nothing is uploaded.
 */

/** One sentence as the student said it, and where the original sits in the part. */
export interface Take {
  /** The sentence's marker index. */
  index: number;
  samples: Float32Array;
  sampleRate: number;
  /** The original sentence in the part's audio, in seconds. */
  start: number;
  end: number;
}

const FRAME_SEC = 0.02;

/**
 * Cut the silence before and after the speech: the student's thinking time
 * before, and the pause that told the player they had finished, after.
 * Null when there is no speech at all.
 */
export function trimToSpeech(
  samples: Float32Array,
  sampleRate: number,
  thresholdDb: number,
  padBeforeSec = 0.15,
  padAfterSec = 0.25,
): Float32Array | null {
  const frame = Math.max(1, Math.round(sampleRate * FRAME_SEC));
  let first = -1;
  let last = -1;
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let sum = 0;
    for (let j = i; j < i + frame; j++) sum += samples[j] * samples[j];
    const db = 20 * Math.log10(Math.sqrt(sum / frame) + 1e-9);
    if (db >= thresholdDb) {
      if (first < 0) first = i;
      last = i + frame;
    }
  }
  if (first < 0) return null;
  const from = Math.max(0, first - Math.round(padBeforeSec * sampleRate));
  const to = Math.min(samples.length, last + Math.round(padAfterSec * sampleRate));
  return samples.slice(from, to);
}

/**
 * Bring a quiet take up to a comfortable level — but by at most `maxGain`, so
 * a whisper in a noisy room doesn't turn into mostly noise.
 */
export function normalize(samples: Float32Array, peak = 0.85, maxGain = 8): Float32Array {
  let max = 0;
  for (let i = 0; i < samples.length; i++) max = Math.max(max, Math.abs(samples[i]));
  if (max === 0) return samples;
  const gain = Math.min(maxGain, peak / max);
  return samples.map((s) => s * gain);
}

/** Pieces end to end with `gapSec` of silence between them. */
export function joinWithGaps(pieces: Float32Array[], sampleRate: number, gapSec: number): Float32Array {
  const gap = Math.round(gapSec * sampleRate);
  const length = pieces.reduce((n, p) => n + p.length, 0) + gap * Math.max(0, pieces.length - 1);
  const out = new Float32Array(length);
  let at = 0;
  pieces.forEach((p, i) => {
    out.set(p, at);
    at += p.length + (i < pieces.length - 1 ? gap : 0);
  });
  return out;
}

/** A mono slice of an AudioBuffer-like source, channels averaged. */
export function sliceMono(
  channels: Float32Array[],
  sampleRate: number,
  startSec: number,
  endSec: number,
): Float32Array {
  const from = Math.max(0, Math.floor(startSec * sampleRate));
  const to = Math.min(channels[0]?.length ?? 0, Math.ceil(endSec * sampleRate));
  const out = new Float32Array(Math.max(0, to - from));
  for (const ch of channels) for (let i = 0; i < out.length; i++) out[i] += ch[from + i] / channels.length;
  return out;
}

/** 16-bit mono PCM WAV. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** The student alone: every sentence in order, a short breath between them. */
export function studentTrack(takes: Take[]): Float32Array {
  const ordered = [...takes].sort((a, b) => a.index - b.index);
  return joinWithGaps(ordered.map((t) => normalize(t.samples)), ordered[0]?.sampleRate ?? 48000, 0.35);
}

/**
 * The narrator, then the student, sentence by sentence — the way the part
 * was practised. `original` must be at the takes' sample rate.
 */
export function dialogueTrack(takes: Take[], original: Float32Array[]): Float32Array {
  const ordered = [...takes].sort((a, b) => a.index - b.index);
  const rate = ordered[0]?.sampleRate ?? 48000;
  const pieces: Float32Array[] = [];
  ordered.forEach((t, i) => {
    pieces.push(sliceMono(original, rate, t.start, t.end));
    pieces.push(new Float32Array(Math.round(0.25 * rate)));
    pieces.push(normalize(t.samples));
    if (i < ordered.length - 1) pieces.push(new Float32Array(Math.round(0.45 * rate)));
  });
  return joinWithGaps(pieces, rate, 0);
}
