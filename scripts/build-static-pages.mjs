// Runs after `vite build`. Writes a copy of dist/index.html per public route
// (and per published story) into dist/_pages, with that page's <title>,
// description, canonical and Open Graph tags already in the HTML.
//
// Why: Telegram and VK build link previews without running JavaScript, so tags
// that React sets at runtime are invisible to them. nginx serves these copies
// (`/_pages$uri.html`, wired separately); every other route still gets the
// plain index.html shell with its generic tags.
//
// A story published after a deploy gets its copy at the next frontend deploy.
// Until then the shell's generic tags apply to its link previews; React still
// sets the right tags for browsers and for Yandex, which runs JavaScript.
//
// Usage: node scripts/build-static-pages.mjs [--offline]
//   SEO_API_ORIGIN overrides where the story lists are fetched from.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { injectHead, storyMeta, ORIGIN } from "./seo-head.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const pages = JSON.parse(readFileSync(join(root, "src/seo/pages.json"), "utf8"));
const shell = readFileSync(join(dist, "index.html"), "utf8");
const offline = process.argv.includes("--offline");
const apiOrigin = process.env.SEO_API_ORIGIN ?? ORIGIN;

const write = (path, meta) => {
  const file = join(dist, "_pages", path === "/" ? "index.html" : `${path}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, injectHead(shell, { ...meta, path }));
};

let written = 0;
let stories = 0;

for (const [path, meta] of Object.entries(pages)) {
  write(path, meta);
  written++;
}

const fetchList = async (difficulty) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`${apiOrigin}/api/stories/${difficulty}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

if (!offline) {
  for (const difficulty of ["easy", "medium", "hard"]) {
    try {
      const data = await fetchList(difficulty);
      const hidden = new Set(data.hidden ?? []);
      const levelDescription = pages[`/levels/${difficulty}`].description;
      for (const s of data.stories ?? []) {
        if (!s.storyId || hidden.has(s.storyId)) continue;
        const path = `/levels/${difficulty}/${s.storyId}`;
        const meta = storyMeta(
          path,
          {
            title: s.localized?.title?.ru || s.storyName,
            description: s.localized?.description?.ru || s.description,
            coverUrl: s.coverUrl,
          },
          levelDescription
        );
        write(path, meta);
        written++;
        stories++;
      }
    } catch (err) {
      console.warn(`static pages: skipped ${difficulty} stories (${err.message ?? err})`);
    }
  }
}

console.log(`static pages: ${written} written (${stories} stories)`);
