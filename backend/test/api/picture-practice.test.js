// test/api/picture-practice.test.js — the comic quiz ("where did it happen?")
// and pictures on vocabulary words: saved from the Builder, refused when
// malformed, and sent only with the parts a reader may open.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import { adminToken, api, registerUser, startServer, stopServer } from "./harness.js";

before(startServer);
after(stopServer);

const storyId = () => `test-pics-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
const markers = [
  { time: 0, label: "1", color: "#ff0000" },
  { time: 5, label: "2", color: "#00ff00" },
];
const COMIC = "/assets/leo/comics/1. Meet Leo.jpg";

const panels = [
  { x: 0, y: 0, w: 0.5, h: 0.5 },
  { x: 0.5, y: 0, w: 0.5, h: 0.5 },
  { x: 0, y: 0.5, w: 1, h: 0.5 },
];
const quiz = {
  panels,
  // Out of order on purpose: the server keeps them in story order.
  clips: [
    { start: 5, end: 9.12345, panel: 2 },
    { start: 0, end: 2.5, panel: 0 },
    { start: 2.5, end: 5, panel: 1 },
  ],
};

async function buildStory(admin, totalParts = 3) {
  const id = storyId();
  const create = await api("POST", "/api/admin/stories", {
    token: admin,
    body: { difficulty: "easy", storyId: id, storyName: "Picture test", totalParts },
  });
  assert.equal(create.status, 201, JSON.stringify(create.body));
  return { id, dbId: create.body.story._id };
}

const withComic = async (admin, dbId, n = 1) => {
  const res = await api("PUT", `/api/admin/stories/${dbId}/parts/${n}/comic`, {
    token: admin,
    body: { comicUrl: COMIC },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
};

const savePanelQuiz = (admin, dbId, panelQuiz, n = 1) =>
  api("PUT", `/api/admin/stories/${dbId}/parts/${n}/panel-quiz`, { token: admin, body: { panelQuiz } });

const word = (audioKey, image) => ({
  audioKey,
  word: `слово ${audioKey}`,
  definition: "",
  audioUrl: `https://example.test/${audioKey}.mp3`,
  image,
});

describe("PUT /api/admin/stories/:id/parts/:n/panel-quiz", () => {
  it("stores the quiz with its lines in story order, and null clears it", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    await withComic(admin, dbId);

    const saved = await savePanelQuiz(admin, dbId, quiz);
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    const stored = saved.body.part.panelQuiz;
    assert.deepEqual(stored.panels, panels);
    assert.deepEqual(
      stored.clips.map((c) => [c.start, c.panel]),
      [[0, 0], [2.5, 1], [5, 2]],
      "sorted by start time",
    );
    assert.equal(stored.clips[2].end, 9.123, "times are kept to the millisecond");

    const reread = await api("GET", `/api/admin/stories/${dbId}`, { token: admin });
    assert.deepEqual(reread.body.story.parts[0].panelQuiz, stored);

    const cleared = await savePanelQuiz(admin, dbId, null);
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.part.panelQuiz, null);
  });

  it("refuses a malformed quiz, and one on a part with no comic page", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);

    const noComic = await savePanelQuiz(admin, dbId, quiz);
    assert.equal(noComic.status, 400, JSON.stringify(noComic.body));
    assert.match(noComic.body.error, /comic page/);

    await withComic(admin, dbId);
    const clip = (over) => ({ start: 0, end: 2, panel: 0, ...over });
    for (const [label, panelQuiz] of [
      ["missing", undefined],
      ["a list", [panels]],
      ["no panels", { panels: [], clips: [clip()] }],
      ["no clips", { panels, clips: [] }],
      ["25 panels", { panels: Array.from({ length: 25 }, () => panels[0]), clips: [clip()] }],
      ["panel off the page", { panels: [{ x: 0.6, y: 0, w: 0.5, h: 0.5 }], clips: [clip()] }],
      ["panel with no area", { panels: [{ x: 0, y: 0, w: 0, h: 0.5 }], clips: [clip()] }],
      ["panel not numbers", { panels: [{ x: "0", y: 0, w: 1, h: 1 }], clips: [clip()] }],
      ["clip to a missing panel", { panels, clips: [clip({ panel: 3 })] }],
      ["clip ending before it starts", { panels, clips: [clip({ start: 3, end: 2 })] }],
      ["negative start", { panels, clips: [clip({ start: -1 })] }],
      ["fractional panel index", { panels, clips: [clip({ panel: 0.5 })] }],
    ]) {
      const res = await api("PUT", `/api/admin/stories/${dbId}/parts/1/panel-quiz`, {
        token: admin,
        body: panelQuiz === undefined ? {} : { panelQuiz },
      });
      assert.equal(res.status, 400, `${label} → ${res.status} ${JSON.stringify(res.body)}`);
      assert.match(res.body.error, /comic quiz|panelQuiz/i, label);
    }

    const story = await api("GET", `/api/admin/stories/${dbId}`, { token: admin });
    assert.equal(story.body.story.parts[0].panelQuiz, null, "nothing refused was stored");
  });

  it("is admin-only", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    const u = await registerUser({ prefix: "pics" });
    const url = `/api/admin/stories/${dbId}/parts/1/panel-quiz`;
    assert.equal((await api("PUT", url, { body: { panelQuiz: null } })).status, 401);
    const asUser = await api("PUT", url, { token: u.token, body: { panelQuiz: null } });
    assert.ok([401, 403].includes(asUser.status), `a learner token got ${asUser.status}`);
  });

  it("survives the other Builder saves, which rewrite the story wholesale", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    await withComic(admin, dbId);
    assert.equal((await savePanelQuiz(admin, dbId, quiz)).status, 200);

    await api("PATCH", `/api/admin/stories/${dbId}/parts/1/markers`, {
      token: admin,
      body: { timeMarkers: markers, audioUrl: "https://example.test/a.mp3" },
    });
    await api("PUT", `/api/admin/stories/${dbId}/parts/1/vocabulary`, {
      token: admin,
      body: { vocabulary: [word("flat")] },
    });
    await api("PATCH", `/api/admin/stories/${dbId}`, { token: admin, body: { storyName: "Renamed" } });

    const story = await api("GET", `/api/admin/stories/${dbId}`, { token: admin });
    assert.equal(story.body.story.parts[0].panelQuiz?.clips.length, 3);
  });
});

describe("pictures on vocabulary words", () => {
  const crop = { url: COMIC, box: { x: 0.1, y: 0.2, w: 0.3, h: 0.25 }, aspect: 0.8 };

  it("stores a whole picture and a crop; a word with none stays text", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);

    const saved = await api("PUT", `/api/admin/stories/${dbId}/parts/1/vocabulary`, {
      token: admin,
      body: {
        vocabulary: [
          word("flat", { url: "https://example.test/flat.png" }),
          word("cat", crop),
          word("near"),
        ],
      },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    const [flat, cat, near] = saved.body.part.vocabulary;
    assert.deepEqual(flat.image, { url: "https://example.test/flat.png", box: null, aspect: null });
    assert.deepEqual(cat.image, crop);
    assert.equal(near.image, null);

    // Phrasal verbs take the same field.
    const phrasal = await api("PUT", `/api/admin/stories/${dbId}/parts/1/phrasal-verbs`, {
      token: admin,
      body: { phrasalVerbs: [word("pick up", crop)] },
    });
    assert.equal(phrasal.status, 200, JSON.stringify(phrasal.body));
    assert.deepEqual(phrasal.body.part.phrasalVerbs[0].image, crop);
  });

  it("refuses a picture that is not an image address or a crop that is not one", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    for (const [label, image] of [
      ["javascript: url", { url: "javascript:alert(1)" }],
      ["http: url", { url: "http://example.test/a.png" }],
      ["protocol-relative url", { url: "//elsewhere.test/a.png" }],
      ["url with a newline", { url: "/a.png\n/b.png" }],
      ["no url", { box: crop.box, aspect: 1 }],
      ["crop without aspect", { url: COMIC, box: crop.box }],
      ["crop off the image", { url: COMIC, box: { x: 0.9, y: 0, w: 0.5, h: 0.5 }, aspect: 1 }],
      ["negative aspect", { url: COMIC, box: crop.box, aspect: -1 }],
      ["not an object", "flat.png"],
    ]) {
      const res = await api("PUT", `/api/admin/stories/${dbId}/parts/1/vocabulary`, {
        token: admin,
        body: { vocabulary: [word("flat", image)] },
      });
      assert.equal(res.status, 400, `${label} → ${res.status} ${JSON.stringify(res.body)}`);
      assert.match(res.body.error, /picture|crop/i, label);
    }
  });

  it("refuses picture uploads with no word key, or that are not images", async () => {
    // Every refusal here happens before the bucket is touched.
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    const file = (type) => {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array([137, 80, 78, 71])], { type }), "p.png");
      return form;
    };
    const upload = (query, type = "image/png") =>
      api("POST", `/api/admin/stories/${dbId}/parts/1/upload?${query}`, { token: admin, body: file(type) });

    assert.equal((await upload("kind=vocabImage")).status, 400, "no audioKey");
    assert.equal((await upload("kind=phrasalImage&audioKey=..%2Fx")).status, 400, "path in the key");
    const audio = await upload("kind=vocabImage&audioKey=flat", "audio/mpeg");
    assert.equal(audio.status, 400);
    assert.match(audio.body.error, /picture/i);
    assert.equal((await upload("kind=pictureSheet", "text/html")).status, 400, "an html sheet");
  });
});

describe("the public story", () => {
  async function publishedStory(admin, access) {
    const { id, dbId } = await buildStory(admin);
    for (const n of [1, 2, 3]) {
      const res = await api("PATCH", `/api/admin/stories/${dbId}/parts/${n}/markers`, {
        token: admin,
        body: { timeMarkers: markers, audioUrl: `https://example.test/${n}.mp3` },
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      await withComic(admin, dbId, n);
      assert.equal((await savePanelQuiz(admin, dbId, quiz, n)).status, 200);
      await api("PUT", `/api/admin/stories/${dbId}/parts/${n}/vocabulary`, {
        token: admin,
        body: { vocabulary: [word("flat", { url: "https://example.test/flat.png" })] },
      });
    }
    await api("PATCH", `/api/admin/stories/${dbId}`, { token: admin, body: { paid: true, ...access } });
    const published = await api("PATCH", `/api/admin/stories/${dbId}/publish`, {
      token: admin,
      body: { published: true },
    });
    assert.equal(published.status, 200, JSON.stringify(published.body));
    return id;
  }

  it("sends the comic quiz and the pictures with an open part, and neither with a locked one", async () => {
    const admin = await adminToken();
    const id = await publishedStory(admin, { freeParts: 2, previewSeconds: null });

    const guest = await api("GET", `/api/stories/easy/${id}`);
    assert.equal(guest.status, 200, JSON.stringify(guest.body));
    const [one, , three] = guest.body.parts;
    assert.equal(one.locked, false);
    assert.equal(one.panelQuiz.clips.length, 3, "an open part carries its game");
    assert.equal(one.panelQuiz.clips[0].panel, 0, "with its answers — it is unscored practice");
    assert.equal(one.vocabulary[0].image.url, "https://example.test/flat.png");

    assert.equal(three.locked, true);
    assert.equal(three.panelQuiz, null, "a locked part does not");
    assert.deepEqual(three.vocabulary, []);
  });

  it("keeps the comic quiz off a timed preview, like the quiz", async () => {
    const admin = await adminToken();
    const id = await publishedStory(admin, { freeParts: 0, previewSeconds: 30 });

    const guest = await api("GET", `/api/stories/easy/${id}`);
    const [one] = guest.body.parts;
    assert.equal(one.preview, true, JSON.stringify(one));
    assert.equal(one.panelQuiz, null);
    assert.deepEqual(one.quiz, []);
  });
});
