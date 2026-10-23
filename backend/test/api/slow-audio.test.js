// test/api/slow-audio.test.js — the slowed copies of a part's audio: kept
// through every Builder save, dropped when the audio is replaced, served only
// while they match the audio and never with a locked part, and refused clearly
// when they cannot be made. Making real copies needs the audio worker and the
// bucket; services/slowCopies.test.js covers that path with fakes.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import { adminToken, api, registerUser, startServer, stopServer } from "./harness.js";
import { config } from "../../src/config/env.js";
import { stories } from "../../src/db/index.js";

before(startServer);
after(stopServer);

const storyId = () => `test-slow-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
const markers = [
  { time: 0, label: "1", color: "#ff0000" },
  { time: 5, label: "2", color: "#00ff00" },
];
const audioOf = (n) => `https://example.test/${n}.mp3?v=a1b2c3d${n}`;
const copiesOf = (n) => ({
  "0.65": `https://example.test/${n}/audio.slow-0.65.mp3?v=11111111`,
  "0.8": `https://example.test/${n}/audio.slow-0.8.mp3?v=22222222`,
});

async function buildStory(admin, totalParts = 3) {
  const id = storyId();
  const create = await api("POST", "/api/admin/stories", {
    token: admin,
    body: { difficulty: "easy", storyId: id, storyName: "Slow copy test", totalParts },
  });
  assert.equal(create.status, 201, JSON.stringify(create.body));
  return { id, dbId: create.body.story._id };
}

async function withAudio(admin, dbId, n, audioUrl = audioOf(n)) {
  const res = await api("PATCH", `/api/admin/stories/${dbId}/parts/${n}/markers`, {
    token: admin,
    body: { timeMarkers: markers, audioUrl },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.part;
}

// What the "make" endpoint stores, written straight through the repo.
async function storeSlowAudio(dbId, n, slowAudio) {
  const result = await stories.mutateStory(dbId, (story) => {
    story.parts.find((p) => p.partNumber === n).slowAudio = slowAudio;
  });
  assert.ok(result && !("halt" in result), "stored");
}

const partOf = async (admin, dbId, n) =>
  (await api("GET", `/api/admin/stories/${dbId}`, { token: admin })).body.story.parts.find((p) => p.partNumber === n);

describe("slowed copies in the Builder", () => {
  it("survive the other Builder saves, and are dropped when the audio is replaced", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    await withAudio(admin, dbId, 1);
    await storeSlowAudio(dbId, 1, { source: audioOf(1), copies: copiesOf(1) });

    await api("PUT", `/api/admin/stories/${dbId}/parts/1/intro`, {
      token: admin,
      body: { intro: { title: { en: "Part one", ru: "" } } },
    });
    await withAudio(admin, dbId, 1); // markers saved again, same audio
    assert.deepEqual((await partOf(admin, dbId, 1)).slowAudio, { source: audioOf(1), copies: copiesOf(1) });

    const replaced = await withAudio(admin, dbId, 1, "https://example.test/new.mp3?v=99999999");
    assert.equal(replaced.slowAudio, null, "copies of the old audio are gone");
  });

  it("keeps only the known speeds with https addresses", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    await withAudio(admin, dbId, 1);
    await storeSlowAudio(dbId, 1, {
      source: audioOf(1),
      copies: { "0.65": copiesOf(1)["0.65"], "0.5": "https://example.test/x.mp3", "0.8": "ftp://example.test/y.mp3" },
    });
    assert.deepEqual((await partOf(admin, dbId, 1)).slowAudio.copies, { "0.65": copiesOf(1)["0.65"] });

    await storeSlowAudio(dbId, 1, { source: audioOf(1), copies: { "0.5": "https://example.test/x.mp3" } });
    assert.equal((await partOf(admin, dbId, 1)).slowAudio, null, "nothing usable left is none");
  });

  it("removes them on DELETE", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    await withAudio(admin, dbId, 1);
    await storeSlowAudio(dbId, 1, { source: audioOf(1), copies: copiesOf(1) });

    const res = await api("DELETE", `/api/admin/stories/${dbId}/parts/1/slow-audio`, { token: admin });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.part.slowAudio, null);
  });

  it("refuses to make them clearly: switched off, or a part with no audio", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    const url = (n) => `/api/admin/stories/${dbId}/parts/${n}/slow-audio`;
    const saved = config.audioWorkerUrl;
    try {
      config.audioWorkerUrl = null;
      const off = await api("POST", url(1), { token: admin });
      assert.equal(off.status, 503, JSON.stringify(off.body));
      assert.match(off.body.error, /AUDIO_WORKER_URL/);

      // Refused before the worker is ever called, so the address need not answer.
      config.audioWorkerUrl = "http://127.0.0.1:9";
      const noAudio = await api("POST", url(2), { token: admin });
      assert.equal(noAudio.status, 400, JSON.stringify(noAudio.body));
      assert.equal((await api("POST", url(99), { token: admin })).status, 404);
    } finally {
      config.audioWorkerUrl = saved;
    }
  });

  it("is admin-only", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    const u = await registerUser({ prefix: "slow" });
    const url = `/api/admin/stories/${dbId}/parts/1/slow-audio`;
    assert.equal((await api("POST", url)).status, 401);
    assert.equal((await api("DELETE", url)).status, 401);
    const asUser = await api("POST", url, { token: u.token });
    assert.ok([401, 403].includes(asUser.status), `a learner token got ${asUser.status}`);
  });
});

describe("slowed copies on the public story", () => {
  async function publishedStory(admin, access) {
    const { id, dbId } = await buildStory(admin);
    for (const n of [1, 2, 3]) await withAudio(admin, dbId, n);
    await storeSlowAudio(dbId, 1, { source: audioOf(1), copies: copiesOf(1) });
    // Made from audio the part no longer has.
    await storeSlowAudio(dbId, 2, { source: "https://example.test/old.mp3?v=00000000", copies: copiesOf(2) });
    await storeSlowAudio(dbId, 3, { source: audioOf(3), copies: copiesOf(3) });
    await api("PATCH", `/api/admin/stories/${dbId}`, { token: admin, body: { paid: true, ...access } });
    const published = await api("PATCH", `/api/admin/stories/${dbId}/publish`, {
      token: admin,
      body: { published: true },
    });
    assert.equal(published.status, 200, JSON.stringify(published.body));
    return id;
  }

  it("sends copies that match the audio, none that are stale, and none with a locked part", async () => {
    const admin = await adminToken();
    const id = await publishedStory(admin, { freeParts: 2, previewSeconds: null });

    const guest = await api("GET", `/api/stories/easy/${id}`);
    assert.equal(guest.status, 200, JSON.stringify(guest.body));
    const [one, two, three] = guest.body.parts;
    assert.deepEqual(one.slowCopies, copiesOf(1));
    assert.deepEqual(two.slowCopies, {}, "stale copies are never served");
    assert.equal(three.locked, true);
    assert.deepEqual(three.slowCopies, {}, "a locked part has no audio of any speed");
    assert.equal(one.slowAudio, undefined, "the stored shape stays on the server");
  });

  it("keeps them on a timed preview: slowing down is part of the sample", async () => {
    const admin = await adminToken();
    const id = await publishedStory(admin, { freeParts: 0, previewSeconds: 30 });

    const [one] = (await api("GET", `/api/stories/easy/${id}`)).body.parts;
    assert.equal(one.preview, true, JSON.stringify(one));
    assert.deepEqual(one.slowCopies, copiesOf(1));
  });
});
