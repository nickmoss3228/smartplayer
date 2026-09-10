// config/entitlements.js
//
// Who may hear what. This is the decision layer of the paywall and it is
// deliberately PURE — no mongoose, no JWT, no env, no clock of its own. Same
// split as config/sessions.js ↔ helpers/sessionStore.js, and for the same
// reason its test file gives: the interesting failures here are boundary
// conditions, and boundary conditions are only cheap to test when there is no
// database in the loop.
//
// Every gated path in the app calls accessFor(). There is exactly one copy of
// this rule and it lives on the server. The client is TOLD what it owns by
// GET /api/me/entitlements; it never recomputes it.

import {
  STARTER_STORIES,
  PACK_STORIES,
  PAID_STORY_KEYS,
  PAID_PREVIEW_PARTS,
  getProduct,
  storyKey,
} from "./priceCatalog.js";
import { FREE_TRIAL_STORIES } from "./trial.js";

export { storyKey };

const PAID_SET = new Set(PAID_STORY_KEYS);

/**
 * A story nobody sells is free.
 *
 * This matters more than it looks. An admin can publish a story through the
 * Story Builder that appears in no SKU at all — and until someone adds it to
 * the catalog, it must keep behaving the way every story behaved before the
 * paywall existed. Failing open for unknown content means monetizing a story
 * is an explicit act (add it to priceCatalog.js), never an accident of
 * omission, and it means a typo in a slug produces a free story rather than an
 * unreachable one nobody can buy.
 */
export const isPaidStory = (key) => PAID_SET.has(key);

export const isFreeStory = (key) => !isPaidStory(key);

/**
 * Active iff perpetual, or now is strictly before expiresAt.
 *
 * The boundary is chosen, not incidental: AT expiresAt the pass is expired.
 * "Ends at midnight" is what a customer reads on a receipt, and a pass that
 * survives its own expiry instant is a bug that only shows up under a clock
 * skew nobody can reproduce.
 */
export function isActive(row, now = Date.now()) {
  if (!row || typeof row.sku !== "string") return false;
  if (row.expiresAt === null || row.expiresAt === undefined) return true;
  const ends = row.expiresAt instanceof Date ? row.expiresAt.getTime() : Date.parse(row.expiresAt);
  if (Number.isNaN(ends)) return false; // unparseable expiry — fail closed
  return now < ends;
}

/**
 * Collapses a user's rows into "what can this account reach right now".
 *
 * Returns the all-access flag separately from the story set because the pass
 * covers stories that DO NOT EXIST YET — expanding it into a list here would
 * silently stop granting new content the day it is added.
 */
export function resolveAccess(entitlements, now = Date.now()) {
  const stories = new Set();
  let allAccess = false;
  // Two separate facts, because null means "never expires" and conflating it
  // with "no pass seen yet" is exactly how the first expiry got dropped: the
  // very first pass row found neither an existing max to beat nor a reason to
  // assign, so it silently reported perpetual access.
  let sawPerpetualPass = false;
  let latestPassEnd = null; // ms since epoch, or null when none is dated

  for (const row of Array.isArray(entitlements) ? entitlements : []) {
    if (!isActive(row, now)) continue;

    const product = getProduct(row.sku);
    // A row naming a SKU that has left the catalog grants nothing, and must
    // not throw: catalogs get edited, rows are permanent, and an exception
    // here would take down the story endpoint for that one user.
    if (!product) continue;

    if (product.kind === "pass") {
      allAccess = true;
      if (row.expiresAt === null || row.expiresAt === undefined) {
        sawPerpetualPass = true;
      } else {
        // Two overlapping passes: the later expiry is the one that matters.
        const ends = +new Date(row.expiresAt);
        latestPassEnd = latestPassEnd === null ? ends : Math.max(latestPassEnd, ends);
      }
      continue;
    }

    if (product.kind === "pack") {
      for (const key of PACK_STORIES[row.sku] ?? []) stories.add(key);
      continue;
    }

    if (product.storyKey) stories.add(product.storyKey);
  }

  // A perpetual pass outranks any dated one — it is strictly more access.
  const allAccessExpiresAt =
    !allAccess || sawPerpetualPass || latestPassEnd === null ? null : new Date(latestPassEnd);

  return { stories, allAccess, allAccessExpiresAt };
}

/**
 * THE gate. Returns how much of one story a caller may hear.
 *
 *   owned      — every part is unlocked
 *   freeParts  — when not owned, how many parts from the start are playable
 *
 * `authenticated` is a separate argument rather than being inferred from a
 * non-empty entitlements array, because a signed-in user who has bought
 * nothing has an empty array too — and they are entitled to the whole starter
 * pack, while a guest is not.
 */
export function accessFor(
  entitlements,
  difficulty,
  storyId,
  { authenticated = false, now = Date.now() } = {},
) {
  const key = storyKey(difficulty, storyId);

  // Free content: registered users get all of it, guests keep the same
  // two-part trial they have always had. This is the ONLY thing that changed
  // meaning rather than behaviour — FREE_TRIAL_STORIES now also caps how much
  // of a free story a guest hears, which is exactly what it did before.
  if (isFreeStory(key)) {
    return authenticated
      ? { owned: true, freeParts: Infinity, reason: "free" }
      : { owned: false, freeParts: FREE_TRIAL_STORIES, reason: "guest" };
  }

  // Paid content. A guest and a signed-in non-owner get the same preview:
  // making the guest's preview larger would mean signing OUT showed you more,
  // and making it smaller punishes the account we want people to create.
  if (!authenticated) {
    return { owned: false, freeParts: PAID_PREVIEW_PARTS, reason: "guest" };
  }

  const { stories, allAccess } = resolveAccess(entitlements, now);
  if (allAccess || stories.has(key)) {
    return { owned: true, freeParts: Infinity, reason: "purchased" };
  }

  return { owned: false, freeParts: PAID_PREVIEW_PARTS, reason: "paywall" };
}

/** Convenience for callers that only need a yes/no on one part. */
export const isPartVisible = (access, partNumber) =>
  access.owned || Number(partNumber) <= access.freeParts;

/**
 * Everything this account can reach, for GET /api/me/entitlements and the
 * Library page. Under an active pass the answer is "all of them", which no
 * finite list can express — hence the allAccess flag travelling alongside.
 */
export function ownedStoryKeys(entitlements, now = Date.now()) {
  const { stories, allAccess } = resolveAccess(entitlements, now);
  const owned = new Set(stories);
  // Starter stories are free to every authenticated user and are never stored
  // as rows, so they have to be added here or the Library would look empty for
  // someone who has not bought anything.
  for (const key of STARTER_STORIES) owned.add(key);
  if (allAccess) for (const key of PAID_STORY_KEYS) owned.add(key);
  return [...owned];
}
