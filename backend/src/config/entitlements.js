// config/entitlements.js
//
// Who may hear what. This is the decision layer of the paywall and it is
// deliberately PURE — no drizzle, no JWT, no env, no clock of its own, and no
// catalog of its own either: every function that needs one takes it as an
// argument. Same split as config/sessions.js ↔ helpers/sessionStore.js, and for
// the same reason its test file gives: the interesting failures here are
// boundary conditions, and boundary conditions are only cheap to test when
// there is no database in the loop.
//
// Every gated path in the app calls accessFor(). There is exactly one copy of
// this rule and it lives on the server.

import { BUILT_IN_CATALOG, freeAllowanceFor, storyKey } from "./priceCatalog.js";

export { storyKey };

/**
 * The catalog to use when a caller does not pass one.
 *
 * Only the built-in rows — helpers/catalogStore.js is what reads the story
 * table, and every request path threads its catalog through explicitly. This
 * default exists so unit tests and scripts do not have to.
 */
const defaultCatalog = () => BUILT_IN_CATALOG;

/**
 * A story the catalog has never heard of is REFUSED, not given away.
 *
 * This used to fail open, on the reasoning that monetizing a story should be an
 * explicit act. It is the opposite that turned out to matter: the Story Builder
 * writes stories straight to the database, and every one of them was a key no
 * catalog listed — so each new story was silently free, appeared on every
 * guest's library shelf, and could not be bought because it had no SKU. Failing
 * closed makes the /admin panel the thing that decides, which is the point:
 * a story is visible and priced because someone said so, never by omission.
 *
 * `paid: false` is how a story becomes free now — a deliberate row, not a gap.
 */
export const isPaidStory = (key, catalog = defaultCatalog()) => catalog.isPaidStory(key);

export const isFreeStory = (key, catalog = defaultCatalog()) =>
  catalog.hasStory(key) && !catalog.isPaidStory(key);

/**
 * Active iff perpetual, or now is strictly before expiresAt.
 *
 * Nothing sold today is dated, but rows are permanent and an admin grant can
 * still carry `days`, so the boundary stays pinned: AT expiresAt a row is
 * expired.
 */
export function isActive(row, now = Date.now()) {
  if (!row || typeof row.sku !== "string") return false;
  if (row.expiresAt === null || row.expiresAt === undefined) return true;
  const ends = row.expiresAt instanceof Date ? row.expiresAt.getTime() : Date.parse(row.expiresAt);
  if (Number.isNaN(ends)) return false; // unparseable expiry — fail closed
  return now < ends;
}

/** Collapses a user's rows into the set of story keys they can reach now. */
export function resolveAccess(entitlements, now = Date.now(), catalog = defaultCatalog()) {
  const stories = new Set();

  for (const row of Array.isArray(entitlements) ? entitlements : []) {
    if (!isActive(row, now)) continue;
    // A row naming a SKU that has left the catalog grants nothing, and must
    // not throw: catalogs get edited, rows are permanent, and an exception
    // here would take down the story endpoint for that one user.
    for (const key of catalog.storiesGrantedBy(row.sku)) stories.add(key);
  }

  return { stories };
}

/**
 * THE gate. Returns how much of one story a caller may hear.
 *
 *   owned           every part is unlocked
 *   freeParts       when not owned, parts 1..freeParts play in full
 *   previewSeconds  when not owned and not null, part 1 plays for this long
 *
 * Guests and signed-in non-owners get exactly the same allowance: signing in
 * must never show you less, and signing out must never show you more.
 */
export function accessFor(
  entitlements,
  difficulty,
  storyId,
  {
    authenticated = false,
    now = Date.now(),
    catalog = defaultCatalog(),
    paywallEnabled = true,
  } = {},
) {
  const key = storyKey(difficulty, storyId);
  const story = catalog.getCatalogStory(key);

  // Not in the catalog: not listed by any admin, so there is nothing to serve.
  // See isPaidStory above for why this is a refusal rather than a gift.
  //
  // Checked BEFORE the paywall switch on purpose. Turning selling off must not
  // also turn off the thing that keeps half-finished Story Builder drafts away
  // from learners; those are two different questions.
  if (!story) {
    return { owned: false, freeParts: 0, previewSeconds: null, reason: "unlisted" };
  }

  // Deliberately free: the whole story, to everyone, signed in or not.
  if (!story.paid) {
    return { owned: true, freeParts: story.parts, previewSeconds: null, reason: "free" };
  }

  // Nothing is sold at the moment (config.payments.paywallEnabled). Having an
  // ACCOUNT is what unlocks the catalogue, instead of having bought it.
  //
  // This is the one place the rule three lines below is suspended: normally a
  // guest and a signed-in non-owner see exactly the same thing, because
  // signing in is not supposed to be a way to get more content. While the
  // paywall is off, signing in is precisely that — it is the only thing being
  // asked of anyone — so the guest keeps their taster and members get the
  // rest. Turn the flag back on and the symmetry returns by itself.
  if (!paywallEnabled) {
    return authenticated
      ? { owned: true, freeParts: Infinity, previewSeconds: null, reason: "paywall-off" }
      : {
          owned: false,
          freeParts: story.freeParts,
          previewSeconds: story.previewSeconds,
          reason: "register-wall",
        };
  }

  if (authenticated && resolveAccess(entitlements, now, catalog).stories.has(key)) {
    return { owned: true, freeParts: Infinity, previewSeconds: null, reason: "purchased" };
  }

  // The row's own allowance, which normalizeRow already resolved from
  // freeAllowanceFor() when the row did not state one.
  return {
    owned: false,
    freeParts: story.freeParts,
    previewSeconds: story.previewSeconds,
    reason: authenticated ? "paywall" : "guest",
  };
}

/**
 * A part that plays only as a timed preview: audible, but not the whole thing.
 * The quiz stays closed on it — nobody has heard enough to be tested.
 */
export const isPreviewPart = (access, partNumber) =>
  !access.owned &&
  access.previewSeconds !== null &&
  access.previewSeconds !== undefined &&
  Number(partNumber) === 1 &&
  Number(partNumber) > access.freeParts;

/** May this part's audio be handed out at all (in full or as a preview)? */
export const isPartVisible = (access, partNumber) =>
  access.owned || Number(partNumber) <= access.freeParts || isPreviewPart(access, partNumber);

/** Every paid story this account owns, for GET /api/user/entitlements. */
export function ownedStoryKeys(entitlements, now = Date.now(), catalog = defaultCatalog()) {
  return [...resolveAccess(entitlements, now, catalog).stories];
}

export { freeAllowanceFor };
