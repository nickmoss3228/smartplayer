// Generates backend/src/config/vocabKeys.js — the set of vocabulary progress
// keys the server will accept from POST /api/progress/vocab-complete.
//
// Why this exists: legacy story vocabulary lives only in the frontend bundle
// (src/modules/vocabulary/Vocabulary.ts), so the backend had no way to tell a
// real vocab key from a string a client made up, and minted BitWord for both.
// DB-authored stories are checked live against the Story model instead — this
// file covers only the legacy catalogue, which is static and never changes at
// runtime.
//
// Regenerate after editing Vocabulary.ts:
//   node scripts/generate-vocab-keys.mjs
// config/vocabKeys.test.js fails if the checked-in file is stale.

import { build } from "esbuild";
import { readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "src/modules/vocabulary/Vocabulary.ts");
const OUT = path.join(root, "backend/src/config/vocabKeys.js");
const TMP = path.join(root, "node_modules/.vocab-keys-tmp.mjs");

// The key the player actually reports is `(audioKey ?? word).toLowerCase()` —
// see VocabChip.tsx and VocabQuiz.tsx. Mirroring that exactly matters: an
// entry with no audioKey reports its `word`, which for these decks can be
// non-Latin text.
function collectKeys(node, out) {
  if (Array.isArray(node)) {
    for (const child of node) collectKeys(child, out);
    return;
  }
  if (!node || typeof node !== "object") return;
  if (typeof node.word === "string") {
    const key = (typeof node.audioKey === "string" && node.audioKey.trim()
      ? node.audioKey
      : node.word
    ).toLowerCase().trim();
    if (key) out.add(key);
    return;
  }
  for (const child of Object.values(node)) collectKeys(child, out);
}

await build({
  entryPoints: [SOURCE],
  outfile: TMP,
  format: "esm",
  platform: "node",
  bundle: false,
  logLevel: "silent",
});

const mod = await import(`${pathToFileURL(TMP).href}?t=${Date.now()}`);
await rm(TMP, { force: true });

const keys = new Set();
collectKeys(mod.trackVocabulary ?? {}, keys);
collectKeys(mod.trackPhrasalVerbs ?? {}, keys);

const sorted = [...keys].sort();
const header = await readFile(SOURCE, "utf8").then((s) => s.length);

const body = `// GENERATED FILE — DO NOT EDIT BY HAND.
// Run: node scripts/generate-vocab-keys.mjs
//
// Every vocabulary progress key in the legacy (bundled) story catalogue, which
// is the only vocabulary the backend cannot otherwise see: those decks live in
// the frontend's src/modules/vocabulary/Vocabulary.ts and are never sent to the
// server. DB-authored stories are validated against the Story model at request
// time instead, so they are deliberately absent here.
//
// Keys are already lowercased and trimmed, matching what the player reports —
// \`(audioKey ?? word).toLowerCase()\`, see VocabChip.tsx.
//
// Source bytes at generation time: ${header}
// Entries: ${sorted.length}

export const LEGACY_VOCAB_KEYS = new Set(${JSON.stringify(sorted, null, 2)});
`;

await writeFile(OUT, body, "utf8");
console.log(`wrote ${OUT}`);
console.log(`entries: ${sorted.length}`);
console.log(`sample:`, sorted.slice(0, 8));
console.log(`non-latin sample:`, sorted.filter((k) => /[^\x00-\x7F]/.test(k)).slice(0, 5));
