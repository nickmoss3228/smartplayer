// test/api/story-cast.test.js — a story's characters: saved whole from the
// Builder, sent to every reader of the story, refused when malformed.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import { adminToken, api, registerUser, startServer, stopServer } from "./harness.js";

before(startServer);
after(stopServer);

const storyId = () => `test-cast-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
const markers = [
  { time: 0, label: "start", color: "#ff0000" },
  { time: 5, label: "end", color: "#00ff00" },
];

async function buildStory(admin, totalParts = 3) {
  const id = storyId();
  const create = await api("POST", "/api/admin/stories", {
    token: admin,
    body: { difficulty: "easy", storyId: id, storyName: "Cast test", totalParts },
  });
  assert.equal(create.status, 201, JSON.stringify(create.body));
  return { id, dbId: create.body.story._id };
}

const leo = {
  key: "leo",
  name: { en: " Leo ", ru: "Лео" },
  role: { en: "26, Saint Petersburg", ru: "26 лет, Петербург" },
  bio: { en: "Works in IT and loves his cat.", ru: "Работает в IT и любит свою кошку." },
  imageUrl: "/assets/covers/leo.jpg",
  firstPart: 1,
};
const sam = {
  key: "sam",
  name: { en: "Sam", ru: "Сэм" },
  role: { en: "An old school friend", ru: "" },
  bio: { en: "", ru: "" },
  imageUrl: null,
  firstPart: 3,
};

describe("PUT /api/admin/stories/:id/cast", () => {
  it("stores the cast normalised, in order, and an empty list clears it", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);

    const fresh = await api("GET", `/api/admin/stories/${dbId}`, { token: admin });
    assert.deepEqual(fresh.body.story.cast, [], "a new story has no cast");

    const saved = await api("PUT", `/api/admin/stories/${dbId}/cast`, {
      token: admin,
      body: { cast: [{ ...leo, key: "LEO" }, sam] },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.deepEqual(
      saved.body.story.cast.map((m) => m.key),
      ["leo", "sam"],
      "order is the admin's, keys lowercased",
    );
    assert.equal(saved.body.story.cast[0].name.en, "Leo", "text is trimmed");
    assert.equal(saved.body.story.cast[1].firstPart, 3);

    const cleared = await api("PUT", `/api/admin/stories/${dbId}/cast`, { token: admin, body: { cast: [] } });
    assert.equal(cleared.status, 200);
    assert.deepEqual(cleared.body.story.cast, []);
  });

  it("refuses a malformed cast and names what is wrong", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    const member = (over) => ({ ...leo, ...over });

    for (const [label, body] of [
      ["missing", {}],
      ["not a list", { cast: { leo } }],
      ["13 members", { cast: Array.from({ length: 13 }, (_, i) => member({ key: `m${i}` })) }],
      ["path in key", { cast: [member({ key: "../x" })] }],
      ["empty key", { cast: [member({ key: "" })] }],
      ["duplicate keys", { cast: [member({}), member({ key: "Leo" })] }],
      ["firstPart 0", { cast: [member({ firstPart: 0 })] }],
      ["firstPart past the end", { cast: [member({ firstPart: 4 })] }],
      ["firstPart not an integer", { cast: [member({ firstPart: 1.5 })] }],
      ["no name", { cast: [member({ name: { en: " ", ru: "" } })] }],
      ["name not text", { cast: [member({ name: { en: 7 } })] }],
      ["bio too long", { cast: [member({ bio: { en: "x".repeat(601), ru: "" } })] }],
      ["javascript: image", { cast: [member({ imageUrl: "javascript:alert(1)" })] }],
      ["http: image", { cast: [member({ imageUrl: "http://example.test/a.jpg" })] }],
    ]) {
      const res = await api("PUT", `/api/admin/stories/${dbId}/cast`, { token: admin, body });
      assert.equal(res.status, 400, `${label} → ${res.status} ${JSON.stringify(res.body)}`);
      assert.match(res.body.error, /cast/i, label);
    }

    const story = await api("GET", `/api/admin/stories/${dbId}`, { token: admin });
    assert.deepEqual(story.body.story.cast, [], "nothing refused was stored");
  });

  it("is admin-only, and 404s an unknown story", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    const u = await registerUser({ prefix: "cast" });

    assert.equal((await api("PUT", `/api/admin/stories/${dbId}/cast`, { body: { cast: [] } })).status, 401);
    const asUser = await api("PUT", `/api/admin/stories/${dbId}/cast`, { token: u.token, body: { cast: [] } });
    assert.ok([401, 403].includes(asUser.status), `a learner token got ${asUser.status}`);
    assert.equal(
      (await api("PUT", "/api/admin/stories/00000000-0000-4000-8000-000000000000/cast", {
        token: admin,
        body: { cast: [] },
      })).status,
      404,
    );
  });

  it("survives every other Builder save (they rewrite the story wholesale)", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    await api("PUT", `/api/admin/stories/${dbId}/cast`, { token: admin, body: { cast: [leo, sam] } });

    await api("PATCH", `/api/admin/stories/${dbId}/parts/1/markers`, {
      token: admin,
      body: { timeMarkers: markers, audioUrl: "https://example.test/a.mp3" },
    });
    await api("PUT", `/api/admin/stories/${dbId}/parts/1/intro`, {
      token: admin,
      body: { intro: { title: { en: "Part one", ru: "" } } },
    });
    await api("PATCH", `/api/admin/stories/${dbId}`, { token: admin, body: { storyName: "Renamed" } });

    const story = await api("GET", `/api/admin/stories/${dbId}`, { token: admin });
    assert.deepEqual(story.body.story.cast.map((m) => m.key), ["leo", "sam"]);
  });
});

describe("the cast on the public story", () => {
  it("goes to every reader — a guest on a paid story with nothing free included", async () => {
    const admin = await adminToken();
    const { id, dbId } = await buildStory(admin);
    await api("PUT", `/api/admin/stories/${dbId}/cast`, { token: admin, body: { cast: [leo, sam] } });
    for (const n of [1, 2, 3]) {
      const res = await api("PATCH", `/api/admin/stories/${dbId}/parts/${n}/markers`, {
        token: admin,
        body: { timeMarkers: markers, audioUrl: `https://example.test/${n}.mp3` },
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
    }
    await api("PATCH", `/api/admin/stories/${dbId}`, { token: admin, body: { paid: true, freeParts: 0 } });
    const published = await api("PATCH", `/api/admin/stories/${dbId}/publish`, {
      token: admin,
      body: { published: true },
    });
    assert.equal(published.status, 200, JSON.stringify(published.body));

    const guest = await api("GET", `/api/stories/easy/${id}`);
    assert.equal(guest.status, 200, JSON.stringify(guest.body));
    assert.equal(guest.body.locked, true, "the story itself is locked for a guest");
    // Revealing members part by part is the page's job, not the server's.
    assert.deepEqual(guest.body.cast.map((m) => m.key), ["leo", "sam"]);
    assert.equal(guest.body.cast[1].name.en, "Sam");

    // The roster stays light: no cast in the list.
    const list = await api("GET", "/api/stories/easy");
    const row = list.body.stories.find((s) => s.storyId === id);
    assert.ok(row, "the published story is listed");
    assert.equal(row.cast, undefined);
  });
});

describe("POST /api/admin/stories/:id/cast/:key/portrait", () => {
  // Every refusal here happens before the bucket is touched, so these run
  // without storage credentials.
  const image = (type = "image/png") => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array([137, 80, 78, 71])], { type }), "p.png");
    return form;
  };

  it("refuses a bad key, a missing file and a non-image", async () => {
    const admin = await adminToken();
    const { dbId } = await buildStory(admin);
    const url = (key) => `/api/admin/stories/${dbId}/cast/${key}/portrait`;

    const badKey = await api("POST", url("..%2Fx"), { token: admin, body: image() });
    assert.equal(badKey.status, 400, JSON.stringify(badKey.body));

    const noFile = await api("POST", url("leo"), { token: admin, body: new FormData() });
    assert.equal(noFile.status, 400, JSON.stringify(noFile.body));

    const audio = await api("POST", url("leo"), { token: admin, body: image("audio/mpeg") });
    assert.equal(audio.status, 400, JSON.stringify(audio.body));
    assert.match(audio.body.error, /portrait/i);

    assert.equal((await api("POST", url("leo"), { body: image() })).status, 401);
  });
});
