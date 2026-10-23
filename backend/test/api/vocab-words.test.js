// test/api/vocab-words.test.js — the word window: a part's transcript kept on
// the server and sent only as a shape, the right answer after a quiz pick, the
// bookmarks of the копилка, and looking words up across stories.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import { adminToken, api, registerUser, startServer, stopServer } from "./harness.js";
import { getQuizAnswerKey } from "../../src/config/quizData.js";


after(stopServer);

const markers = [
  { time: 0, label: "1", color: "#ff0000" },
  { time: 5, label: "2", color: "#00ff00" },
];

// Keys are letters only (the matcher reads a key as words) and unique per run.
const letters = () =>
  Array.from({ length: 10 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
const storyId = () => `test-vw-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const word = (audioKey, anchor) => ({
  audioKey,
  word: `слово ${audioKey}`,
  definition: "",
  audioUrl: `https://example.test/${audioKey}.mp3`,
  ...(anchor ? { anchor } : {}),
});

const SECRET = "The hidden sentence mentions";

async function buildStory(admin, { publish = true, vocabByPart }) {
  const id = storyId();
  const create = await api("POST", "/api/admin/stories", {
    token: admin,
    body: { difficulty: "easy", storyId: id, storyName: "Word window test", totalParts: 3 },
  });
  assert.equal(create.status, 201, JSON.stringify(create.body));
  const dbId = create.body.story._id;
  for (const n of [1, 2, 3]) {
    const res = await api("PATCH", `/api/admin/stories/${dbId}/parts/${n}/markers`, {
      token: admin,
      body: { timeMarkers: markers, audioUrl: `https://example.test/${n}.mp3` },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const vocab = await api("PUT", `/api/admin/stories/${dbId}/parts/${n}/vocabulary`, {
      token: admin,
      body: { vocabulary: vocabByPart[n] ?? [] },
    });
    assert.equal(vocab.status, 200, JSON.stringify(vocab.body));
  }
  if (publish) {
    await api("PATCH", `/api/admin/stories/${dbId}`, {
      token: admin,
      body: { paid: true, freeParts: 2, previewSeconds: null },
    });
    const published = await api("PATCH", `/api/admin/stories/${dbId}/publish`, {
      token: admin,
      body: { published: true },
    });
    assert.equal(published.status, 200, JSON.stringify(published.body));
  }
  return { id, dbId };
}

// Built once, before any bookmark call: the server remembers the list of known
// word keys for a few minutes, so every key the tests need must exist by then.
const keyA = letters();
const keyB = letters();
const keyLocked = letters();
const keyHidden = letters();
let admin;
let story;
let draft;

before(async () => {
  await startServer();
  admin = await adminToken();
  story = await buildStory(admin, {
    vocabByPart: {
      1: [word(keyA), word(keyB, "special")],
      3: [word(keyLocked)],
    },
  });
  draft = await buildStory(admin, { publish: false, vocabByPart: { 1: [word(keyHidden)] } });
});

const transcriptUrl = (s, n = 1) => `/api/admin/stories/${s.dbId}/parts/${n}/transcript`;
const publicStory = async (headers = {}) => {
  const res = await api("GET", `/api/stories/easy/${story.id}`, headers);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res;
};
const partOne = (res) => res.body.parts[0];

describe("check-answer", () => {
  it("returns the right option for a right pick and for a wrong one", async () => {
    const key = getQuizAnswerKey("easy", "leo", 1);
    const url = "/api/progress/quiz/easy/leo/1/check-answer";
    const right = await api("POST", url, { body: { questionIndex: 0, selectedOption: key[0] } });
    const wrong = await api("POST", url, { body: { questionIndex: 0, selectedOption: (key[0] + 1) % 4 } });
    assert.deepEqual([right.status, right.body.correct, right.body.correctOption], [200, true, key[0]]);
    assert.deepEqual([wrong.status, wrong.body.correct, wrong.body.correctOption], [200, false, key[0]]);
  });
});

describe("the transcript and the public story", () => {
  it("has no textShape until a transcript is saved", async () => {
    assert.equal(partOne(await publicStory()).textShape, null);
  });

  it("saves a transcript, answers with a report, and sends only the shape", async () => {
    const text = `[slowly]${SECRET} ${keyA} today. We hear special things.`;
    const saved = await api("PUT", transcriptUrl(story), { token: admin, body: { transcript: text } });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.deepEqual(saved.body.report.missing, []);
    assert.deepEqual(
      saved.body.report.matches.map((m) => [m.key, m.text]),
      [[keyA, keyA], [keyB, "special"]],
    );

    const res = await publicStory();
    const shape = partOne(res).textShape;
    assert.ok(Array.isArray(shape.paragraphs));
    assert.deepEqual(shape.missing, []);
    assert.deepEqual(shape.paragraphs[0].filter((t) => typeof t === "string"), [keyA, keyB]);
    assert.equal(shape.paragraphs[0][0], 3, '"The"');
    assert.equal(shape.paragraphs[0].at(-1), 0);

    const json = JSON.stringify(res.body);
    assert.ok(!json.includes(SECRET), "no sentence text");
    assert.ok(!json.includes("things"), "no word of the transcript");
    assert.ok(!json.includes("slowly"));
    assert.ok(!/"anchor"/.test(json), "no anchor field anywhere");
    assert.ok(!/"transcript"/.test(json), "no transcript field");
    assert.equal(partOne(res).vocabulary.length, 2, "the words themselves are still sent");
  });

  it("is null on a part with no transcript and on a locked part", async () => {
    const res = await publicStory();
    assert.equal(res.body.parts[1].textShape, null);
    // Part 3 is locked for a guest even if it has a transcript.
    const saved = await api("PUT", transcriptUrl(story, 3), {
      token: admin,
      body: { transcript: `${SECRET} ${keyLocked}.` },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    const again = await publicStory();
    assert.equal(again.body.parts[2].locked, true);
    assert.equal(again.body.parts[2].textShape, null);
    assert.ok(!JSON.stringify(again.body).includes(SECRET));
  });

  it("previews without saving", async () => {
    const preview = await api("POST", `${transcriptUrl(story)}/preview`, {
      token: admin,
      body: { transcript: `Preview only: ${keyA}.` },
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.body));
    assert.deepEqual(preview.body.report.missing, [keyB]);
    assert.equal(preview.body.report.matches[0].key, keyA);
    assert.ok(preview.body.shape.paragraphs[0].includes(keyA));

    const saved = await api("GET", `/api/admin/stories/${story.dbId}`, { token: admin });
    assert.ok(saved.body.story.parts[0].transcript.startsWith("[slowly]"), "the saved text is untouched");
    assert.deepEqual(partOne(await publicStory()).textShape.missing, []);
  });

  it("previews with the words the author is editing in place of the saved ones", async () => {
    const preview = await api("POST", `${transcriptUrl(story)}/preview`, {
      token: admin,
      body: { transcript: "Start of the day.", words: [{ audioKey: keyB, anchor: "start" }] },
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.body));
    assert.deepEqual(preview.body.report.matches, [{ key: keyB, text: "Start" }]);
    assert.deepEqual(preview.body.report.missing, []);
  });

  it("refuses a transcript that is not a string or is too long, on save and on preview", async () => {
    for (const transcript of [42, { a: 1 }, "x".repeat(20001), undefined]) {
      const put = await api("PUT", transcriptUrl(story), { token: admin, body: { transcript } });
      assert.equal(put.status, 400, `PUT ${typeof transcript} → ${JSON.stringify(put.body)}`);
      const post = await api("POST", `${transcriptUrl(story)}/preview`, { token: admin, body: { transcript } });
      assert.equal(post.status, 400, `preview ${typeof transcript}`);
    }
    const ok = await api("PUT", transcriptUrl(story, 2), { token: admin, body: { transcript: "x".repeat(20000) } });
    assert.equal(ok.status, 200, "exactly 20000 is allowed");
    await api("PUT", transcriptUrl(story, 2), { token: admin, body: { transcript: null } });
  });

  it("is admin-only", async () => {
    const u = await registerUser({ prefix: "vw" });
    assert.equal((await api("PUT", transcriptUrl(story), { body: { transcript: null } })).status, 401);
    const asUser = await api("PUT", transcriptUrl(story), { token: u.token, body: { transcript: null } });
    assert.ok([401, 403].includes(asUser.status), `a learner token got ${asUser.status}`);
  });

  it("clears with null", async () => {
    const cleared = await api("PUT", transcriptUrl(story), { token: admin, body: { transcript: null } });
    assert.equal(cleared.status, 200, JSON.stringify(cleared.body));
    assert.equal(cleared.body.part.transcript, null);
    assert.deepEqual(cleared.body.report, { matches: [], missing: [keyA, keyB] });
    assert.equal(partOne(await publicStory()).textShape, null);
  });
});

describe("vocab bookmarks", () => {
  const url = "/api/progress/vocab-bookmarks";

  it("need an account", async () => {
    assert.equal((await api("GET", url)).status, 401);
    assert.equal((await api("PUT", url, { body: { key: keyA, bookmarked: true } })).status, 401);
  });

  it("add, list newest first, remove, and repeat harmlessly", async () => {
    const u = await registerUser({ prefix: "vwb" });
    const put = (key, bookmarked) => api("PUT", url, { token: u.token, body: { key, bookmarked } });

    assert.deepEqual((await api("GET", url, { token: u.token })).body, { bookmarks: [] });

    assert.deepEqual((await put(keyA, true)).body, { bookmarks: [keyA] });
    await sleep(15);
    assert.deepEqual((await put(keyB.toUpperCase(), true)).body, { bookmarks: [keyB, keyA] }, "keys are lowercased");
    assert.deepEqual((await put(keyB, true)).body, { bookmarks: [keyB, keyA] }, "adding twice changes nothing");
    assert.deepEqual((await api("GET", url, { token: u.token })).body, { bookmarks: [keyB, keyA] });

    assert.deepEqual((await put(keyB, false)).body, { bookmarks: [keyA] });
    const again = await put(keyB, false);
    assert.equal(again.status, 200);
    assert.deepEqual(again.body, { bookmarks: [keyA] }, "removing twice changes nothing");
  });

  it("refuse an unknown word and malformed bodies", async () => {
    const u = await registerUser({ prefix: "vwb" });
    const put = (body) => api("PUT", url, { token: u.token, body });
    assert.equal((await put({ key: `nosuchword${letters()}`, bookmarked: true })).status, 400);
    assert.equal((await put({ key: keyA })).status, 400, "no bookmarked flag");
    assert.equal((await put({ key: keyA, bookmarked: "yes" })).status, 400);
    assert.equal((await put({ key: 7, bookmarked: true })).status, 400);
    assert.equal((await put({ key: "   ", bookmarked: true })).status, 400);
    assert.deepEqual((await api("GET", url, { token: u.token })).body.bookmarks, []);
    // Taking a bookmark off an unknown word is harmless.
    assert.equal((await put({ key: "never-bookmarked", bookmarked: false })).status, 200);
  });

  it("belong to the account that made them", async () => {
    const one = await registerUser({ prefix: "vwb" });
    const two = await registerUser({ prefix: "vwb" });
    await api("PUT", url, { token: one.token, body: { key: keyA, bookmarked: true } });
    assert.deepEqual((await api("GET", url, { token: two.token })).body.bookmarks, []);
  });
});

describe("POST /api/progress/vocab-lookup", () => {
  const lookup = (keys, token) => api("POST", "/api/progress/vocab-lookup", { body: { keys }, token });

  it("returns the places of a published story's word, to a guest", async () => {
    const res = await lookup([keyA]);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.places.length, 1);
    const [place] = res.body.places;
    assert.equal(place.key, keyA);
    assert.equal(place.word, `слово ${keyA}`);
    assert.equal(place.difficulty, "easy");
    assert.equal(place.storyId, story.id);
    assert.equal(place.partNumber, 1);
    assert.equal(place.audioUrl, `https://example.test/${keyA}.mp3`);
    assert.ok(!JSON.stringify(res.body).includes('"anchor"'));
  });

  it("works signed in as well, and matches keys case-insensitively", async () => {
    const u = await registerUser({ prefix: "vwl" });
    const res = await lookup([keyA.toUpperCase(), ` ${keyB} `], u.token);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.places.map((p) => p.key).sort(), [keyA, keyB].sort());
  });

  it("ignores unknown keys, junk entries and an empty list", async () => {
    const res = await lookup([`unknown${letters()}`, 42, null, "", keyA]);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.places.map((p) => p.key), [keyA]);
    assert.deepEqual((await lookup([])).body, { places: [] });
  });

  it("refuses a body without a list", async () => {
    for (const keys of [undefined, "a", { a: 1 }]) {
      assert.equal((await lookup(keys)).status, 400);
    }
  });

  it("does not return a word from a part the caller cannot open", async () => {
    // Part 3 of the story is locked for guests and for learners with no purchase.
    const guest = await lookup([keyLocked]);
    assert.deepEqual(guest.body, { places: [] });
    const u = await registerUser({ prefix: "vwl" });
    assert.deepEqual((await lookup([keyLocked], u.token)).body, { places: [] });
  });

  it("does not return a word from a story that is not published", async () => {
    assert.deepEqual((await lookup([keyHidden])).body, { places: [] });
    assert.ok(draft.id);
  });
});

describe("POST /api/progress/migrate-guest with vocabBookmarks", () => {
  it("stores the known keys and drops the rest", async () => {
    const u = await registerUser({ prefix: "vwm" });
    const res = await api("POST", "/api/progress/migrate-guest", {
      token: u.token,
      body: {
        stories: [],
        learnedWords: [],
        vocabBookmarks: [keyA, keyB.toUpperCase(), `nosuchword${letters()}`, 5, null, keyA],
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const stored = await api("GET", "/api/progress/vocab-bookmarks", { token: u.token });
    assert.deepEqual([...stored.body.bookmarks].sort(), [keyA, keyB].sort());
  });

  it("still migrates when vocabBookmarks is absent or not a list", async () => {
    const u = await registerUser({ prefix: "vwm" });
    for (const body of [{ stories: [] }, { stories: [], vocabBookmarks: "oops" }]) {
      assert.equal((await api("POST", "/api/progress/migrate-guest", { token: u.token, body })).status, 200);
    }
    const stored = await api("GET", "/api/progress/vocab-bookmarks", { token: u.token });
    assert.deepEqual(stored.body.bookmarks, []);
  });
});
