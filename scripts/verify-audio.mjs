// Checks that every audio clip the app can ask for actually loads, for one
// environment, in one pass.
//
// Why this exists: a story's audio is only working if three independent things
// line up, and none of them implies the others.
//
//   1. the code references a URL     (static: quizData.js / audioData* / Vocabulary.ts)
//   2. an object sits at that key    (in THAT environment's bucket)
//   3. published DB stories point at THAT environment's bucket
//
// Production and staging have separate buckets AND separate databases, but the
// branch only decides the code. So a merge can be perfectly correct and still
// ship silence, and a Story row copied between environments keeps the other
// bucket's hostname inside its audioUrl — healthy-looking in Mongo, 404 for
// every player. That last case is what --env is really for: this script flags
// any stored URL that belongs to a different bucket than the one being checked.
//
// Needs no credentials. It only makes public GETs against the bucket and the
// public /api/stories endpoints, which is deliberate — it should be runnable
// from anywhere, including before a merge, without handing it any secrets.
//
// Usage:
//   node scripts/verify-audio.mjs                        # env from .env
//   node scripts/verify-audio.mjs --env production
//   node scripts/verify-audio.mjs --env staging
//   node scripts/verify-audio.mjs --env staging --api http://89.169.159.92
//   node scripts/verify-audio.mjs --static-only          # no backend needed
//   node scripts/verify-audio.mjs --verbose              # list every OK clip too
//
// Exits non-zero if anything failed, so it can gate a merge.

import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

// ── args ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const exact = argv.indexOf(`--${name}`);
  if (exact !== -1 && argv[exact + 1] && !argv[exact + 1].startsWith("--")) return argv[exact + 1];
  return argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
};

const BUCKETS = {
  production: "https://storage.yandexcloud.net/audioplayer-data",
  staging: "https://storage.yandexcloud.net/audioplayer-data-staging",
};

// Reads a key out of the local .env rather than requiring it on the command
// line — the same file `npm run dev` builds against, so a bare run checks
// whatever environment you are currently pointed at.
function fromDotEnv(key) {
  try {
    const line = fs
      .readFileSync(path.join(root, ".env"), "utf8")
      .split("\n")
      .find((l) => l.trim().startsWith(`${key}=`));
    return line?.slice(line.indexOf("=") + 1).trim() || undefined;
  } catch {
    return undefined;
  }
}

const envName = value("env");
if (envName && !BUCKETS[envName]) {
  console.error(`Unknown --env "${envName}". Use one of: ${Object.keys(BUCKETS).join(", ")}.`);
  process.exit(2);
}

const bucketBase = (
  value("bucket") ??
  (envName ? BUCKETS[envName] : undefined) ??
  fromDotEnv("VITE_YOS_BASE_URL") ??
  BUCKETS.production
).replace(/\/$/, "");

const apiBase = (value("api") ?? fromDotEnv("VITE_API_URL") ?? "").replace(/\/$/, "");
const verbose = flag("verbose");
const staticOnly = flag("static-only");
const dbOnly = flag("db-only");

// ── load the static data ───────────────────────────────────────────────────
// storyRegistry.js and quizData.js are plain ESM and import directly. The
// track list and the vocab/phrasal tables are frontend TypeScript, so they go
// through esbuild first — with VITE_YOS_BASE_URL substituted for the bucket
// under test, which is the whole point: the same source produces production
// URLs or staging URLs depending on what we're verifying.
async function loadFrontendData() {
  // Inside node_modules/.cache rather than the OS temp dir: the bundle leaves
  // real dependencies external (axios, via services/yandexStorage), and node
  // resolves those relative to the importing FILE — from /tmp there is no
  // node_modules to walk up to and the import dies on `axios`.
  const cache = path.join(root, "node_modules", ".cache", "verify-audio");
  fs.mkdirSync(cache, { recursive: true });
  const entry = path.join(cache, `entry-${process.pid}.ts`);
  const out = path.join(cache, `bundle-${process.pid}.mjs`);
  fs.writeFileSync(
    entry,
    [
      `export { getAudioTracksByStory } from ${JSON.stringify(path.join(root, "src/modules/audiodata/audioDataByDifficulty"))};`,
      `export { trackVocabulary, trackPhrasalVerbs, trackFolderMap, storyFolderMap } from ${JSON.stringify(path.join(root, "src/modules/vocabulary/Vocabulary"))};`,
    ].join("\n"),
  );
  try {
    await build({
      entryPoints: [entry],
      bundle: true,
      format: "esm",
      platform: "node",
      outfile: out,
      packages: "external",
      logLevel: "warning",
      define: { "import.meta.env.VITE_YOS_BASE_URL": JSON.stringify(bucketBase) },
    });
    return await import(`${new URL(`file://${out.replace(/\\/g, "/")}`).href}?t=${Date.now()}`);
  } finally {
    fs.rmSync(entry, { force: true });
    fs.rmSync(out, { force: true });
  }
}

// ── probing ────────────────────────────────────────────────────────────────
// Range: bytes=0-0 so a healthy clip costs one byte instead of several MB.
// S3 ignores Range on an error and returns its XML body anyway, which is the
// case we want the body for. Retried because a flaky link otherwise reports
// perfectly good files as broken.
async function probe(url, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
      if (res.status === 200 || res.status === 206) {
        await res.arrayBuffer();
        return { ok: true };
      }
      const code = /<Code>([^<]+)<\/Code>/.exec(await res.text().catch(() => ""))?.[1] ?? "";
      return { ok: false, why: `HTTP ${res.status}${code ? ` ${code}` : ""}` };
    } catch (err) {
      if (i === attempts - 1) return { ok: false, why: `network: ${err.message}` };
      await new Promise((r) => setTimeout(r, 700 * (i + 1)));
    }
  }
  return { ok: false, why: "network" };
}

const isHttp = (u) => typeof u === "string" && /^https?:\/\//.test(u);

// ── collect what to check ──────────────────────────────────────────────────
const targets = []; // { group, label, url }
const unwired = []; // { group, label } — deliberately not recorded yet
const mismatched = []; // { group, label, url } — points at another environment

function add(group, label, url) {
  if (!isHttp(url)) return unwired.push({ group, label });
  if (!url.startsWith(bucketBase)) mismatched.push({ group, label, url });
  targets.push({ group, label, url });
}

async function collectStatic() {
  const { getAudioTracksByStory, trackVocabulary, trackPhrasalVerbs, trackFolderMap, storyFolderMap } =
    await loadFrontendData();
  const { storyRegistry } = await import(
    new URL("../backend/src/config/storyRegistry.js", import.meta.url).href
  );
  const { quizData } = await import(
    new URL("../backend/src/config/quizData.js", import.meta.url).href
  );

  for (const [difficulty, stories] of Object.entries(storyRegistry)) {
    for (const { storyId } of stories) {
      for (const track of getAudioTracksByStory(difficulty, storyId)) {
        const id = track.id;
        const group = `static ${difficulty}/${storyId} part ${id}`;
        add(group, `main track "${track.title}"`, track.audio);

        // Mirrors useVocabAudio's path formula exactly — if this drifts, the
        // check silently stops matching what the player requests.
        const storyFolder = storyFolderMap[difficulty]?.[storyId] ?? "";
        const trackFolder = trackFolderMap[difficulty]?.[storyId]?.[id] ?? "";
        for (const [kind, table, sub] of [
          ["vocab", trackVocabulary, "vocab"],
          ["phrasal", trackPhrasalVerbs, "phrasal-verbs"],
        ]) {
          for (const entry of table[difficulty]?.[storyId]?.[id] ?? []) {
            const key = (entry.audioKey ?? entry.word).toLowerCase();
            const url =
              storyFolder && trackFolder
                ? `${bucketBase}/${encodeURIComponent(`${storyFolder}/quiz/${trackFolder}/${sub}/${key}.mp3`).replace(/%2F/g, "/")}`
                : "";
            add(group, `${kind} "${key}"`, url);
          }
        }

        (quizData[difficulty]?.[storyId]?.[id] ?? []).forEach((q, i) => {
          add(group, `quiz q${i + 1} fast`, q.audio?.fast);
          add(group, `quiz q${i + 1} slow`, q.audio?.slow);
        });
      }
    }
  }
}

async function collectDb() {
  if (!apiBase) {
    console.log("No API base URL — skipping published DB stories.");
    console.log("  Pass --api <url>, or set VITE_API_URL in .env.\n");
    return;
  }
  for (const difficulty of ["easy", "medium", "hard"]) {
    let list;
    try {
      const res = await fetch(`${apiBase}/api/stories/${difficulty}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      list = (await res.json()).stories ?? [];
    } catch (err) {
      console.log(`Could not list published ${difficulty} stories from ${apiBase}: ${err.message}`);
      continue;
    }
    for (const { storyId } of list) {
      const res = await fetch(`${apiBase}/api/stories/${difficulty}/${storyId}`);
      if (!res.ok) continue;
      const story = await res.json();
      for (const part of story.parts ?? []) {
        const group = `DB ${difficulty}/${storyId} part ${part.partNumber}`;
        add(group, "main track", part.audioUrl);
        for (const [kind, list] of [
          ["vocab", part.vocabulary ?? []],
          ["phrasal", part.phrasalVerbs ?? []],
        ]) {
          for (const w of list) add(group, `${kind} "${w.audioKey ?? w.word}"`, w.audioUrl);
        }
        (part.quiz ?? []).forEach((q, i) => {
          add(group, `quiz q${i + 1} fast`, q.audio?.fast);
          add(group, `quiz q${i + 1} slow`, q.audio?.slow);
        });
      }
    }
  }
}

// ── run ────────────────────────────────────────────────────────────────────
console.log(`Bucket: ${bucketBase}`);
console.log(`API:    ${apiBase || "(none — static only)"}\n`);

if (!dbOnly) await collectStatic();
if (!staticOnly) await collectDb();

console.log(`Checking ${targets.length} clips…\n`);

const failures = [];
const queue = [...targets];
let checked = 0;
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const t = queue.shift();
      const r = await probe(t.url);
      checked++;
      if (!r.ok) failures.push({ ...t, why: r.why });
      else if (verbose) console.log(`  ok  ${t.group} — ${t.label}`);
    }
  }),
);

const byGroup = (rows) =>
  rows.reduce((m, r) => ((m[r.group] ??= []).push(r), m), Object.create(null));

if (failures.length) {
  console.log(`FAILED (${failures.length}):`);
  for (const [group, rows] of Object.entries(byGroup(failures))) {
    console.log(`  ${group}`);
    for (const r of rows) console.log(`     ✗ ${r.why}  ${r.label}\n         ${r.url}`);
  }
  console.log("");
}

if (mismatched.length) {
  console.log(`WRONG BUCKET (${mismatched.length}) — stored URLs from another environment:`);
  for (const [group, rows] of Object.entries(byGroup(mismatched))) {
    console.log(`  ${group}: ${rows.length} clip(s), e.g. ${rows[0].url}`);
  }
  console.log("");
}

if (unwired.length) {
  const groups = Object.entries(byGroup(unwired));
  console.log(`Not wired yet (${unwired.length} clips, ${groups.length} part(s)) — no URL in the source at all:`);
  for (const [group, rows] of groups) console.log(`  ${group}: ${rows.length}`);
  console.log("");
}

console.log(`${checked - failures.length}/${checked} clips OK.`);
process.exit(failures.length ? 1 : 0);
