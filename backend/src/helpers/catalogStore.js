// helpers/catalogStore.js
//
// The live catalog: the `story` table's published rows, built into the product
// set config/priceCatalog.js knows how to price.
//
// Same split as config/sessions.js ↔ helpers/sessionStore.js. priceCatalog.js
// is the pure arithmetic and knows nothing about a database; this file is the
// I/O and knows nothing about pricing. That is what lets the rules that decide
// what a customer is charged be tested without Postgres.
//
// ── Why it is cached ─────────────────────────────────────────────────────────
//
// Every gated request needs the catalog — every story list, every part of
// every story, every basket. That is a query on the hot path of the whole app
// for data that changes when an admin clicks publish, i.e. almost never. The
// cache is held for CATALOG_TTL_MS and dropped outright by invalidate(), which
// every admin write calls, so an edit in /admin is visible on the next request
// rather than up to a TTL later.
//
// ── Why a failed read does not lock anyone out ───────────────────────────────
//
// accessFor() refuses stories the catalog does not know. An empty catalog would
// therefore refuse EVERYTHING — a transient database blip would read to a
// paying customer as their library being wiped. So a failed load falls back to
// BUILT_IN_CATALOG and, crucially, is not cached: the next request tries again.
// The fallback under-serves (it cannot know about Story Builder stories) but it
// never over-serves, because it grants nothing that was not already shipped in
// the source tree.

import { BUILT_IN_CATALOG, BUILT_IN_ROWS, buildCatalog } from "../config/priceCatalog.js";
import { stories as storiesRepo } from "../db/index.js";

/** Long enough to take the query off the hot path, short enough to self-heal. */
export const CATALOG_TTL_MS = 60_000;

let cached = null;
let cachedAt = 0;
/** De-duplicates concurrent misses so a cold cache is one query, not N. */
let inFlight = null;
/** Bumped by invalidate(); a load only caches if no invalidate happened since it began. */
let generation = 0;

/**
 * Rows the database does not have yet.
 *
 * Until the seed script has run, the story table holds only Story Builder
 * stories — leo, maya and daniel live in the static files and have no row.
 * Dropping them from the catalog would refuse content that has always been
 * free to read, so the built-in rows fill the gaps. A DB row of the same key
 * ALWAYS wins: that is what makes an admin's price edit take effect.
 */
function withBuiltInFallback(rows) {
  const seen = new Set(rows.map((r) => r.key));
  return [...rows, ...BUILT_IN_ROWS.filter((r) => !seen.has(r.key))];
}

async function load() {
  const rows = await storiesRepo.catalogRows();
  return buildCatalog(withBuiltInFallback(rows));
}

/**
 * The catalog for this request. Always await it; never hold the result across
 * requests, or an admin's edit will not be seen.
 */
export async function getCatalog() {
  const now = Date.now();
  if (cached && now - cachedAt < CATALOG_TTL_MS) return cached;
  if (inFlight) return inFlight;

  // A load that started before the latest invalidate() may have read rows from
  // before the admin's write. It still answers the callers that were already
  // waiting on it, but it must not become the cache (see `generation`).
  const startedAt = generation;
  const promise = load()
    .then((catalog) => {
      if (startedAt === generation) {
        cached = catalog;
        cachedAt = Date.now();
      }
      return catalog;
    })
    .catch((error) => {
      // Deliberately NOT cached — see the header. Logged rather than thrown so
      // one unreachable database does not take down every gated route.
      console.error("[catalogStore] falling back to built-in rows:", error?.message ?? error);
      return BUILT_IN_CATALOG;
    })
    .finally(() => {
      // Only clear our own slot: invalidate() may already have replaced it.
      if (inFlight === promise) inFlight = null;
    });
  inFlight = promise;

  return promise;
}

/**
 * Drop the cache. Every admin write that can change what is sold, listed or
 * priced must call this — creating, editing, publishing or deleting a story —
 * AFTER the write has committed, or a request in between rebuilds the cache
 * from the old rows and keeps it for a TTL.
 */
export function invalidateCatalog() {
  cached = null;
  cachedAt = 0;
  // A load already in flight began before this write: bump the generation so
  // it cannot set the cache, and forget it so later callers start a fresh one.
  generation += 1;
  inFlight = null;
}

/** Tests only: forget the cache AND any in-flight load. */
export function resetCatalogStoreForTests() {
  invalidateCatalog();
}
