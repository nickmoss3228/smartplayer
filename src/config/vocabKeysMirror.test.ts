import { describe, it, expect } from 'vitest';

import { trackVocabulary, trackPhrasalVerbs } from '../modules/vocabulary/Vocabulary';
import { LEGACY_VOCAB_KEYS } from '../../backend/src/config/vocabKeys.js';

/**
 * backend/src/config/vocabKeys.js is a generated snapshot of every vocabulary
 * progress key in the bundled story catalogue. The server needs it because
 * those decks live only in this frontend bundle and are never sent to it — so
 * without the snapshot, POST /api/progress/vocab-complete cannot tell a real
 * word from an invented one, and mints a BitWord for both.
 *
 * That makes it a hand-regenerated mirror, and this repo already has a bad
 * history with those: config/quizData.js carries a "must be updated by hand or
 * scoring will use stale data" warning with nothing enforcing it. This test is
 * the enforcement for this one.
 *
 * When it fails, the fix is never to edit the generated file:
 *     node scripts/generate-vocab-keys.mjs
 *
 * A stale snapshot is a quiet, user-facing failure — a student answers a newly
 * added word correctly, the server doesn't recognise it, and they silently earn
 * nothing. (The server does log a loud [vocab] warning when that happens, but
 * only after it has already shipped.)
 */

/** Must stay identical to collectKeys() in scripts/generate-vocab-keys.mjs. */
function collectKeys(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const child of node) collectKeys(child, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const entry = node as { word?: unknown; audioKey?: unknown };
  if (typeof entry.word === 'string') {
    const source =
      typeof entry.audioKey === 'string' && entry.audioKey.trim()
        ? entry.audioKey
        : entry.word;
    const key = source.toLowerCase().trim();
    if (key) out.add(key);
    return;
  }
  for (const child of Object.values(node)) collectKeys(child, out);
}

const expected = new Set<string>();
collectKeys(trackVocabulary, expected);
collectKeys(trackPhrasalVerbs, expected);

const sorted = (s: Set<string>) => [...s].sort();

describe('backend vocab key snapshot mirrors Vocabulary.ts', () => {
  it('is not empty (a broken generator must not silently pass)', () => {
    expect(expected.size).toBeGreaterThan(100);
    expect(LEGACY_VOCAB_KEYS.size).toBeGreaterThan(100);
  });

  it('contains exactly the keys the player reports', () => {
    // Compared as sorted arrays rather than sets so a failure names the drift
    // instead of just saying two Sets differ.
    expect(sorted(LEGACY_VOCAB_KEYS)).toEqual(sorted(expected));
  });

  it('stores keys already lowercased and trimmed', () => {
    for (const key of LEGACY_VOCAB_KEYS) {
      expect(key).toBe(key.toLowerCase().trim());
    }
  });
});
