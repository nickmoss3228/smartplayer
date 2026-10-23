import { describe, it, expect } from "vitest";
import { VoiceGate, fallbackWaitMs, levelDb, minVoicedMs } from "./voiceGate";

const FRAME = 20;

/** Feed `ms` of a constant level, returning the last state. */
const feed = (gate: VoiceGate, db: number, ms: number) => {
  let state = gate.push(db, FRAME);
  for (let t = FRAME; t < ms; t += FRAME) state = gate.push(db, FRAME);
  return state;
};

describe("VoiceGate", () => {
  it("waits forever in silence", () => {
    const gate = new VoiceGate({}, -60);
    gate.start(3);
    expect(feed(gate, -62, 30_000)).toBe("waiting");
  });

  it("finishes once the student speaks and then goes quiet", () => {
    const gate = new VoiceGate({}, -60);
    gate.start(3);
    feed(gate, -62, 500);
    expect(feed(gate, -30, 1200)).toBe("hearing");
    expect(feed(gate, -62, 400)).toBe("hearing"); // a pause between words
    expect(feed(gate, -62, 400)).toBe("done");
  });

  it("finishes a long sentence after a little over a second of speech", () => {
    const gate = new VoiceGate({}, -60);
    gate.start(12);
    feed(gate, -62, 300);
    feed(gate, -30, 1300);
    expect(feed(gate, -62, 800)).toBe("done");
  });

  it("does not count a cough as the sentence", () => {
    const gate = new VoiceGate({}, -60);
    gate.start(6);
    feed(gate, -62, 300);
    feed(gate, -25, 150);
    expect(feed(gate, -62, 3000)).toBe("hearing");
  });

  it("ignores the echo right after the sentence played", () => {
    const gate = new VoiceGate({}, -60);
    gate.start(3);
    expect(feed(gate, -30, 240)).toBe("waiting");
    expect(feed(gate, -62, 2000)).toBe("waiting");
  });

  it("settles a steady noisy room into the floor", () => {
    const gate = new VoiceGate({}, -60);
    gate.calibrate([-44, -45, -46, -45, -44]);
    gate.start(3);
    expect(feed(gate, -45, 5000)).toBe("waiting");
    // Speech well above the room still gets through.
    feed(gate, -22, 1500);
    expect(feed(gate, -45, 800)).toBe("done");
  });
});

describe("timings", () => {
  it("gives a median easy sentence about four seconds without a microphone", () => {
    expect(fallbackWaitMs(3.4)).toBe(4200);
    expect(fallbackWaitMs(1)).toBe(3000);
    expect(fallbackWaitMs(25)).toBe(12000);
  });

  it("asks for a third of the sentence, within bounds", () => {
    expect(minVoicedMs(0.5)).toBe(400);
    expect(minVoicedMs(3)).toBe(900);
    expect(minVoicedMs(20)).toBe(1200);
  });

  it("measures a full-scale square wave at 0 dBFS", () => {
    const frame = new Float32Array(256).map((_, i) => (i % 2 ? 1 : -1));
    expect(levelDb(frame)).toBeCloseTo(0, 3);
  });
});
