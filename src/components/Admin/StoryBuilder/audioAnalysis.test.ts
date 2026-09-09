import { describe, it, expect } from "vitest";
import {
  buildEnvelope,
  silenceThreshold,
  findPauses,
  findOnsets,
  suggestMarkers,
  snapToOnset,
  markerIssues,
  LEAD_IN_SECONDS,
} from "./audioAnalysis";

const SAMPLE_RATE = 8000;

interface Span {
  seconds: number;
  /** Peak amplitude. 0 for digital silence, ~0.001 for room tone. */
  level: number;
}

/**
 * A synthetic recording: alternating bands of tone and quiet.
 *
 * A 220 Hz sine stands in for speech. What the gate actually measures is
 * per-frame RMS, and a sine and a voice look the same to it at this
 * resolution — which is the point of testing here rather than against a file.
 */
function render(spans: Span[]): Float32Array {
  const total = Math.round(spans.reduce((sum, s) => sum + s.seconds, 0) * SAMPLE_RATE);
  const out = new Float32Array(total);
  let at = 0;
  for (const span of spans) {
    const length = Math.round(span.seconds * SAMPLE_RATE);
    for (let i = 0; i < length && at < total; i++, at++) {
      out[at] = span.level * Math.sin((2 * Math.PI * 220 * i) / SAMPLE_RATE);
    }
  }
  return out;
}

const speech = (seconds: number): Span => ({ seconds, level: 0.5 });
/** Not digital silence — a real recording always has some room tone. */
const quiet = (seconds: number): Span => ({ seconds, level: 0.0015 });

describe("buildEnvelope", () => {
  it("covers the whole track at the requested frame rate", () => {
    const env = buildEnvelope(render([speech(2)]), SAMPLE_RATE, 100);
    expect(env.duration).toBeCloseTo(2, 5);
    expect(env.frameSeconds).toBeCloseTo(0.01, 10);
    expect(env.db.length).toBe(200);
  });

  it("puts loud audio well above quiet audio", () => {
    const env = buildEnvelope(render([speech(1), quiet(1)]), SAMPLE_RATE);
    expect(env.db[50]).toBeGreaterThan(-15);
    expect(env.db[150]).toBeLessThan(-50);
  });

  it("reports digital silence at the floor rather than -Infinity", () => {
    const env = buildEnvelope(render([{ seconds: 1, level: 0 }]), SAMPLE_RATE);
    expect(Number.isFinite(env.db[50])).toBe(true);
    expect(env.db[50]).toBe(-100);
  });
});

describe("silenceThreshold", () => {
  it("lands between the room tone and the speech", () => {
    const env = buildEnvelope(render([speech(2), quiet(1), speech(2)]), SAMPLE_RATE);
    const threshold = silenceThreshold(env);
    expect(threshold).toBeGreaterThan(-56);
    expect(threshold).toBeLessThan(-15);
  });

  it("stays below the speech when the track has no pauses at all", () => {
    // The degenerate case the `loud - 12` ceiling exists for: without it the
    // threshold climbs into the speech and every frame reads as a pause.
    const env = buildEnvelope(render([speech(5)]), SAMPLE_RATE);
    const threshold = silenceThreshold(env);
    expect(findPauses(env, { threshold })).toHaveLength(0);
  });
});

describe("findPauses", () => {
  const env = buildEnvelope(
    render([speech(2), quiet(0.6), speech(2), quiet(0.5), speech(2)]),
    SAMPLE_RATE,
  );

  it("finds one run per gap, at the right times", () => {
    const pauses = findPauses(env, { minPauseSeconds: 0.3 });
    expect(pauses).toHaveLength(2);
    expect(pauses[0].start).toBeCloseTo(2, 1);
    expect(pauses[0].end).toBeCloseTo(2.6, 1);
    expect(pauses[1].start).toBeCloseTo(4.6, 1);
  });

  it("ignores gaps shorter than the minimum", () => {
    const short = buildEnvelope(render([speech(1), quiet(0.1), speech(1)]), SAMPLE_RATE);
    expect(findPauses(short, { minPauseSeconds: 0.3 })).toHaveLength(0);
  });

  it("closes a run that reaches the end of the track", () => {
    const trailing = buildEnvelope(render([speech(1), quiet(1)]), SAMPLE_RATE);
    const pauses = findPauses(trailing, { minPauseSeconds: 0.3 });
    expect(pauses).toHaveLength(1);
    expect(pauses[0].end).toBeCloseTo(2, 1);
  });
});

describe("findOnsets", () => {
  it("reports the start of each sentence, backed off by the lead-in", () => {
    const env = buildEnvelope(render([speech(2), quiet(0.6), speech(2)]), SAMPLE_RATE);
    const onsets = findOnsets(env);
    expect(onsets).toHaveLength(1);
    expect(onsets[0]).toBeCloseTo(2.6 - LEAD_IN_SECONDS, 1);
  });

  it("never proposes an onset at 0 or past the end", () => {
    // Leading and trailing silence are pauses, but neither has a sentence
    // after it that a marker could open.
    const env = buildEnvelope(render([quiet(1), speech(2), quiet(1)]), SAMPLE_RATE);
    for (const onset of findOnsets(env)) {
      expect(onset).toBeGreaterThan(0);
      expect(onset).toBeLessThan(env.duration);
    }
  });
});

describe("suggestMarkers", () => {
  const env = buildEnvelope(
    render([speech(3), quiet(0.6), speech(3), quiet(0.6), speech(3)]),
    SAMPLE_RATE,
  );

  it("always opens at 0", () => {
    // Audio before the first marker belongs to no segment in the player, so a
    // suggestion list that starts late silently hides the opening sentence.
    expect(suggestMarkers(env)[0]).toBe(0);
    const lateStart = buildEnvelope(render([quiet(2), speech(4)]), SAMPLE_RATE);
    expect(suggestMarkers(lateStart)[0]).toBe(0);
  });

  it("proposes one marker per sentence boundary", () => {
    const times = suggestMarkers(env);
    expect(times).toHaveLength(3);
    expect(times[1]).toBeCloseTo(3.6 - LEAD_IN_SECONDS, 1);
    expect(times[2]).toBeCloseTo(7.2 - LEAD_IN_SECONDS, 1);
  });

  it("returns times in ascending order with no duplicates", () => {
    const times = suggestMarkers(env);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(new Set(times).size).toBe(times.length);
  });

  it("merges boundaries that would leave a segment too short to be a sentence", () => {
    // A comma-length gap in the middle of a sentence: the gate sees it, and
    // minSegmentSeconds is what stops it becoming a marker.
    const stutter = buildEnvelope(
      render([speech(3), quiet(0.4), speech(0.5), quiet(0.4), speech(3)]),
      SAMPLE_RATE,
    );
    const times = suggestMarkers(stutter, { minSegmentSeconds: 1.5 });
    for (let i = 1; i < times.length; i++) {
      expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(1.5);
    }
  });

  it("does not propose a marker inside the trailing silence", () => {
    const trailing = buildEnvelope(render([speech(4), quiet(3)]), SAMPLE_RATE);
    expect(suggestMarkers(trailing)).toEqual([0]);
  });

  it("gives a single unbroken take one marker rather than none", () => {
    // The list must stay usable when detection finds nothing: one marker at 0
    // is one long segment, which is what the audio actually is.
    expect(suggestMarkers(buildEnvelope(render([speech(6)]), SAMPLE_RATE))).toEqual([0]);
  });
});

describe("snapToOnset", () => {
  const onsets = [2.5, 7.25, 12];

  it("pulls a late tap back to the boundary the person was aiming at", () => {
    expect(snapToOnset(onsets, 2.72)).toBe(2.5);
  });

  it("snaps forward too, for an early tap", () => {
    expect(snapToOnset(onsets, 7.1)).toBe(7.25);
  });

  it("leaves a tap alone when no boundary is near it", () => {
    expect(snapToOnset(onsets, 20)).toBe(20);
  });

  it("respects the window", () => {
    // 0.9s past the boundary: outside the default window, inside a wider one.
    expect(snapToOnset(onsets, 3.4, 0.8)).toBe(3.4);
    expect(snapToOnset(onsets, 3.4, 1)).toBe(2.5);
  });

  it("is a no-op with no onsets, so an undetectable track still takes markers", () => {
    expect(snapToOnset([], 4.2)).toBe(4.2);
  });
});

describe("markerIssues", () => {
  it("says nothing about a healthy list", () => {
    expect(markerIssues([0, 4, 9, 14], 20)).toEqual([]);
  });

  it("reports audio no student can reach", () => {
    const issues = markerIssues([3.5, 8], 20);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe("no-start");
    expect(issues[0].index).toBe(0);
    expect(issues[0].message).toContain("3.5s");
  });

  it("allows a first marker that is nearly but not exactly zero", () => {
    expect(markerIssues([0.1, 5], 20)).toEqual([]);
  });

  it("reports a double tap, pointing at the second marker", () => {
    const issues = markerIssues([0, 5, 5.1, 10], 20);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe("too-close");
    expect(issues[0].index).toBe(2);
  });

  it("reports a segment long enough to be a missed boundary", () => {
    const issues = markerIssues([0, 4], 60);
    expect(issues.map((i) => i.kind)).toEqual(["long-segment"]);
    expect(issues[0].index).toBe(1);
  });

  it("measures the last segment against the end of the track", () => {
    expect(markerIssues([0, 4], 8)).toEqual([]);
  });

  it("says nothing at all about an empty list", () => {
    expect(markerIssues([], 20)).toEqual([]);
  });
});
