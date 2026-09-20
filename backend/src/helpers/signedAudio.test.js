// helpers/signedAudio.test.js
//
// Covers the parts that decide WHETHER a URL is signed and WHICH object it
// names. The signature itself is the AWS SDK's job and is not re-tested here.

import test from "node:test";
import assert from "node:assert/strict";

import { bucketKeyFor, isSigningEnabled, signAudioUrl } from "./signedAudio.js";

const BASE = "https://storage.yandexcloud.net/audioplayer-data";

test("bucketKeyFor decodes the key and drops the cache-buster", () => {
  assert.equal(
    bucketKeyFor(`${BASE}/leo/1.%20Meet%20Leo.mp3?v=abc12345`, BASE),
    "leo/1. Meet Leo.mp3",
  );
});

test("bucketKeyFor ignores anything outside this environment's bucket", () => {
  for (const url of [
    "/assets/leo/comics/1. Meet Leo.jpg",
    "https://storage.yandexcloud.net/audioplayer-data-staging/leo/1.mp3",
    "",
    null,
    undefined,
  ]) {
    assert.equal(bucketKeyFor(url, BASE), null, String(url));
  }
});

test("bucketKeyFor refuses a malformed escape rather than guessing", () => {
  assert.equal(bucketKeyFor(`${BASE}/leo/%E0%A4%A.mp3`, BASE), null);
});

test("signing is off unless explicitly switched on", async () => {
  const before = process.env.PAID_AUDIO_SIGNING;
  delete process.env.PAID_AUDIO_SIGNING;
  try {
    assert.equal(isSigningEnabled(), false);
    const url = `${BASE}/leo/1.mp3`;
    assert.equal(await signAudioUrl(url), url, "an off switch must hand the URL back untouched");
  } finally {
    if (before !== undefined) process.env.PAID_AUDIO_SIGNING = before;
  }
});
