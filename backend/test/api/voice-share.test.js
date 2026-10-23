// test/api/voice-share.test.js — «Послушай себя» share links: a WAV goes up,
// an unguessable id comes back, and anyone with the id can read the caption
// and play the audio until it expires. Uploads that are not the browser's
// 16-bit mono WAV are refused.

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import "./harness.js";
import { api, registerUser, startServer, stopServer } from "./harness.js";
import { readShare, saveShare, SHARE_TTL_MS } from "../../src/helpers/voiceShareStore.js";

const shareDir = await fs.mkdtemp(path.join(os.tmpdir(), "voice-shares-"));
process.env.VOICE_SHARE_DIR = shareDir;

before(startServer);
after(async () => {
  await stopServer();
  await fs.rm(shareDir, { recursive: true, force: true });
});

function makeWav(seconds, { sampleRate = 22050, channels = 1, bits = 16 } = {}) {
  const bytes = Math.round(seconds * sampleRate) * channels * (bits / 8);
  const buf = Buffer.alloc(44 + bytes);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + bytes, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels * (bits / 8), 28);
  buf.writeUInt16LE(channels * (bits / 8), 32);
  buf.writeUInt16LE(bits, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(bytes, 40);
  return buf;
}

const QUERY = "part=3&difficulty=easy&kind=me&storyTitle=%D0%96%D0%B8%D0%B7%D0%BD%D1%8C%20%D0%9B%D0%B5%D0%BE&partTitle=Meet%20Leo";

/** Raw upload — the harness's api() always sends JSON. */
async function upload(body, { query = QUERY, type = "audio/wav", token } = {}) {
  const headers = { "Content-Type": type };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${process.env.PUBLIC_API_BASE}/api/voice-shares?${query}`, { method: "POST", headers, body });
  return { status: res.status, body: await res.json() };
}

describe("POST /api/voice-shares", () => {
  it("keeps a recording and returns its caption and id", async () => {
    const res = await upload(makeWav(2));
    assert.equal(res.status, 201);
    assert.match(res.body.id, /^[A-Za-z0-9_-]{16}$/);
    assert.equal(res.body.storyTitle, "Жизнь Лео");
    assert.equal(res.body.partTitle, "Meet Leo");
    assert.equal(res.body.part, 3);
    assert.equal(res.body.durationSec, 2);
    assert.equal(res.body.userId, undefined, "the uploader is never sent back out");
    assert.ok(Date.parse(res.body.expiresAt) - Date.parse(res.body.createdAt) === SHARE_TTL_MS);
  });

  it("records the member who shared, and only on disk", async () => {
    const u = await registerUser();
    const res = await upload(makeWav(1), { token: u.token });
    assert.equal(res.status, 201);
    const stored = await readShare(res.body.id);
    assert.ok(stored.userId, "kept for removing a member's shares later");
  });

  it("refuses what is not 16-bit mono PCM WAV", async () => {
    assert.equal((await upload(Buffer.from("not audio at all, just some text"))).status, 400);
    assert.equal((await upload(makeWav(2, { channels: 2 }))).status, 400);
    assert.equal((await upload(makeWav(2, { bits: 8 }))).status, 400);
    assert.equal((await upload(makeWav(2, { sampleRate: 96000 }))).status, 400);
    assert.equal((await upload(makeWav(0.1))).status, 400);
  });

  it("refuses a bad caption", async () => {
    assert.equal((await upload(makeWav(1), { query: "part=0&difficulty=easy&kind=me" })).status, 400);
    assert.equal((await upload(makeWav(1), { query: "part=1&difficulty=expert&kind=me" })).status, 400);
    assert.equal((await upload(makeWav(1), { query: "part=1&difficulty=easy&kind=karaoke" })).status, 400);
  });

  it("ignores a body sent as anything but audio/wav", async () => {
    const res = await upload(makeWav(1), { type: "application/octet-stream" });
    assert.equal(res.status, 400);
  });
});

describe("GET /api/voice-shares/:id", () => {
  it("serves the caption and the audio to anyone with the link", async () => {
    const wav = makeWav(1.5);
    const { body } = await upload(wav);

    const meta = await api("GET", `/api/voice-shares/${body.id}`);
    assert.equal(meta.status, 200);
    assert.equal(meta.body.kind, "me");

    const audio = await fetch(`${process.env.PUBLIC_API_BASE}/api/voice-shares/${body.id}/audio`);
    assert.equal(audio.status, 200);
    assert.match(audio.headers.get("content-type"), /audio\/wav/);
    assert.equal(Buffer.from(await audio.arrayBuffer()).length, wav.length);
  });

  it("answers a range request, so the player can seek", async () => {
    const { body } = await upload(makeWav(1));
    const res = await fetch(`${process.env.PUBLIC_API_BASE}/api/voice-shares/${body.id}/audio`, {
      headers: { Range: "bytes=0-99" },
    });
    assert.equal(res.status, 206);
    assert.equal((await res.arrayBuffer()).byteLength, 100);
  });

  it("404s an unknown, malformed or expired id", async () => {
    assert.equal((await api("GET", "/api/voice-shares/AAAAAAAAAAAAAAAA")).status, 404);
    assert.equal((await api("GET", "/api/voice-shares/..%2F..%2F.env")).status, 404);
    assert.equal((await api("GET", "/api/voice-shares/short/audio")).status, 404);

    const old = await saveShare(makeWav(1), { kind: "me" }, Date.now() - SHARE_TTL_MS - 1000);
    assert.equal((await api("GET", `/api/voice-shares/${old.id}`)).status, 404);
    await assert.rejects(fs.access(path.join(shareDir, `${old.id}.wav`)), "an expired share is deleted when read");
  });
});
