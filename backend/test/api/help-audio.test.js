// test/api/help-audio.test.js — the SOS clips: one short clip per marker of a
// part, saved from the Builder's SOS tab and refused when malformed. Uploads
// are only tested up to their refusals, which happen before the bucket is touched.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import { adminToken, api, registerUser, startServer, stopServer } from "./harness.js";

before(startServer);
after(stopServer);

const storyId = () => `test-sos-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
const markers = [
  { time: 0, label: "1", color: "#ff0000" },
  { time: 5, label: "2", color: "#00ff00" },
  { time: 9, label: "3", color: "#0000ff" },
];
const clip = (n) => `https://example.test/help/${n}.mp3`;

async function buildStory(admin, totalParts = 2) {
  const create = await api("POST", "/api/admin/stories", {
    token: admin,
    body: { difficulty: "easy", storyId: storyId(), storyName: "SOS test", totalParts },
  });
  assert.equal(create.status, 201, JSON.stringify(create.body));
  return { dbId: create.body.story._id };
}

const setMarkers = async (admin, dbId, n = 1, timeMarkers = markers) => {
  const res = await api("PATCH", `/api/admin/stories/${dbId}/parts/${n}/markers`, {
    token: admin,
    body: { timeMarkers, audioUrl: "https://example.test/a.mp3" },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
};

const saveHelp = (admin, dbId, helpAudio, n = 1) =>
  api("PUT", `/api/admin/stories/${dbId}/parts/${n}/help-audio`, { token: admin, body: { helpAudio } });

describe("PUT /api/admin/stories/:id/parts/:n/help-audio", () => {
  it("stores the clips in marker order and returns them on the part", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    await setMarkers(admin, dbId);

    const saved = await saveHelp(admin, dbId, ["", clip(2), clip(3)]);
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.deepEqual(saved.body.part.helpAudio, ["", clip(2), clip(3)], "a gap keeps its slot");

    const reread = await api("GET", `/api/admin/stories/${dbId}`, { token: admin });
    assert.deepEqual(reread.body.story.parts[0].helpAudio, ["", clip(2), clip(3)]);
  });

  it("trims trailing blanks, and [] clears the clips", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    await setMarkers(admin, dbId);

    const trimmed = await saveHelp(admin, dbId, [clip(1), "", ""]);
    assert.equal(trimmed.status, 200, JSON.stringify(trimmed.body));
    assert.deepEqual(trimmed.body.part.helpAudio, [clip(1)]);

    const allBlank = await saveHelp(admin, dbId, ["", "", ""]);
    assert.equal(allBlank.status, 200);
    assert.deepEqual(allBlank.body.part.helpAudio, []);

    assert.equal((await saveHelp(admin, dbId, [clip(1), clip(2)])).status, 200);
    const cleared = await saveHelp(admin, dbId, []);
    assert.equal(cleared.status, 200);
    assert.deepEqual(cleared.body.part.helpAudio, []);
  });

  it("refuses a non-array and an entry that is not an https URL", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    await setMarkers(admin, dbId);

    for (const [label, body] of [
      ["missing", {}],
      ["a string", { helpAudio: clip(1) }],
      ["an object", { helpAudio: { 0: clip(1) } }],
      ["null", { helpAudio: null }],
    ]) {
      const res = await api("PUT", `/api/admin/stories/${dbId}/parts/1/help-audio`, { token: admin, body });
      assert.equal(res.status, 400, `${label} → ${res.status} ${JSON.stringify(res.body)}`);
    }
    for (const [label, entry] of [
      ["http", "http://example.test/a.mp3"],
      ["javascript:", "javascript:alert(1)"],
      ["relative path", "/help/1.mp3"],
      ["protocol-relative", "//example.test/a.mp3"],
      ["with a space", "https://example.test/a b.mp3"],
      ["with a newline", "https://example.test/a.mp3\nhttps://example.test/b.mp3"],
      ["a number", 5],
      ["null", null],
    ]) {
      const res = await saveHelp(admin, dbId, [clip(1), entry]);
      assert.equal(res.status, 400, `${label} → ${res.status} ${JSON.stringify(res.body)}`);
    }

    const story = await api("GET", `/api/admin/stories/${dbId}`, { token: admin });
    assert.deepEqual(story.body.story.parts[0].helpAudio, [], "nothing refused was stored");
  });

  it("refuses more clips than the part has markers", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    await setMarkers(admin, dbId);

    const res = await saveHelp(admin, dbId, [clip(1), clip(2), clip(3), clip(4)]);
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.match(res.body.error, /3 markers/);
    // Blank slots count too: the list itself may not outgrow the markers.
    assert.equal((await saveHelp(admin, dbId, [clip(1), "", "", ""])).status, 400);
  });

  it("refuses clips on a part with no markers", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);

    const res = await saveHelp(admin, dbId, [clip(1)]);
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.match(res.body.error, /markers/);
    assert.equal((await saveHelp(admin, dbId, [""])).status, 400, "a blank still has no slot to sit in");
    assert.equal((await saveHelp(admin, dbId, [])).status, 200, "clearing is always allowed");
  });

  it("is admin-only", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    const u = await registerUser({ prefix: "sos" });
    const url = `/api/admin/stories/${dbId}/parts/1/help-audio`;
    assert.equal((await api("PUT", url, { body: { helpAudio: [] } })).status, 401);
    const asUser = await api("PUT", url, { token: u.token, body: { helpAudio: [] } });
    assert.ok([401, 403].includes(asUser.status), `a learner token got ${asUser.status}`);
  });

  it("survives a later markers save and shows in the admin story", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    await setMarkers(admin, dbId);
    assert.equal((await saveHelp(admin, dbId, [clip(1), clip(2)])).status, 200);

    await setMarkers(admin, dbId, 1, markers);
    await api("PATCH", `/api/admin/stories/${dbId}`, { token: admin, body: { storyName: "Renamed" } });

    const story = await api("GET", `/api/admin/stories/${dbId}`, { token: admin });
    assert.deepEqual(story.body.story.parts[0].helpAudio, [clip(1), clip(2)]);
  });
});

describe("POST /api/admin/stories/:id/parts/:n/upload?kind=help", () => {
  // Every refusal here happens before the bucket is touched.
  const upload = (admin, dbId, query) => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array([73, 68, 51])], { type: "audio/mpeg" }), "h.mp3");
    return api("POST", `/api/admin/stories/${dbId}/parts/1/upload?${query}`, { token: admin, body: form });
  };

  it("is refused while the part has no markers", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    const res = await upload(admin, dbId, "kind=help&index=0");
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.match(res.body.error, /markers/);
  });

  it("is refused for an index that is not a marker number", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    await setMarkers(admin, dbId);

    for (const [label, query] of [
      ["no index", "kind=help"],
      ["empty index", "kind=help&index="],
      ["negative", "kind=help&index=-1"],
      ["one past the end", "kind=help&index=3"],
      ["far past the end", "kind=help&index=99"],
      ["fractional", "kind=help&index=1.5"],
      ["not a number", "kind=help&index=abc"],
    ]) {
      const res = await upload(admin, dbId, query);
      assert.equal(res.status, 400, `${label} → ${res.status} ${JSON.stringify(res.body)}`);
      assert.match(res.body.error, /index/, label);
    }
  });
});
