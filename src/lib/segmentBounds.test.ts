import { describe, it, expect } from 'vitest';
import { computeSegmentBounds, findMarkerIndexAt, markerTime } from './segmentBounds';

/**
 * These pin the behaviour the player depends on. The edge cases below are not
 * hypothetical — each one corresponds to a state the real player passes
 * through (metadata not loaded yet, mixed marker shapes from two eras of story
 * data, the last sentence of a track).
 */

describe('markerTime', () => {
  it('reads plain-number markers (older static story data)', () => {
    expect(markerTime(12.5)).toBe(12.5);
  });

  it('reads object markers (written by the Story Builder)', () => {
    expect(markerTime({ time: 12.5 })).toBe(12.5);
  });
});

describe('computeSegmentBounds', () => {
  const markers = [0, 4, 9, 15];

  it('runs each segment from its marker to the next one', () => {
    expect(computeSegmentBounds(markers, 0, 20)).toEqual({ start: 0, end: 4 });
    expect(computeSegmentBounds(markers, 1, 20)).toEqual({ start: 4, end: 9 });
    expect(computeSegmentBounds(markers, 2, 20)).toEqual({ start: 9, end: 15 });
  });

  it('runs the last segment to the end of the track', () => {
    expect(computeSegmentBounds(markers, 3, 20)).toEqual({ start: 15, end: 20 });
  });

  it('handles object markers and mixed lists identically', () => {
    const mixed = [{ time: 0 }, 4, { time: 9 }];
    expect(computeSegmentBounds(mixed, 0, 20)).toEqual({ start: 0, end: 4 });
    expect(computeSegmentBounds(mixed, 1, 20)).toEqual({ start: 4, end: 9 });
  });

  it('treats the whole track as one segment when there are no markers', () => {
    expect(computeSegmentBounds([], 0, 20)).toEqual({ start: 0, end: 20 });
    expect(computeSegmentBounds(null, 0, 20)).toEqual({ start: 0, end: 20 });
    expect(computeSegmentBounds(undefined, 0, 20)).toEqual({ start: 0, end: 20 });
  });

  it('treats a negative index as "before the first sentence"', () => {
    // The player uses -1 to mean "nothing selected yet".
    expect(computeSegmentBounds(markers, -1, 20)).toEqual({ start: 0, end: 20 });
  });

  it('falls back to Infinity while duration is still unknown', () => {
    // The audio element reports 0 until metadata loads. Ending a segment at 0
    // would make it empty and stop playback the instant it started, so the
    // last segment has to mean "play to the end" until the real value lands.
    expect(computeSegmentBounds(markers, 3, 0)).toEqual({ start: 15, end: Infinity });
    expect(computeSegmentBounds(markers, 3, undefined)).toEqual({
      start: 15,
      end: Infinity,
    });
    expect(computeSegmentBounds([], 0, 0)).toEqual({ start: 0, end: Infinity });
  });
});

describe('findMarkerIndexAt', () => {
  const markers = [0, 4, 9, 15];

  it('finds the sentence currently playing', () => {
    expect(findMarkerIndexAt(markers, 0)).toBe(0);
    expect(findMarkerIndexAt(markers, 3.9)).toBe(0);
    expect(findMarkerIndexAt(markers, 4)).toBe(1);
    expect(findMarkerIndexAt(markers, 11)).toBe(2);
    expect(findMarkerIndexAt(markers, 99)).toBe(3);
  });

  it('lands exactly on a marker rather than the sentence before it', () => {
    // Boundary behaviour matters: seeking to a marker then toggling play mode
    // must select that sentence, not the previous one.
    expect(findMarkerIndexAt(markers, 9)).toBe(2);
  });

  it('returns 0 rather than -1 when the time precedes every marker', () => {
    // Callers seek straight to the returned index, so -1 would throw.
    expect(findMarkerIndexAt([2, 6], 0)).toBe(0);
  });

  it('returns 0 for an empty or missing marker list', () => {
    expect(findMarkerIndexAt([], 5)).toBe(0);
    expect(findMarkerIndexAt(null, 5)).toBe(0);
  });
});
