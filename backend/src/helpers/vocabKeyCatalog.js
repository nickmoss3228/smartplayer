// helpers/vocabKeyCatalog.js
//
// Answers one question: "is this string a real vocabulary key in this app?"
//
// POST /api/progress/vocab-complete used to mint one BitWord per string in the
// request body without ever checking that the string was a word. Posting a few
// thousand random values minted a few thousand coins and maxed the wordsLearned
// achievement in a single request. Grading is server-authoritative everywhere
// else (see helpers/applyLevelCompletion.js and the re-grade in completeLevel);
// this closes the same gap for vocabulary.
//
// There are two catalogues and they need different treatment:
//
//   Legacy stories — vocabulary is bundled into the FRONTEND
//   (src/modules/vocabulary/Vocabulary.ts) and never sent to the server, so the
//   backend genuinely cannot see it. config/vocabKeys.js is a generated
//   snapshot of exactly those keys; regenerate with
//   `node scripts/generate-vocab-keys.mjs`.
//
//   Story Builder stories — vocabulary lives in the Story documents, so it is
//   read live and cached briefly rather than snapshotted. A story edited in the
//   builder must not need a redeploy before its words start counting.

import { Story } from "../models/Story.js";
import { LEGACY_VOCAB_KEYS } from "../config/vocabKeys.js";

// Story content only changes when an admin saves in the Story Builder, so a
// short TTL is plenty. The cost of being stale is bounded and self-correcting:
// a brand-new word is ignored (no coin, no progress row) for at most this long.
const DB_KEY_TTL_MS = 5 * 60 * 1000;

let cache = { keys: new Set(), expiresAt: 0, inflight: null };

async function loadDbKeys() {
  const now = Date.now();
  if (now < cache.expiresAt) return cache.keys;
  // Collapse a stampede: several students finishing a vocab round at once must
  // not each fire their own distinct() pair.
  if (cache.inflight) return cache.inflight;

  cache.inflight = (async () => {
    try {
      const [vocab, phrasal] = await Promise.all([
        Story.distinct("parts.vocabulary.audioKey"),
        Story.distinct("parts.phrasalVerbs.audioKey"),
      ]);
      const keys = new Set(
        [...vocab, ...phrasal]
          .filter((k) => typeof k === "string")
          .map((k) => k.toLowerCase().trim())
          .filter(Boolean)
      );
      cache = { keys, expiresAt: Date.now() + DB_KEY_TTL_MS, inflight: null };
      return keys;
    } catch (error) {
      // Don't poison the cache with a failure — let the next request retry.
      cache.inflight = null;
      throw error;
    }
  })();

  return cache.inflight;
}

/** Drop the DB half of the cache. Call after a Story write to skip the TTL. */
export function invalidateVocabKeyCache() {
  cache = { keys: new Set(), expiresAt: 0, inflight: null };
}

/**
 * Split already-normalised keys into those this app actually contains and
 * those it doesn't.
 *
 * The legacy set is checked first because it is in memory and covers most
 * traffic; the DB is only consulted when something isn't in it, so the common
 * case costs no query at all.
 *
 * @param {string[]} keys lowercased, trimmed
 * @returns {Promise<{ known: string[], unknown: string[] }>}
 */
export async function partitionVocabKeys(keys) {
  const needsDb = keys.some((k) => !LEGACY_VOCAB_KEYS.has(k));
  if (!needsDb) return { known: [...keys], unknown: [] };

  const dbKeys = await loadDbKeys();
  const known = [];
  const unknown = [];
  for (const key of keys) {
    if (LEGACY_VOCAB_KEYS.has(key) || dbKeys.has(key)) known.push(key);
    else unknown.push(key);
  }
  return { known, unknown };
}
