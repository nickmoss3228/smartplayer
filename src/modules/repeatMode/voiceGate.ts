/**
 * «Повтори за мной»: has the student said the sentence back yet?
 *
 * Nothing is recorded and nothing is compared — this only tells speech from
 * silence, from the microphone's loudness, frame by frame. A sentence counts
 * as said once the student has spoken for a while and then gone quiet.
 * There is no time limit: a student who looks away simply keeps the player
 * waiting.
 *
 * The noise floor drops at once to anything quieter and creeps back up
 * slowly, so a fan or a street settles into the floor within seconds while a
 * sentence (much louder, and only a few seconds long) stays above it. It is
 * kept between sentences, so after the first one the gate knows the room.
 */

export type VoiceGateState = "waiting" | "hearing" | "done";

export interface VoiceGateConfig {
  /** Above the floor by this much is speech. */
  marginDb: number;
  /** …and never quieter than this, whatever the floor says. */
  minSpeechDb: number;
  /** Below the threshold by this much is silence (between the two: no change). */
  hysteresisDb: number;
  /** How fast the floor creeps up to a louder room. */
  floorRiseDbPerSec: number;
  /** Speech this long in total before it counts as the student starting. */
  onsetMs: number;
  /** Quiet this long after speech ends the sentence. */
  endSilenceMs: number;
  /** Ignored at the start of a wait: the room's echo of the sentence just played. */
  ignoreMs: number;
}

export const DEFAULT_VOICE_GATE: VoiceGateConfig = {
  marginDb: 12,
  minSpeechDb: -50,
  hysteresisDb: 3,
  floorRiseDbPerSec: 1.5,
  onsetMs: 120,
  endSilenceMs: 700,
  ignoreMs: 250,
};

const FLOOR_MIN_DB = -90;

/**
 * How much speech makes "the sentence": a third of it, within 0.4–1.2 s.
 * Kept low on purpose — a quiet child's words dip under the threshold, and
 * waiting a little too long is worse than moving on a little early.
 */
export const minVoicedMs = (segmentSeconds: number): number =>
  Math.min(1200, Math.max(400, segmentSeconds * 1000 * 0.3));

/**
 * Without a microphone the player waits a fixed time instead: the sentence's
 * own length plus a moment to start, never under 3 s or over 12 s. A 3.4 s
 * sentence (the median on the easy level) gets 4.2 s.
 */
export const fallbackWaitMs = (segmentSeconds: number): number =>
  Math.round(Math.min(12000, Math.max(3000, 800 + segmentSeconds * 1000)));

/** Loudness of one frame of samples, in dBFS. */
export const levelDb = (samples: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  return 20 * Math.log10(rms + 1e-9);
};

export class VoiceGate {
  floorDb: number;
  private config: VoiceGateConfig;
  private elapsedMs = 0;
  private voicedMs = 0;
  private silenceMs = 0;
  private needVoicedMs = 400;
  private heard = false;

  constructor(config: Partial<VoiceGateConfig> = {}, floorDb = -60) {
    this.config = { ...DEFAULT_VOICE_GATE, ...config };
    this.floorDb = floorDb;
  }

  /** Learn the room from a stretch of (presumably) silence. */
  calibrate(levels: number[]): void {
    if (!levels.length) return;
    const sorted = [...levels].sort((a, b) => a - b);
    this.floorDb = Math.max(FLOOR_MIN_DB, sorted[Math.floor(sorted.length / 2)]);
  }

  /** Start waiting for one sentence of this length. The floor is kept. */
  start(segmentSeconds: number): void {
    this.elapsedMs = 0;
    this.voicedMs = 0;
    this.silenceMs = 0;
    this.heard = false;
    this.needVoicedMs = minVoicedMs(segmentSeconds);
  }

  get threshold(): number {
    return Math.max(this.floorDb + this.config.marginDb, this.config.minSpeechDb);
  }

  /** Feed one frame's loudness and how long it lasted. */
  push(db: number, dtMs: number): VoiceGateState {
    const c = this.config;
    this.elapsedMs += dtMs;

    // Instant down, slow up — so speech barely moves it.
    if (db < this.floorDb) this.floorDb = Math.max(FLOOR_MIN_DB, db);
    else this.floorDb += (c.floorRiseDbPerSec * dtMs) / 1000;

    if (this.elapsedMs <= c.ignoreMs) return "waiting";

    const threshold = this.threshold;
    if (db >= threshold) {
      this.voicedMs += dtMs;
      this.silenceMs = 0;
      if (this.voicedMs >= c.onsetMs) this.heard = true;
    } else if (db < threshold - c.hysteresisDb && this.heard) {
      this.silenceMs += dtMs;
    }

    if (this.heard && this.voicedMs >= this.needVoicedMs && this.silenceMs >= c.endSilenceMs) {
      return "done";
    }
    return this.heard ? "hearing" : "waiting";
  }
}
