// The comic quiz's audio side: which stretches of a part's audio exist (the
// marker segments), which panel each belongs to, and the order a round plays
// them in.
import type { PanelQuiz } from "../../services/storyServices";

export type Clip = PanelQuiz["clips"][number];
export interface Segment {
  start: number;
  end: number;
}

/** How many lines one round plays. Enough to cover a page, short enough to replay. */
export const ROUND_LENGTH = 8;

/** Two times this close are the same marker (a re-saved marker drifts by float noise). */
const SAME_TIME = 0.05;

/**
 * The part's lines, from its markers: each runs to the next marker, the last
 * to the end of the audio. Without the duration the last line has no end, so
 * it is left out rather than guessed.
 */
export function segmentsFromMarkers(times: readonly number[], duration: number | null): Segment[] {
  const sorted = [...times].filter(Number.isFinite).sort((a, b) => a - b);
  const segments: Segment[] = [];
  sorted.forEach((start, i) => {
    const end = i + 1 < sorted.length ? sorted[i + 1] : duration;
    if (end !== null && end - start > SAME_TIME) segments.push({ start, end });
  });
  return segments;
}

/**
 * Which panel each segment is matched to (null for none), read back from saved
 * clips. A clip whose start no longer lines up with a marker — the markers
 * moved since — matches nothing; `orphans` counts those, so the Builder can
 * say they will be dropped rather than dropping them silently.
 */
export function assignmentsFromClips(
  segments: readonly Segment[],
  clips: readonly Clip[],
): { assignments: (number | null)[]; orphans: number } {
  const assignments: (number | null)[] = segments.map(() => null);
  let orphans = 0;
  for (const clip of clips) {
    const i = segments.findIndex((s) => Math.abs(s.start - clip.start) < SAME_TIME);
    if (i === -1) orphans++;
    else assignments[i] = clip.panel;
  }
  return { assignments, orphans };
}

const toMs = (s: number) => Math.round(s * 1000) / 1000;

/**
 * The clips to save: every matched segment, with its times rounded to the
 * millisecond — as the server stores them, so a draft read back from a save
 * compares equal to it instead of looking edited.
 */
export function clipsFromAssignments(
  segments: readonly Segment[],
  assignments: readonly (number | null)[],
): Clip[] {
  return segments.flatMap((s, i) => {
    const panel = assignments[i];
    return panel === null || panel === undefined ? [] : [{ start: toMs(s.start), end: toMs(s.end), panel }];
  });
}

/**
 * The questions a quiz asks: its clips, with lines that follow each other on
 * the same panel joined into one. "She meets me every evening." + "She sits
 * by the door." is one moment of the comic; asked as two, each half is too
 * little to place and the second is answered by the first.
 */
export function questionsFromClips(clips: readonly Clip[]): Clip[] {
  const sorted = [...clips].sort((a, b) => a.start - b.start);
  const out: Clip[] = [];
  for (const clip of sorted) {
    const last = out[out.length - 1];
    if (last && last.panel === clip.panel && Math.abs(clip.start - last.end) < SAME_TIME) {
      out[out.length - 1] = { ...last, end: Math.max(last.end, clip.end) };
    } else {
      out.push({ ...clip });
    }
  }
  return out;
}

/**
 * The order one round plays the clips in: shuffled, at most `max` of them, and
 * never the same panel twice running when it can be avoided — two lines from
 * the same panel back to back can be answered without listening to the second.
 */
export function buildRound(clips: readonly Clip[], max = ROUND_LENGTH, random = Math.random): number[] {
  const pool = clips.map((_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Greedy: the next clip is the first left in the shuffle from a different
  // panel than the last one; only when none is left does a panel repeat.
  const picked: number[] = [];
  while (picked.length < max && pool.length > 0) {
    const last = picked.length ? clips[picked[picked.length - 1]].panel : null;
    const at = pool.findIndex((c) => clips[c].panel !== last);
    picked.push(pool.splice(at === -1 ? 0 : at, 1)[0]);
  }
  return picked;
}
