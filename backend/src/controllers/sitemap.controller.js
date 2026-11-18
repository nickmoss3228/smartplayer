// controllers/sitemap.controller.js
//
// GET /api/sitemap.xml — the sitemap crawlers read at /sitemap.xml.
//
// Public and unauthenticated. robots.txt points to /sitemap.xml, and nginx
// forwards that path here.
//
// This moved here from scripts/build-sitemap.mjs, which ran at frontend build
// time from a hard-coded list of story slugs. Stories live in the database, so
// that list drifted: a story published in the Story Builder never reached the
// sitemap. Built per request from the same sources the public roster uses
// (published, not hidden), a story appears as soon as it is published and
// disappears when it is unpublished or hidden.
//
// Per-part player URLs (/levels/:difficulty/:storyId/:trackNumber) are left out
// on purpose: they are the audio player, with no indexable text, and parts past
// a story's free allowance bounce to the paywall.
//
// No <changefreq> or <priority>: Google and Yandex ignore both. <lastmod> is
// given only for story pages, from the story's own updatedAt, so it is a real
// date rather than a build time.

import { stories as storiesRepo } from "../db/index.js";
import { config } from "../config/env.js";

const DIFFICULTIES = ["easy", "medium", "hard"];

// Punycode (A-label) of малако.рф, matching the Caddyfile and robots.txt.
const FALLBACK_ORIGIN = "https://xn--80aa4acdq.xn--p1ai";

// Public, indexable routes only; the same set the old build script submitted.
const STATIC_PATHS = ["/", "/how-to-use", "/levels", ...DIFFICULTIES.map((d) => `/levels/${d}`)];

// FRONTEND_URL when set, so staging lists staging URLs. The URL parser turns a
// Unicode host into punycode.
function siteOrigin() {
  if (config.frontendUrl) {
    try {
      return new URL(config.frontendUrl).origin;
    } catch {
      // Fall through to the production origin.
    }
  }
  return FALLBACK_ORIGIN;
}

// Slugs are author-supplied, so escape rather than trusting them.
export function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isoDay(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function renderSitemap(entries) {
  const body = entries
    .map(({ loc, lastmod }) => {
      const mod = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
      return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${mod}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export async function getSitemap(req, res) {
  try {
    const origin = siteOrigin();
    const perDifficulty = await Promise.all(
      DIFFICULTIES.map(async (difficulty) => {
        const [rows, hidden] = await Promise.all([
          storiesRepo.listStoryJson({ difficulty, publishedOnly: true }),
          storiesRepo.hiddenStoryIds(difficulty),
        ]);
        const hiddenSet = new Set(hidden);
        return rows
          .filter((story) => !hiddenSet.has(story.storyId))
          // Oldest first, as the shelf shows them; the slug breaks ties.
          .sort(
            (a, b) =>
              new Date(a.createdAt) - new Date(b.createdAt) || a.storyId.localeCompare(b.storyId),
          )
          .map((story) => ({
            loc: `${origin}/levels/${difficulty}/${encodeURIComponent(story.storyId)}`,
            lastmod: isoDay(story.updatedAt),
          }));
      }),
    );

    const entries = [...STATIC_PATHS.map((p) => ({ loc: origin + p })), ...perDifficulty.flat()];
    res
      .status(200)
      .set("Content-Type", "application/xml; charset=utf-8")
      .set("Cache-Control", "public, max-age=3600")
      .send(renderSitemap(entries));
  } catch (error) {
    console.error("getSitemap error:", error);
    res.status(500).type("text/plain").send("Sitemap unavailable");
  }
}
