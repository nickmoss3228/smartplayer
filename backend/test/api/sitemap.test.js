// test/api/sitemap.test.js — GET /api/sitemap.xml is built from the live
// catalogue: published, visible stories only.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// The harness MUST be the first project import — see its header.
import { adminToken, api, startServer, stopServer } from "./harness.js";
import { renderSitemap, xmlEscape } from "../../src/controllers/sitemap.controller.js";

before(startServer);
after(stopServer);

const markers = [
  { time: 0, label: "start", color: "#ff0000" },
  { time: 5, label: "end", color: "#00ff00" },
];
const slug = (tag) => `test-sitemap-${tag}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;

async function makeStory(admin, { published, hidden = false }) {
  const id = slug(published ? "pub" : "draft");
  const create = await api("POST", "/api/admin/stories", {
    token: admin,
    body: { difficulty: "easy", storyId: id, storyName: "Sitemap test", totalParts: 1 },
  });
  assert.equal(create.status, 201, JSON.stringify(create.body));
  if (published) {
    // Publishing needs audio and markers on every part.
    const audio = await api("PATCH", `/api/admin/stories/${create.body.story._id}/parts/1/markers`, {
      token: admin,
      body: { timeMarkers: markers, audioUrl: "https://example.test/1.mp3" },
    });
    assert.equal(audio.status, 200, JSON.stringify(audio.body));
    const res = await api("PATCH", `/api/admin/stories/${create.body.story._id}/publish`, {
      token: admin,
      body: { published: true },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
  }
  if (hidden) {
    const res = await api("PUT", `/api/admin/stories/visibility/easy/${id}`, {
      token: admin,
      body: { hidden: true },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
  }
  return id;
}

const locs = (xml) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

describe("GET /api/sitemap.xml", () => {
  it("lists static pages and visible published stories only", async () => {
    const admin = await adminToken();
    const published = await makeStory(admin, { published: true });
    const draft = await makeStory(admin, { published: false });
    const hidden = await makeStory(admin, { published: true, hidden: true });

    const res = await api("GET", "/api/sitemap.xml");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /^application\/xml; charset=utf-8$/i);
    assert.equal(res.headers.get("cache-control"), "public, max-age=3600");

    const xml = res.body;
    assert.equal(typeof xml, "string");
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    const all = locs(xml);
    assert.equal((xml.match(/<url>/g) || []).length, all.length, "one <url> per <loc>");
    assert.equal((xml.match(/<\/url>/g) || []).length, all.length);

    const origin = new URL(all[0]).origin;
    for (const p of ["/", "/how-to-use", "/levels", "/levels/easy", "/levels/medium", "/levels/hard"]) {
      assert.ok(all.includes(origin + p), `static ${p} present`);
    }
    assert.ok(all.includes(`${origin}/levels/easy/${published}`), "published story present");
    assert.ok(!all.some((l) => l.includes(draft)), "unpublished story absent");
    assert.ok(!all.some((l) => l.includes(hidden)), "hidden story absent");

    assert.match(
      xml,
      new RegExp(`<loc>[^<]*${published}</loc>\\s*<lastmod>\\d{4}-\\d{2}-\\d{2}</lastmod>`),
      "story URL carries a YYYY-MM-DD lastmod",
    );
    assert.ok(!xml.split("</url>")[0].includes("<lastmod>"), "static URLs carry no lastmod");
    assert.ok(!/changefreq|priority/.test(xml));
  });
});

describe("xml escaping", () => {
  it("escapes the five XML specials in every loc", () => {
    assert.equal(xmlEscape(`a&b<c>d"e'f`), "a&amp;b&lt;c&gt;d&quot;e&apos;f");
    const xml = renderSitemap([{ loc: "https://x.test/a?b=1&c=<2>", lastmod: "2026-01-02" }]);
    assert.ok(xml.includes("<loc>https://x.test/a?b=1&amp;c=&lt;2&gt;</loc>"));
    assert.ok(xml.includes("<lastmod>2026-01-02</lastmod>"));
  });
});
