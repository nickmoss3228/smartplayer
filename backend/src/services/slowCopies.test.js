import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { makeSlowCopies, SlowCopyError, slowCopyKey } from "./slowCopies.js";

const WORKER = "http://worker.test";
const SOURCE = "https://bucket.test/stories/easy/leo/2/audio.mp3?v=abcd1234";
const story = { difficulty: "easy", storyId: "leo" };
const part = { partNumber: 2, audioUrl: SOURCE };

/** A fetch that serves the source audio and answers the worker per `worker`. */
function fakeFetch({ source = () => new Response(new Uint8Array([1, 2, 3])), worker } = {}) {
  const calls = [];
  const impl = async (url, init = {}) => {
    calls.push({ url, method: init.method ?? "GET", body: init.body });
    if (url === SOURCE) return source();
    if (url.startsWith(`${WORKER}/lengthen?speed=`)) {
      const speed = new URL(url).searchParams.get("speed");
      return worker ? worker(speed) : new Response(new TextEncoder().encode(`slow ${speed}`));
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  return { impl, calls };
}

const fakeUpload = () => {
  const uploads = [];
  const upload = async (key, buffer, type) => {
    uploads.push({ key, body: buffer.toString(), type });
    return `https://bucket.test/${key}?v=0000`;
  };
  return { upload, uploads };
};

describe("makeSlowCopies", () => {
  it("sends the part's audio to the worker once per speed and uploads each copy next to it", async () => {
    const fetch = fakeFetch();
    const { upload, uploads } = fakeUpload();
    const slow = await makeSlowCopies(story, part, { workerUrl: WORKER, fetchImpl: fetch.impl, upload });

    assert.deepEqual(slow, {
      source: SOURCE,
      copies: {
        "0.65": "https://bucket.test/stories/easy/leo/2/audio.slow-0.65.mp3?v=0000",
        "0.8": "https://bucket.test/stories/easy/leo/2/audio.slow-0.8.mp3?v=0000",
      },
    });
    const workerCalls = fetch.calls.filter((c) => c.method === "POST");
    assert.deepEqual(workerCalls.map((c) => c.url), [`${WORKER}/lengthen?speed=0.65`, `${WORKER}/lengthen?speed=0.8`]);
    assert.deepEqual([...workerCalls[0].body], [1, 2, 3], "the worker gets the original bytes");
    assert.deepEqual(uploads.map((u) => [u.key, u.body, u.type]), [
      [slowCopyKey(story, 2, "0.65"), "slow 0.65", "audio/mpeg"],
      [slowCopyKey(story, 2, "0.8"), "slow 0.8", "audio/mpeg"],
    ]);
  });

  it("refuses when switched off, or when the part has no audio", async () => {
    await assert.rejects(makeSlowCopies(story, part, { workerUrl: null }), (e) => e instanceof SlowCopyError && e.status === 503);
    await assert.rejects(
      makeSlowCopies(story, { partNumber: 2, audioUrl: null }, { workerUrl: WORKER }),
      (e) => e instanceof SlowCopyError && e.status === 400,
    );
  });

  it("names what failed: the download, the worker, or the upload", async () => {
    const missing = fakeFetch({ source: () => new Response("", { status: 404 }) });
    await assert.rejects(
      makeSlowCopies(story, part, { workerUrl: WORKER, fetchImpl: missing.impl, upload: fakeUpload().upload }),
      /download the part's audio: HTTP 404/,
    );

    const refusing = fakeFetch({
      worker: () => new Response(JSON.stringify({ error: "not an mp3" }), { status: 422 }),
    });
    await assert.rejects(
      makeSlowCopies(story, part, { workerUrl: WORKER, fetchImpl: refusing.impl, upload: fakeUpload().upload }),
      (e) => e instanceof SlowCopyError && e.status === 502 && /0\.65× copy: not an mp3/.test(e.message),
    );

    const broken = async () => { throw new Error("SignatureDoesNotMatch at storage.example bucket secret"); };
    await assert.rejects(
      makeSlowCopies(story, part, { workerUrl: WORKER, fetchImpl: fakeFetch().impl, upload: broken }),
      (e) => /could not be uploaded/.test(e.message) && !/bucket secret/.test(e.message),
    );
  });
});
