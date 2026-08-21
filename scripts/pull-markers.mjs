// Copies a story's time markers OUT of the database and into the repo, so
// deleting a draft stops destroying them.
//
// The loop this fixes: markers can only be placed in the Story Builder (you
// need the waveform), the Story Builder saves them to the DB, and re-importing
// a story reads timeMarkers from the STATIC source. importStory 409s when a
// doc already exists, so changing static content means delete-then-reimport —
// which wiped every marker, every time.
//
// Run this after placing markers. The JSON it writes is read back by
// src/modules/audiodata/markers/index.ts, so the next import carries them in,
// and they survive a dropped staging DB and the prod/staging split for free.
//
// Usage:
//   npm run pull:markers -- --story news-roland-garros
//   npm run pull:markers -- --story news-roland-garros --difficulty easy
//   npm run pull:markers -- --all --difficulty easy
//   npm run pull:markers -- --story news-roland-garros --dry-run
//
//   --api <url>    backend to read from       (default: VITE_API_URL from .env)
//   --code <word>  admin code word            (default: ADMIN_CODE from backend/.env)
//
// Reads DRAFTS as well as published stories, which is the normal case — you
// pull markers long before publishing — so it authenticates as an admin rather
// than using the public endpoints.
//
// IMPORTANT: it reads from whichever backend --api points at, and staging and
// production have SEPARATE databases. Pull from the environment where you
// actually placed the markers.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const MARKERS_DIR = path.join(root, "src/modules/audiodata/markers");

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n) => {
  const i = argv.indexOf(`--${n}`);
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  return argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
};

function fromEnvFile(file, key) {
  try {
    const line = fs
      .readFileSync(path.join(root, file), "utf8")
      .split("\n")
      .find((l) => l.trim().startsWith(`${key}=`));
    return line?.slice(line.indexOf("=") + 1).trim() || undefined;
  } catch {
    return undefined;
  }
}

const apiBase = (value("api") ?? fromEnvFile(".env", "VITE_API_URL") ?? "").replace(/\/$/, "");
const adminCode = value("code") ?? fromEnvFile("backend/.env", "ADMIN_CODE");
const difficulty = value("difficulty") ?? "easy";
const storyArg = value("story");
const pullAll = flag("all");
const dryRun = flag("dry-run");

if (!apiBase) {
  console.error("No backend URL. Pass --api <url> or set VITE_API_URL in .env.");
  process.exit(2);
}
if (!adminCode) {
  console.error("No admin code. Pass --code <word> or set ADMIN_CODE in backend/.env.");
  process.exit(2);
}
if (!storyArg && !pullAll) {
  console.error("Nothing to pull. Pass --story <storyId>, or --all for every story of a difficulty.");
  process.exit(2);
}

async function json(res) {
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`);
  return JSON.parse(body);
}

// ── talk to the backend ────────────────────────────────────────────────────
console.log(`Backend:    ${apiBase}`);
console.log(`Difficulty: ${difficulty}\n`);

const { token } = await json(
  await fetch(`${apiBase}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: adminCode }),
  }),
).catch((err) => {
  console.error(`Admin login failed: ${err.message}`);
  process.exit(1);
});

const auth = { Authorization: `Bearer ${token}` };
const { stories } = await json(
  await fetch(`${apiBase}/api/admin/stories?difficulty=${difficulty}`, { headers: auth }),
).catch((err) => {
  console.error(`Could not list stories: ${err.message}`);
  process.exit(1);
});

const wanted = pullAll ? stories : stories.filter((s) => s.storyId === storyArg);
if (!wanted.length) {
  console.error(
    `No ${difficulty} story with storyId "${storyArg}" in this database.\n` +
      `  Stories there: ${stories.map((s) => s.storyId).join(", ") || "(none)"}\n` +
      `  Staging and production have separate databases — is --api pointing at the right one?`,
  );
  process.exit(1);
}

// ── write one file per story ───────────────────────────────────────────────
let wrote = 0;
let totalMarkers = 0;

for (const listed of wanted) {
  const story = await json(
    await fetch(`${apiBase}/api/admin/stories/${listed._id}`, { headers: auth }),
  );

  const parts = {};
  let count = 0;
  for (const part of story.parts ?? []) {
    // Persist only the three fields the app consumes. The DB rows carry Mongo
    // _id fields that would otherwise churn the diff on every pull without
    // meaning anything to the player.
    const markers = (part.timeMarkers ?? []).map(({ time, label, color }) => ({ time, label, color }));
    parts[String(part.partNumber)] = markers;
    count += markers.length;
  }

  const file = path.join(MARKERS_DIR, `${difficulty}.${story.storyId}.json`);
  const existed = fs.existsSync(file);
  const previous = existed ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
  const before = previous
    ? Object.values(previous.parts ?? {}).reduce((n, m) => n + m.length, 0)
    : 0;

  const partSummary = Object.entries(parts)
    .map(([n, m]) => `part ${n}: ${m.length}`)
    .join(", ");
  console.log(`${story.storyId}`);
  console.log(`  ${partSummary || "(no parts)"}`);
  console.log(`  ${before} marker(s) in the repo -> ${count}${existed ? "" : "  (new file)"}`);

  // A pull that would replace real markers with nothing is almost always the
  // wrong database rather than a genuine deletion, so it needs saying out loud.
  if (before > 0 && count === 0) {
    console.log("  ! this would erase every marker already saved here — skipping.");
    console.log("    Re-run with the right --api if you pulled from the wrong environment,");
    console.log("    or delete the file by hand if the markers really are gone.");
    continue;
  }

  if (dryRun) {
    console.log("  (dry run, not written)\n");
    continue;
  }

  fs.writeFileSync(
    file,
    `${JSON.stringify(
      { difficulty, storyId: story.storyId, pulledAt: new Date().toISOString(), parts },
      null,
      2,
    )}\n`,
  );
  console.log(`  written: ${path.relative(root, file)}\n`);
  wrote++;
  totalMarkers += count;
}

console.log(
  dryRun
    ? "Dry run — nothing written."
    : `Wrote ${wrote} file(s), ${totalMarkers} marker(s) total.` +
        (wrote ? "\nNew stories also need an import + map entry in markers/index.ts." : ""),
);
