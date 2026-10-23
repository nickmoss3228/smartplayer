// services/slowCopies.js
//
// Makes the slowed copies of a part's audio (0.65x and 0.8x) that the player
// plays instead of stretching the audio itself. The stretching is done by the
// audio-worker service (Praat's PSOLA, see audio-worker/README.md); this file
// fetches the part's audio, asks the worker for each speed, and uploads the
// results next to the original.
//
// The result is stored as part.slowAudio = { source, copies }, where `source`
// is the part's audioUrl, ?v= version included. Once the audio is replaced the
// copies no longer match it, and the public story endpoint stops serving them
// (stories.repo.ts: freshSlowCopies).
//
// Used by the Builder's "Make slow copies" endpoint and by
// scripts/makeSlowCopies.js for parts that existed before this did.

import { config } from "../config/env.js";
import { uploadBuffer } from "../helpers/uploadToStorage.js";
import { stories as storiesRepo } from "../db/index.js";

// The worker refuses anything bigger; refusing first saves the round trip.
const MAX_SOURCE_BYTES = 40 * 1024 * 1024;
// A three-minute part takes about 5 s per speed on a laptop.
const SOURCE_TIMEOUT_MS = 60_000;
const WORKER_TIMEOUT_MS = 120_000;

/** A failure worth telling the admin about, with the HTTP status to answer with. */
export class SlowCopyError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "SlowCopyError";
    this.status = status;
  }
}

/** Where a copy lives: next to the part's own audio.mp3. */
export const slowCopyKey = (story, partNumber, speed) =>
  `stories/${story.difficulty}/${story.storyId}/${partNumber}/audio.slow-${speed}.mp3`;

async function fetchSource(url, fetchImpl) {
  let res;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS) });
  } catch (error) {
    throw new SlowCopyError(`Could not download the part's audio: ${error.message}`);
  }
  if (!res.ok) throw new SlowCopyError(`Could not download the part's audio: HTTP ${res.status}.`);
  const audio = Buffer.from(await res.arrayBuffer());
  if (audio.length === 0) throw new SlowCopyError("The part's audio file is empty.", 400);
  if (audio.length > MAX_SOURCE_BYTES) {
    throw new SlowCopyError(`The part's audio is over ${MAX_SOURCE_BYTES / 1024 / 1024} MB.`, 400);
  }
  return audio;
}

async function lengthen(workerUrl, audio, speed, fetchImpl) {
  let res;
  try {
    res = await fetchImpl(`${workerUrl}/lengthen?speed=${speed}`, {
      method: "POST",
      headers: { "Content-Type": "audio/mpeg" },
      body: audio,
      signal: AbortSignal.timeout(WORKER_TIMEOUT_MS),
    });
  } catch (error) {
    throw new SlowCopyError(`The audio worker did not answer: ${error.message}`);
  }
  if (!res.ok) {
    const detail = await res.json().then((body) => body?.error).catch(() => null);
    throw new SlowCopyError(`The audio worker could not make the ${speed}× copy: ${detail ?? `HTTP ${res.status}`}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Makes every speed in SLOW_SPEEDS for `part`'s current audio, uploads them,
 * and returns the SlowAudio to store. Throws SlowCopyError on anything the
 * admin can act on. `deps` exists for the tests.
 */
export async function makeSlowCopies(story, part, deps = {}) {
  const {
    workerUrl = config.audioWorkerUrl,
    fetchImpl = fetch,
    upload = uploadBuffer,
  } = deps;
  if (!workerUrl) {
    throw new SlowCopyError("Slowed copies are switched off on this server (AUDIO_WORKER_URL is not set).", 503);
  }
  if (!part.audioUrl) throw new SlowCopyError("This part has no audio yet.", 400);

  const source = part.audioUrl;
  const audio = await fetchSource(source, fetchImpl);
  const copies = {};
  for (const speed of storiesRepo.SLOW_SPEEDS) {
    const slowed = await lengthen(workerUrl, audio, speed, fetchImpl);
    try {
      copies[speed] = await upload(slowCopyKey(story, part.partNumber, speed), slowed, "audio/mpeg");
    } catch (error) {
      // Not forwarded whole: AWS SDK errors name the bucket and the endpoint.
      console.error("slow copy upload failed:", error);
      throw new SlowCopyError(`The ${speed}× copy was made but could not be uploaded to storage.`);
    }
  }
  return { source, copies };
}
