// config/priceCatalog.js
//
// Server-authoritative source of truth for everything sold for REAL MONEY.
// Mirrored by src/config/priceCatalog.ts and guarded by
// src/config/catalogMirror.test.ts, the same arrangement shopCatalog.js and
// characterCatalog.js already use — the client renders these numbers, but this
// file is what an order is priced against. A client that sends a price is
// ignored, never trusted.
//
// ── Two invariants worth stating up front ────────────────────────────────────
//
// 1. EVERYTHING SOLD IS A `Story` DOCUMENT; EVERYTHING STATIC IS FREE.
//    Static stories bake their audio URLs into the JS bundle
//    (src/modules/audiodata/*), so the server cannot withhold them from anyone
//    who reads the bundle. That is fine precisely because the static set IS the
//    free starter pack. Do not add a story to STARTER_STORIES' paid siblings
//    unless it lives in Mongo — a paid entry in src/types/storyGroups.ts would
//    be unenforceable and the paywall would be theatre.
//
// 2. REAL MONEY AND SOFT CURRENCY NEVER MEET. Nothing here can be bought with
//    bitAward/bitWord/bitPhrase, and no amount of rubles mints them. Mixing the
//    two would devalue the earning loop the whole quiz/repeat design rests on.
//    See config/currency.js for the other side of that wall.
//
// Amounts are INTEGER MINOR UNITS (kopecks). Never floats: 12.90 cannot be
// represented exactly, and a payment provider that receives 128999.99999 for a
// 1290 ₽ charge rejects the order in a way that is miserable to debug.

export const CURRENCY = "RUB";

/**
 * Story identity across the whole payment system: "easy/leo". The difficulty
 * has to be part of the key because storyId is only unique *per difficulty*
 * (models/Story.js's compound index), so a bare slug is ambiguous.
 */
export const storyKey = (difficulty, storyId) => `${difficulty}/${storyId}`;

/**
 * Free to any registered user, forever, with no entitlement row written.
 *
 * Deriving the starter pack from a constant rather than granting it at signup
 * is deliberate: every user who existed before payments keeps their access with
 * no migration, and the free set can be widened or narrowed later by editing
 * this list instead of backfilling a collection.
 *
 * This is exactly the set of stories that shipped before the paywall.
 */
export const STARTER_STORIES = [
  "easy/leo",
  "easy/leo-additional",
  "easy/news-roland-garros",
  "easy/news-family-visit",
  "easy/news-grazing-board",
  "medium/maya",
  "hard/daniel",
];

/**
 * How many parts of a story a user who does NOT own it may still play.
 *
 * 1 is a sales tool, not a concession: a locked card converts far better when
 * the buyer has heard the character. Set to 0 to close it entirely — the gate
 * is per-part either way, so nothing else changes.
 *
 * Note this is a DIFFERENT number from FREE_TRIAL_STORIES in config/trial.js,
 * which governs signed-out visitors on FREE stories. The two gates stack:
 * a guest gets min(FREE_TRIAL_STORIES, PAID_PREVIEW_PARTS) of a paid story.
 */
export const PAID_PREVIEW_PARTS = 1;

/** How long the all-access pass lasts. Also the SKU's durationDays below. */
export const PASS_DURATION_DAYS = 90;

/**
 * The extension packs — three stories each, continuing the character that
 * already carries that level (Leo/easy, Maya/medium, Daniel/hard).
 *
 * These slugs must match the storyId of the seeded Story documents exactly;
 * scripts/seedExtensionPacks.js is generated FROM this table so they cannot
 * drift.
 */
export const PACK_STORIES = {
  "pack-easy": [
    "easy/leo-new-job",
    "easy/leo-doctor",
    "easy/leo-moving-day",
  ],
  "pack-medium": [
    "medium/maya-interview",
    "medium/maya-roommates",
    "medium/maya-lost-luggage",
  ],
  "pack-hard": [
    "hard/daniel-negotiation",
    "hard/daniel-startup-pitch",
    "hard/daniel-courtroom",
  ],
};

const PACK_PRICE_MINOR = 69000; // 690 ₽
const STORY_PRICE_MINOR = 24900; // 249 ₽
const PASS_PRICE_MINOR = 129000; // 1290 ₽

/**
 * Why these three numbers, since the ratios are the whole business model:
 *
 *   pass 1290  vs  pack 690  — two packs (1380) already cost more than the
 *     pass, so anyone wanting more than one level is pushed to all-access.
 *     At the originally proposed 1000/699 the pass was only 1.4x a pack and a
 *     three-level buyer paid 2097 against a 1000 pass, i.e. the most engaged
 *     customers were the ones the pricing punished.
 *   pack 690   vs  story 249 — three singles (747) cost more than the pack, so
 *     the bundle is never strictly worse value than its parts.
 *
 * `purchasable: false` is the safety catch on content that does not exist yet.
 * The server refuses to price a SKU that is not purchasable, so a placeholder
 * cannot be sold by accident even if the shop UI somehow offers it. Staging
 * turns them on via PURCHASABLE_SKUS (see config/env.js); production keeps
 * whatever is written here. Flip one to `true` only once its audio is uploaded
 * and actually plays.
 */
const packProduct = (sku) => ({
  sku,
  kind: "pack",
  amountMinor: PACK_PRICE_MINOR,
  durationDays: null,
  purchasable: false,
});

const storyProduct = (key) => ({
  sku: `story-${key.replace("/", "-")}`,
  kind: "story",
  storyKey: key,
  amountMinor: STORY_PRICE_MINOR,
  durationDays: null,
  purchasable: false,
});

export const PRODUCTS = [
  {
    sku: "all-access-90d",
    kind: "pass",
    amountMinor: PASS_PRICE_MINOR,
    durationDays: PASS_DURATION_DAYS,
    // The only thing sellable on day one: it grants the starter pack plus
    // whatever lands later, so it is honest even while the packs are empty.
    purchasable: true,
  },
  ...Object.keys(PACK_STORIES).map(packProduct),
  ...Object.values(PACK_STORIES).flat().map(storyProduct),
];

const BY_SKU = new Map(PRODUCTS.map((p) => [p.sku, p]));

export const getProduct = (sku) => BY_SKU.get(sku) ?? null;

/** Every story key the catalog knows how to sell, in catalog order. */
export const PAID_STORY_KEYS = Object.values(PACK_STORIES).flat();

/**
 * Which SKUs unlock a given story — what the paywall modal offers. Ordered
 * cheapest-first-per-scope: the single story, then its pack, then the pass, so
 * the UI can present the smallest sufficient purchase first.
 */
export function skusGranting(key) {
  if (STARTER_STORIES.includes(key)) return [];

  const skus = [];
  const single = PRODUCTS.find((p) => p.kind === "story" && p.storyKey === key);
  if (single) skus.push(single.sku);

  for (const [packSku, keys] of Object.entries(PACK_STORIES)) {
    if (keys.includes(key)) skus.push(packSku);
  }

  skus.push("all-access-90d");
  return skus;
}

/** The story keys a SKU grants. The pass grants everything, so it returns null. */
export function storiesGrantedBy(sku) {
  const product = getProduct(sku);
  if (!product) return [];
  if (product.kind === "pass") return null; // null = "all stories, present and future"
  if (product.kind === "pack") return PACK_STORIES[sku] ?? [];
  return product.storyKey ? [product.storyKey] : [];
}
