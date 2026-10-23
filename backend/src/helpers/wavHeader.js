// helpers/wavHeader.js
// Reads the header of a PCM WAV file, so an upload can be checked for being
// what it says it is before it is kept: «Послушай себя» shares are made in the
// browser (src/modules/repeatMode/takes.ts → encodeWav) as 16-bit mono PCM,
// and anything else arriving at the endpoint is refused.

/**
 * @param {Buffer} buf
 * @returns {{ format: number, channels: number, sampleRate: number, bitsPerSample: number,
 *   dataBytes: number, durationSec: number } | null} null when it is not a WAV file.
 */
export function parseWavHeader(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 44) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;

  let fmt = null;
  let dataBytes = null;
  // Chunks follow the 12-byte RIFF header; each is id(4) + size(4) + body,
  // padded to an even length.
  let at = 12;
  while (at + 8 <= buf.length) {
    const id = buf.toString("ascii", at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    const body = at + 8;
    if (id === "fmt " && size >= 16 && body + 16 <= buf.length) {
      fmt = {
        format: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      // A truncated file claims more than it holds; count what is there.
      dataBytes = Math.min(size, buf.length - body);
      break;
    }
    at = body + size + (size % 2);
  }
  if (!fmt || dataBytes === null || !fmt.sampleRate || !fmt.channels || !fmt.bitsPerSample) return null;

  const bytesPerSecond = fmt.sampleRate * fmt.channels * (fmt.bitsPerSample / 8);
  return { ...fmt, dataBytes, durationSec: dataBytes / bytesPerSecond };
}
