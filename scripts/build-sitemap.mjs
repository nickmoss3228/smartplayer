// Generates public/sitemap.xml from the app's own route and story tables.
//
// Runs as part of `npm run build`, BEFORE `vite build`, so the freshly written
// file is picked up by Vite's public/ copy step and lands in dist/. Running it
// after would emit a sitemap nobody ships.
//
// Why generate rather than hand-maintain a static file: the story catalogue is
// the part of the URL space that actually changes, and a hand-written sitemap
// drifts the moment a story is added. Drift is silent — the sitemap keeps
// validating, it just stops describing the site. Reading the same table the app
// renders from means the two cannot disagree.
//
// Before this existed there was no sitemap at all. /sitemap.xml fell through
// nginx's SPA fallback and returned index.html with a 200 and
// `content-type: text/html`, which is worse than a 404: a crawler asking for
// XML got an HTML document claiming to be the sitemap.
//
// Usage:
//   node scripts/build-sitemap.mjs           # writes public/sitemap.xml
//   node scripts/build-sitemap.mjs --check    # print the URLs, write nothing
//
// Exits non-zero on failure, which fails the build. That is deliberate: a
// deploy that silently ships a stale or empty sitemap is harder to notice than
// one that stops.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

// Punycode (A-label), matching the Caddyfile and robots.txt. Caddy, the
// certificate, and every log line use this form, so the sitemap agreeing with
// them means one less thing to reconcile when Search Console disagrees with
// what you think you deployed. малако.рф -> xn--80aa4acdq.xn--p1ai
const ORIGIN = "https://xn--80aa4acdq.xn--p1ai";

const checkOnly = process.argv.includes("--check");

// ── the story pages ────────────────────────────────────────────────────────
// Stories live in the database (moved there 2026-10-02 — see
// backend/src/scripts/seedBuiltInStories.ts), and this build runs in a Docker
// stage with neither a database nor the backend source (.dockerignore drops
// backend/). So the story pages to submit are listed here. That is also the
// right place for the decision: not every story needs to be in a search index,
// and a story added in the Story Builder is submitted by adding its line.
const STORY_PAGES = {
  easy: ["leo", "leo-additional", "news-roland-garros", "news-grazing-board"],
  medium: ["maya"],
  hard: ["daniel"],
};

const DIFFICULTIES = ["easy", "medium", "hard"];

// ── the URL set ────────────────────────────────────────────────────────────
// Public, indexable routes only. Everything under ProtectedRoute (/dashboard,
// /room, /game, /players) is excluded, and so is the auth surface (/login,
// /signup, /forgot-password) and /admin — all of which robots.txt also
// disallows. Listing a page here that robots.txt blocks is a direct
// contradiction and Search Console reports it as one.
//
// The per-track player route (/levels/:difficulty/:storySlug/:trackNumber) is
// deliberately absent. Those are the audio player itself: no indexable text,
// and every part past a story's free allowance bounces back to the paywall.
// Submitting them would mostly be submitting redirects.
const urls = [
  "/",
  "/how-to-use",
  "/levels",
  ...DIFFICULTIES.map((d) => `/levels/${d}`),
  ...DIFFICULTIES.flatMap((d) => STORY_PAGES[d].map((slug) => `/levels/${d}/${slug}`)),
];

// Slugs are author-supplied, so escape rather than trusting them to stay
// ASCII-safe forever.
const xmlEscape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

// No <lastmod>, <changefreq>, or <priority>, all on purpose.
//
// changefreq and priority are ignored by both Google and Yandex — they are
// hints from an era when crawlers trusted sites about their own importance.
//
// lastmod is the interesting omission. An accurate lastmod is genuinely useful,
// but the only accurate source here is git, and .dockerignore excludes .git
// from the build context — so inside the production image there is nothing to
// read a real date from. The tempting fallback, stamping every URL with the
// build time, would claim the whole site changed on every CI run including runs
// that touched one CSS file. Search engines respond to lastmod they have caught
// lying by ignoring the field entirely, which costs the credibility that would
// make a real lastmod worth having later. Better to say nothing than to say
// something false.
const body = urls
  .map((u) => `  <url>\n    <loc>${xmlEscape(ORIGIN + u)}</loc>\n  </url>`)
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

if (checkOnly) {
  for (const u of urls) console.log(ORIGIN + u);
  console.log(`\n${urls.length} URLs (nothing written — --check)`);
} else {
  const dest = path.join(root, "public", "sitemap.xml");
  fs.writeFileSync(dest, xml, "utf8");
  console.log(`sitemap: ${urls.length} URLs -> ${path.relative(root, dest)}`);
}
