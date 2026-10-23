import { describe, it, expect } from "vitest";
import {
  dialogueTrack,
  encodeWav,
  joinWithGaps,
  normalize,
  sliceMono,
  studentTrack,
  trimToSpeech,
  type Take,
} from "./takes";

const RATE = 1000; // small rate keeps the arrays readable

/** `ms` of silence, then `ms` of a loud square wave, then silence. */
const speech = (before: number, voiced: number, after: number) => {
  const out = new Float32Array(before + voiced + after);
  for (let i = before; i < before + voiced; i++) out[i] = i % 2 ? 0.5 : -0.5;
  return out;
};

describe("trimToSpeech", () => {
  it("keeps the speech plus a little air on each side", () => {
    const trimmed = trimToSpeech(speech(2000, 1000, 1500), RATE, -30, 0.1, 0.2)!;
    expect(trimmed.length).toBe(100 + 1000 + 200);
  });

  it("returns null when nobody spoke", () => {
    expect(trimToSpeech(new Float32Array(3000), RATE, -30)).toBeNull();
  });

  it("does not pad past the edges", () => {
    expect(trimToSpeech(speech(0, 500, 0), RATE, -30)!.length).toBe(500);
  });
});

describe("joining", () => {
  it("puts silence between pieces but not after the last", () => {
    const out = joinWithGaps([new Float32Array(10).fill(1), new Float32Array(5).fill(1)], RATE, 0.02);
    expect(out.length).toBe(10 + 20 + 5);
    expect(out[15]).toBe(0);
    expect(out[34]).toBe(1);
  });

  it("raises a quiet take but caps the gain", () => {
    expect(Math.max(...normalize(new Float32Array([0.1, -0.2]), 0.8))).toBeCloseTo(0.4);
    expect(Math.max(...normalize(new Float32Array([0.01]), 0.8, 8))).toBeCloseTo(0.08);
  });

  it("averages channels when slicing the original", () => {
    const l = new Float32Array([0, 1, 1, 1]);
    const r = new Float32Array([0, 0, 1, 0]);
    expect([...sliceMono([l, r], 4, 0.25, 0.75)]).toEqual([0.5, 1]);
  });

  const take = (index: number, len: number, start: number, end: number): Take => ({
    index,
    samples: new Float32Array(len).fill(0.5),
    sampleRate: RATE,
    start,
    end,
  });

  it("orders the student's track by sentence", () => {
    const out = studentTrack([take(2, 100, 0, 0), take(0, 50, 0, 0)]);
    expect(out.length).toBe(50 + 350 + 100);
  });

  it("alternates narrator and student", () => {
    const original = [new Float32Array(2000).fill(0.2)];
    const out = dialogueTrack([take(0, 100, 0, 0.5), take(1, 100, 0.5, 1.5)], original);
    // 500 narrator + 250 gap + 100 student + 450 gap + 1000 narrator + 250 gap + 100 student
    expect(out.length).toBe(2650);
    expect(out[0]).toBeCloseTo(0.2);
    expect(out[750]).toBeCloseTo(0.85);
  });
});

describe("encodeWav", () => {
  it("writes a 44-byte header and two bytes per sample", async () => {
    const blob = encodeWav(new Float32Array(100), 22050);
    expect(blob.size).toBe(44 + 200);
    expect(blob.type).toBe("audio/wav");
    const head = new Uint8Array(await blob.arrayBuffer()).slice(0, 4);
    expect(String.fromCharCode(...head)).toBe("RIFF");
  });
});
