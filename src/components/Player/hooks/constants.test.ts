import { describe, it, expect } from 'vitest';
import { SPEED_SEQUENCES, PLAYBACK_RATES, formatTime } from './constants';

/**
 * SPEED_SEQUENCES encodes the teaching method itself: a segment repeats N
 * times, getting faster each pass, ending at full speed. Everything the
 * marketing copy and the guided tour promise ("first at 0.5×, then 0.8×, then
 * 1.0×") is this table. useSegmentEngine indexes into it by repeat number, so
 * a sequence shorter than its key silently falls back to 1.0 and the learner
 * gets full speed on a pass that was supposed to be slow.
 */

describe('SPEED_SEQUENCES', () => {
  it('has a sequence for every repeat setting the UI offers', () => {
    expect(Object.keys(SPEED_SEQUENCES).map(Number).sort()).toEqual([1, 2, 3]);
  });

  it('gives each setting exactly as many speeds as it has repeats', () => {
    // useSegmentEngine reads seq[currentRepeat]; a short sequence means a
    // pass silently defaults to 1.0 instead of its intended slower speed.
    for (const [count, speeds] of Object.entries(SPEED_SEQUENCES)) {
      expect(speeds.length, `${count}× sequence has ${speeds.length} speeds`).toBe(
        Number(count),
      );
    }
  });

  it('always ends at full speed', () => {
    // The last pass is the "can you follow it for real" pass. If it ended
    // slow, the learner would never hear the sentence at natural speed.
    for (const [count, speeds] of Object.entries(SPEED_SEQUENCES)) {
      expect(speeds[speeds.length - 1], `${count}× does not end at 1.0`).toBe(1.0);
    }
  });

  it('never slows down partway through', () => {
    for (const [count, speeds] of Object.entries(SPEED_SEQUENCES)) {
      const ascending = [...speeds].sort((a, b) => a - b);
      expect(speeds, `${count}× is not monotonically faster`).toEqual(ascending);
    }
  });

  it('only uses speeds the player can actually render', () => {
    for (const speeds of Object.values(SPEED_SEQUENCES)) {
      for (const s of speeds) expect(PLAYBACK_RATES).toContain(s);
    }
  });

  it('starts the 3× sequence slowest, as the guided tour promises', () => {
    expect(SPEED_SEQUENCES[3]).toEqual([0.5, 0.8, 1.0]);
  });
});

describe('formatTime', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(59)).toBe('0:59');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(605)).toBe('10:05');
  });

  it('truncates rather than rounds, so the clock never shows a time not reached', () => {
    expect(formatTime(59.9)).toBe('0:59');
  });

  it('survives Infinity and NaN', () => {
    // Duration is Infinity before metadata loads (see lib/segmentBounds), and
    // this value is rendered straight into the transport bar.
    expect(formatTime(Infinity)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
  });

  it('pads the seconds so the clock does not jitter in width', () => {
    expect(formatTime(61)).toBe('1:01');
  });
});
