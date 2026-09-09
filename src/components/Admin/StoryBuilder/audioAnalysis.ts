// components/Admin/StoryBuilder/audioAnalysis.ts
//
// Finding sentence boundaries in a recording, so the builder can propose
// markers instead of only recording clicks.
//
// A marker is not a bookmark: marker i starts the segment that runs to marker
// i+1 (lib/segmentBounds.ts), and that segment is the unit a student replays.
// So a marker belongs a hair BEFORE a sentence starts — which is a thing you
// can hear but cannot click accurately, because a person tapping along with
// speech lands 150-250ms late every time.
//
// The recordings are narrated single-speaker studio audio with real pauses
// between sentences, which is the easy case for this: a loudness gate over a
// downsampled envelope finds the pauses, and the end of a pause is the onset
// of the next sentence. Nothing here needs a model.
//
// Everything is pure and frame-based so it can be tested against synthetic
// signals rather than against a file someone has to remember to keep.

/** dBFS floor. Digital silence is -Infinity; clamp so arithmetic stays finite. */
const FLOOR_DB = -100;

/**
 * How far before the detected onset a marker is placed.
 *
 * The gate fires on the first frame that crosses the threshold, which is
 * already a few milliseconds into the first phoneme — a plosive ramps fast but
 * a fricative does not. Backing off a frame or two means the segment opens on
 * silence rather than clipping the consonant.
 */
export const LEAD_IN_SECONDS = 0.05;

export interface Envelope {
  /** Loudness per frame in dBFS, clamped at FLOOR_DB. */
  db: Float32Array;
  /** Seconds of audio in one frame. */
  frameSeconds: number;
  /** Seconds of audio in total. */
  duration: number;
}

/**
 * RMS loudness per frame.
 *
 * 100 frames per second by default: fine enough to place a boundary inside the
 * 50ms a marker is allowed to be wrong by, coarse enough that a five-minute
 * track is 30,000 frames rather than 13 million samples.
 */
export function buildEnvelope(
  samples: Float32Array,
  sampleRate: number,
  fps = 100,
): Envelope {
  const frameSeconds = 1 / fps;
  const frameSize = Math.max(1, Math.round(sampleRate * frameSeconds));
  const count = Math.max(1, Math.ceil(samples.length / frameSize));
  const db = new Float32Array(count);

  for (let f = 0; f < count; f++) {
    const start = f * frameSize;
    const end = Math.min(start + frameSize, samples.length);
    let sum = 0;
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    const rms = end > start ? Math.sqrt(sum / (end - start)) : 0;
    db[f] = rms > 0 ? Math.max(FLOOR_DB, 20 * Math.log10(rms)) : FLOOR_DB;
  }

  return { db, frameSeconds, duration: samples.length / sampleRate };
}

function percentile(values: Float32Array, p: number): number {
  if (values.length === 0) return FLOOR_DB;
  const sorted = Float32Array.from(values).sort();
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[idx];
}

/**
 * The loudness below which a frame counts as a pause, in dBFS.
 *
 * Derived from the recording rather than fixed, because "quiet" means
 * something different in a padded booth and in a room with a laptop fan. Two
 * bounds, and the tighter one wins:
 *
 *   - 6 dB above the quietest tenth of the track keeps room tone out of speech.
 *   - 35 dB below the loudest twentieth keeps a trailing unvoiced syllable in.
 *
 * The `loud - 12` ceiling is the degenerate guard: a recording with no pauses
 * at all has quiet ~= loud, and without it the threshold would climb into the
 * speech itself and cut sentences in half.
 */
export function silenceThreshold(env: Envelope): number {
  const loud = percentile(env.db, 0.95);
  const quiet = percentile(env.db, 0.1);
  return Math.min(loud - 12, Math.max(quiet + 6, loud - 35));
}

export interface Pause {
  start: number;
  end: number;
}

export interface PauseOptions {
  /** Shorter quiet runs are breaths and stop consonants, not boundaries. */
  minPauseSeconds?: number;
  /** Defaults to silenceThreshold(env). */
  threshold?: number;
}

/** Maximal runs of frames below the gate, in seconds. */
export function findPauses(env: Envelope, options: PauseOptions = {}): Pause[] {
  const { minPauseSeconds = 0.3, threshold = silenceThreshold(env) } = options;
  const pauses: Pause[] = [];
  let runStart = -1;

  for (let f = 0; f <= env.db.length; f++) {
    const quiet = f < env.db.length && env.db[f] < threshold;
    if (quiet) {
      if (runStart < 0) runStart = f;
      continue;
    }
    if (runStart >= 0) {
      const start = runStart * env.frameSeconds;
      const end = f * env.frameSeconds;
      if (end - start >= minPauseSeconds) pauses.push({ start, end });
      runStart = -1;
    }
  }

  return pauses;
}

/** Where the sentence after `pause` begins, backed off by the lead-in. */
export function onsetAfter(pause: Pause): number {
  return Math.max(pause.start, pause.end - LEAD_IN_SECONDS);
}

/**
 * Every speech onset in the track, earliest first.
 *
 * `minPauseSeconds` is deliberately looser here than for suggestions: this is
 * the list a hand-placed marker snaps to, and snapping wants every plausible
 * boundary, including the ones too close together to propose on their own.
 */
export function findOnsets(env: Envelope, minPauseSeconds = 0.15): number[] {
  return findPauses(env, { minPauseSeconds })
    .map(onsetAfter)
    .filter((t) => t > 0 && t < env.duration);
}

export interface SuggestOptions extends PauseOptions {
  /**
   * Boundaries closer together than this are dropped.
   *
   * A comma, a hesitation and an em-dash all leave a gap the gate cannot tell
   * from a full stop. Merging the short ones is the cheap fix, and it errs the
   * right way: a segment holding two short sentences is still usable practice,
   * where half a sentence is not.
   */
  minSegmentSeconds?: number;
}

/**
 * A proposed marker list for the whole track.
 *
 * Always opens at 0. The player gives no segment to audio before the first
 * marker (computeSegmentBounds returns the whole track for index -1, and the
 * index never goes below 0 in practice), so a first marker at 4s makes the
 * first four seconds unreachable in sentence mode. Starting at 0 is the only
 * safe answer, and it costs nothing: leading silence just opens segment 1.
 */
export function suggestMarkers(env: Envelope, options: SuggestOptions = {}): number[] {
  const { minPauseSeconds = 0.32, minSegmentSeconds = 1.5, threshold } = options;
  const pauses = findPauses(env, { minPauseSeconds, threshold });
  const times = [0];

  for (const pause of pauses) {
    const time = onsetAfter(pause);
    if (time - times[times.length - 1] < minSegmentSeconds) continue;
    // A pause running to the end of the track has no sentence after it.
    if (env.duration - time < minSegmentSeconds) continue;
    times.push(time);
  }

  return times;
}

/**
 * The onset nearest `time`, or `time` itself if none is close enough.
 *
 * This is what makes tapping along with the audio work. A person listening for
 * a sentence to start and pressing a key lands consistently late; the onset
 * they were aiming at is the one just behind them, and it is the one the gate
 * already found.
 */
export function snapToOnset(
  onsets: readonly number[],
  time: number,
  windowSeconds = 0.8,
): number {
  let best = time;
  let bestDistance = windowSeconds;
  for (const onset of onsets) {
    const distance = Math.abs(onset - time);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = onset;
    }
  }
  return best;
}

export type IssueKind = "no-start" | "too-close" | "long-segment";

export interface MarkerIssue {
  kind: IssueKind;
  /** The marker this is about, so the UI can jump to it. */
  index: number;
  message: string;
}

/** Segments shorter than this are almost certainly a double-tap. */
const MIN_USABLE_SEGMENT = 0.4;
/** Longer than this and a boundary was probably missed. */
const MAX_EXPECTED_SEGMENT = 25;

const seconds = (n: number) => `${n.toFixed(1)}s`;

/**
 * What is wrong with a marker list, in the producer's language.
 *
 * These are the three things that are invisible in the waveform and only show
 * up as a bad lesson: audio no student can reach, a segment too short to be a
 * sentence, and a segment so long a boundary was clearly missed.
 */
export function markerIssues(times: readonly number[], duration: number): MarkerIssue[] {
  const issues: MarkerIssue[] = [];
  if (times.length === 0) return issues;

  if (times[0] > 0.25) {
    issues.push({
      kind: "no-start",
      index: 0,
      message: `The first ${seconds(times[0])} can't be reached — sentence practice starts at the first marker. Move it to 0:00.`,
    });
  }

  for (let i = 0; i < times.length - 1; i++) {
    const length = times[i + 1] - times[i];
    if (length < MIN_USABLE_SEGMENT) {
      issues.push({
        kind: "too-close",
        index: i + 1,
        message: `Sentences ${i + 1} and ${i + 2} are only ${seconds(length)} apart — probably a double tap.`,
      });
    }
  }

  const lengths = times.map((t, i) => (i === times.length - 1 ? duration - t : times[i + 1] - t));
  lengths.forEach((length, i) => {
    if (length > MAX_EXPECTED_SEGMENT && duration > 0) {
      issues.push({
        kind: "long-segment",
        index: i,
        message: `Sentence ${i + 1} runs ${seconds(length)} — a boundary was probably missed.`,
      });
    }
  });

  return issues;
}
