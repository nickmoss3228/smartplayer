// test/api/part-handout.test.js — the Russian translation of a part (saved in
// the Story Builder) and the handout endpoint that sends it, with the
// transcript as text, to a caller who may open the part outright.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import { adminToken, api, registerUser, startServer, stopServer } from "./harness.js";

after(stopServer);

const markers = [
  { time: 0, label: "1", color: "#ff0000" },
  { time: 5, label: "2", color: "#00ff00" },
];

// Keys are letters only (the matcher reads a key as words) and unique per run.
const letters = () =>
  Array.from({ length: 10 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
const storyId = () => `test-ph-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;

const keyA = letters();
const SECRET_DIRECTION = "whispering softly";

async function buildStory(admin, { publish = true, access }) {
  const id = storyId();
  const create = await api("POST", "/api/admin/stories", {
    token: admin,
    body: { difficulty: "easy", storyId: id, storyName: "Handout test", totalParts: 3 },
  });
  assert.equal(create.status, 201, JSON.stringify(create.body));
  const dbId = create.body.story._id;
  for (const n of [1, 2, 3]) {
    const res = await api("PATCH", `/api/admin/stories/${dbId}/parts/${n}/markers`, {
      token: admin,
      body: { timeMarkers: markers, audioUrl: `https://example.test/${n}.mp3` },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
  }
  const vocab = await api("PUT", `/api/admin/stories/${dbId}/parts/1/vocabulary`, {
    token: admin,
    body: {
      vocabulary: [
        {
          audioKey: keyA,
          word: "слово",
          definition: "a test word",
          audioUrl: `https://example.test/${keyA}.mp3`,
        },
      ],
    },
  });
  assert.equal(vocab.status, 200, JSON.stringify(vocab.body));
  const patched = await api("PATCH", `/api/admin/stories/${dbId}`, { token: admin, body: access });
  assert.equal(patched.status, 200, JSON.stringify(patched.body));
  if (publish) {
    const published = await api("PATCH", `/api/admin/stories/${dbId}/publish`, {
      token: admin,
      body: { published: true },
    });
    assert.equal(published.status, 200, JSON.stringify(published.body));
  }
  return { id, dbId };
}

let admin;
let story; // paid, first 2 parts free
let freeStory; // not paid: every part open
let previewStory; // paid, no free parts, part 1 is a timed sample
let draft;

before(async () => {
  await startServer();
  admin = await adminToken();
  story = await buildStory(admin, { access: { paid: true, freeParts: 2, previewSeconds: null } });
  freeStory = await buildStory(admin, { access: { paid: false } });
  previewStory = await buildStory(admin, { access: { paid: true, freeParts: 0, previewSeconds: 30 } });
  draft = await buildStory(admin, { publish: false, access: { paid: true, freeParts: 2, previewSeconds: null } });
});

const translationUrl = (s, n = 1) => `/api/admin/stories/${s.dbId}/parts/${n}/translation`;
const transcriptUrl = (s, n = 1) => `/api/admin/stories/${s.dbId}/parts/${n}/transcript`;
const handoutUrl = (s, n = 1) => `/api/stories/easy/${s.id}/parts/${n}/handout`;

const saveTranscript = async (s, n, transcript) => {
  const res = await api("PUT", transcriptUrl(s, n), { token: admin, body: { transcript } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
};

describe("PUT /api/admin/stories/:id/parts/:partNumber/translation", () => {
  it("saves the text trimmed, with line endings normalised, and answers with the part", async () => {
    const res = await api("PUT", translationUrl(story), {
      token: admin,
      body: { translation: "  Первый абзац.\r\n\r\nВторой абзац.  \n" },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.part.partNumber, 1);
    assert.equal(res.body.part.translation, "Первый абзац.\n\nВторой абзац.");

    const saved = await api("GET", `/api/admin/stories/${story.dbId}`, { token: admin });
    assert.equal(saved.body.story.parts[0].translation, "Первый абзац.\n\nВторой абзац.");
    assert.equal(saved.body.story.parts[1].translation, null, "other parts are untouched");
  });

  it("treats null and blank text as clearing it", async () => {
    for (const translation of [null, "   \n\n  "]) {
      await api("PUT", translationUrl(story, 2), { token: admin, body: { translation: "Что-то." } });
      const res = await api("PUT", translationUrl(story, 2), { token: admin, body: { translation } });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.part.translation, null, JSON.stringify(translation));
    }
  });

  it("refuses a value that is not a string, is too long, or is missing", async () => {
    for (const translation of [42, { a: 1 }, ["x"], "x".repeat(20001), undefined]) {
      const res = await api("PUT", translationUrl(story), { token: admin, body: { translation } });
      assert.equal(res.status, 400, `${typeof translation} → ${JSON.stringify(res.body)}`);
    }
    const ok = await api("PUT", translationUrl(story, 3), { token: admin, body: { translation: "я".repeat(20000) } });
    assert.equal(ok.status, 200, "exactly 20000 is allowed");
    await api("PUT", translationUrl(story, 3), { token: admin, body: { translation: null } });
  });

  it("is admin-only", async () => {
    const u = await registerUser({ prefix: "ph" });
    assert.equal((await api("PUT", translationUrl(story), { body: { translation: null } })).status, 401);
    const asUser = await api("PUT", translationUrl(story), { token: u.token, body: { translation: null } });
    assert.ok([401, 403].includes(asUser.status), `a learner token got ${asUser.status}`);
  });
});

describe("GET /api/stories/:difficulty/:storyId/parts/:partNumber/handout", () => {
  it("sends the transcript as text runs with the part's word marked, and the translation by paragraph", async () => {
    await saveTranscript(
      story,
      1,
      `[${SECRET_DIRECTION}] We say ${keyA} today.\n\nNext paragraph [pauses] is plain.`,
    );
    await api("PUT", translationUrl(story), {
      token: admin,
      body: { translation: "Мы говорим сегодня.\n\nСледующий абзац простой." },
    });

    const res = await api("GET", handoutUrl(story));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const { body } = res;
    assert.equal(body.partNumber, 1);
    assert.equal(body.totalParts, 3);
    assert.equal(body.storyName, "Handout test");

    assert.equal(body.text.length, 2, "two paragraphs");
    const marked = body.text[0].filter((run) => run.word !== undefined);
    assert.deepEqual(marked, [{ text: keyA, word: 0 }]);
    assert.deepEqual(body.words, [{ kind: "vocabulary", en: keyA, ru: "слово", definition: "a test word" }]);
    assert.equal(body.text[1].some((run) => run.word !== undefined), false);
    assert.equal(body.text[0].map((run) => run.text).join("").trim(), `We say ${keyA} today.`);

    assert.deepEqual(body.translation, ["Мы говорим сегодня.", "Следующий абзац простой."]);
  });

  it("leaves stage directions out of the text", async () => {
    const res = await api("GET", handoutUrl(story));
    assert.equal(res.status, 200);
    const json = JSON.stringify(res.body.text);
    assert.ok(!json.includes(SECRET_DIRECTION));
    assert.ok(!json.includes("pauses"));
    const spoken = res.body.text.flat().map((run) => run.text).join(" ");
    assert.ok(!spoken.includes("[") && !spoken.includes("]"));
  });

  it("also answers a signed-in learner, and has a null translation and empty text when none is saved", async () => {
    const u = await registerUser({ prefix: "ph" });
    const signedIn = await api("GET", handoutUrl(story), { token: u.token });
    assert.equal(signedIn.status, 200, JSON.stringify(signedIn.body));
    assert.equal(signedIn.body.text.length, 2);

    // Part 2 is free too, but has neither a transcript nor a translation.
    const bare = await api("GET", handoutUrl(story, 2));
    assert.equal(bare.status, 200, JSON.stringify(bare.body));
    assert.deepEqual(bare.body.text, []);
    assert.equal(bare.body.translation, null);
    assert.deepEqual(bare.body.words, []);
  });

  it("opens every part of a story that is not paid", async () => {
    await saveTranscript(freeStory, 3, "The last part.");
    const res = await api("GET", handoutUrl(freeStory, 3));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.text[0][0].text, "The last part.");
  });

  it("is 403 for a part beyond the free ones, to a guest and to a learner with no purchase", async () => {
    await saveTranscript(story, 3, "A secret locked sentence.");
    const guest = await api("GET", handoutUrl(story, 3));
    assert.equal(guest.status, 403, JSON.stringify(guest.body));
    const u = await registerUser({ prefix: "ph" });
    const member = await api("GET", handoutUrl(story, 3), { token: u.token });
    assert.equal(member.status, 403, JSON.stringify(member.body));
    assert.ok(!JSON.stringify([guest.body, member.body]).includes("secret locked"));
  });

  it("is 403 for a part that only plays as a timed preview", async () => {
    await saveTranscript(previewStory, 1, "The sample part says something.");
    const res = await api("GET", handoutUrl(previewStory, 1));
    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.ok(!JSON.stringify(res.body).includes("sample part"));
  });

  it("is 404 for a part that does not exist, and for a story that is not published", async () => {
    assert.equal((await api("GET", handoutUrl(story, 9))).status, 404);
    assert.equal((await api("GET", handoutUrl(story, 0))).status, 404);
    assert.equal((await api("GET", `/api/stories/easy/${story.id}/parts/abc/handout`)).status, 404);
    assert.equal((await api("GET", handoutUrl(draft, 1))).status, 404);
    assert.equal((await api("GET", `/api/stories/easy/no-such-story-${letters()}/parts/1/handout`)).status, 404);
  });
});
