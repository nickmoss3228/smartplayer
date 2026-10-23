import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseWavHeader } from "./wavHeader.js";

/** A 16-bit mono PCM WAV of `samples` silent samples. */
function makeWav(samples, sampleRate = 22050) {
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(samples * 2, 40);
  return buf;
}

describe("parseWavHeader", () => {
  it("reads a 16-bit mono PCM file and its length", () => {
    const h = parseWavHeader(makeWav(22050 * 3));
    assert.deepEqual(
      { format: h.format, channels: h.channels, sampleRate: h.sampleRate, bits: h.bitsPerSample },
      { format: 1, channels: 1, sampleRate: 22050, bits: 16 },
    );
    assert.equal(h.durationSec, 3);
  });

  it("refuses anything that is not RIFF/WAVE", () => {
    assert.equal(parseWavHeader(Buffer.from("ID3".padEnd(64, "\0"))), null);
    assert.equal(parseWavHeader(Buffer.alloc(10)), null);
    assert.equal(parseWavHeader("RIFF"), null);
  });

  it("counts only the data actually present in a truncated file", () => {
    const wav = makeWav(1000).subarray(0, 44 + 500);
    assert.equal(parseWavHeader(wav).dataBytes, 500);
  });

  it("skips chunks it does not know", () => {
    const plain = makeWav(100);
    const list = Buffer.alloc(8 + 4);
    list.write("LIST", 0, "ascii");
    list.writeUInt32LE(4, 4);
    const withList = Buffer.concat([plain.subarray(0, 36), list, plain.subarray(36)]);
    assert.equal(parseWavHeader(withList).dataBytes, 200);
  });
});
