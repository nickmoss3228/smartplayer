// config/priceCatalog.js
//
// Server-authoritative source of truth for everything sold for REAL MONEY.
// The client renders these numbers, but this file is what an order is priced
// against. A client that sends a price is ignored, never trusted.
//
// ── Where the rows come from ─────────────────────────────────────────────────
//
// The catalog is DATA, and the data lives in the `story` table — the rows the
// admin Story Builder writes. This file is the pure arithmetic that turns those
// rows into products, and buildCatalog() is the only way to get one. Nothing
// here reaches for a database; helpers/catalogStore.js does that and hands the
// rows in, which is what keeps the pricing rules testable without Postgres.
//
// BUILT_IN_ROWS below is the fallback, not the truth. It exists for two
// reasons: a fresh database has no rows yet, and a DB read that fails must not
// lock every paying customer out of content they bought. Once the story table
// is seeded the store prefers it, and edits in /admin take effect immediately.
//
// ── The pricing model ────────────────────────────────────────────────────────
//
//   one track            29 ₽   a story costs 29 ₽ × its parts (10 parts = 290 ₽)
//   in a character set   19 ₽   per track, for every story about one character
//   a whole level        placeholder — not for sale until a price is decided
//
// A row may override any of it: priceMinor replaces the per-track arithmetic,
// and freeParts/previewSeconds replace the length-derived allowance. Null means
// "derive it", which is why most rows carry nothing.
//
// Nothing is dated. Every purchase is permanent; the 90-day all-access pass
// this file used to sell is gone.
//
// ── What is free ─────────────────────────────────────────────────────────────
//
// The same for guests and signed-in users: a story of LONG_STORY_MIN_PARTS or
// more gives its first FREE_PARTS_LONG_STORY parts away. A shorter story gives
// nothing away except a PREVIEW_SECONDS listen of part 1, which the player
// stops. See freeAllowanceFor().
//
// A row with `paid: false` is free outright — every part, to everyone. That is
// the ONLY way a story becomes free now. A story the catalog has never heard of
// is refused, not given away; see accessFor() in config/entitlements.js for why
// that direction is the safe one.
//
// REAL MONEY AND SOFT CURRENCY NEVER MEET. Nothing here can be bought with
// bitAward/bitWord/bitPhrase, and no amount of rubles mints them. Mixing the
// two would devalue the earning loop the whole quiz/repeat design rests on.
// See config/currency.js for the other side of that wall.
//
// Amounts are INTEGER MINOR UNITS (kopecks). Never floats: 12.90 cannot be
// represented exactly, and a payment provider that receives 128999.99999 for a
// 1290 ₽ charge rejects the order in a way that is miserable to debug.

export const CURRENCY = "RUB";

/**
 * Story identity across the whole payment system: "easy/leo". The difficulty
 * has to be part of the key because storyId is only unique *per difficulty*
 * (the story table's compound unique index), so a bare slug is ambiguous.
 */
export const storyKey = (difficulty, storyId) => `${difficulty}/${storyId}`;

export const TRACK_PRICE_MINOR = 2900; // 29 ₽ per track, bought as a story
export const SET_TRACK_PRICE_MINOR = 1900; // 19 ₽ per track, bought as a set
/**
 * The whole-level bundle: 999 ₽.
 *
 * STILL UNSELLABLE (levelProduct sets purchasable: false), and the reason is
 * arithmetic rather than policy: at today's content it costs MORE than buying
 * every story on the level one at a time —
 *
 *   easy    33 parts   individually 957 ₽   at the set rate 627 ₽
 *   medium  25 parts   individually 725 ₽   at the set rate 475 ₽
 *   hard    25 parts   individually 725 ₽   at the set rate 475 ₽
 *
 * A "bundle" that is a worse deal than its parts is one nobody should be sold,
 * so turning it on wants a price under the set rate for the SMALLEST level
 * (475 ₽ today), or a per-level price rather than one number for all three.
 * Recompute before flipping it on: these totals move whenever a story is
 * published, because the level's storyKeys come from the catalog.
 */
export const LEVEL_PRICE_MINOR = 99900;

export const FREE_PARTS_LONG_STORY = 3;
export const LONG_STORY_MIN_PARTS = 10;
export const PREVIEW_SECONDS = 30;

/**
 * How much of a story a non-owner may hear, from its length alone.
 *
 *   freeParts       parts 1..freeParts play in full
 *   previewSeconds  when not null, part 1 plays for this long and then stops
 *
 * This is the DEFAULT, applied when a row does not state its own allowance.
 */
export function freeAllowanceFor(totalParts) {
  return Number(totalParts) >= LONG_STORY_MIN_PARTS
    ? { freeParts: FREE_PARTS_LONG_STORY, previewSeconds: null }
    : { freeParts: 0, previewSeconds: PREVIEW_SECONDS };
}

export const storySku = (key) => `story-${key.replace("/", "-")}`;
export const setSku = (character) => `set-${character}`;
export const levelSku = (difficulty) => `level-${difficulty}`;

const difficultyOf = (key) => key.split("/")[0];

/**
 * One catalog row, with every optional field resolved.
 *
 * `ready: false` is the safety catch on content whose audio does not exist yet.
 * The server refuses to price a SKU that is not purchasable, so a placeholder
 * cannot be sold by accident. Staging opens them via PURCHASABLE_SKUS
 * (config/env.js). Flip to true only once the audio plays.
 */
function normalizeRow(row) {
  const parts = Number(row.parts) || 0;
  const derived = freeAllowanceFor(parts);
  const paid = row.paid !== false;
  return {
    key: row.key,
    character: row.character ?? "",
    parts,
    category: row.category ?? "general",
    ready: row.ready !== false,
    extension: row.extension === true,
    paid,
    // A free story has no price and gives everything away, whatever the row
    // says — otherwise a stale priceMinor could resurrect a paywall on content
    // an admin has deliberately opened up.
    amountMinor: paid
      ? (row.priceMinor ?? null) !== null
        ? Number(row.priceMinor)
        : parts * TRACK_PRICE_MINOR
      : 0,
    freeParts: !paid
      ? parts
      : (row.freeParts ?? null) !== null
        ? Number(row.freeParts)
        : derived.freeParts,
    previewSeconds: !paid
      ? null
      : (row.previewSeconds ?? null) !== null
        ? Number(row.previewSeconds)
        : derived.previewSeconds,
  };
}

/**
 * Turns catalog rows into the product set and the lookups built on it.
 *
 * Pure — same rows in, same catalog out, no I/O and no module state. That is
 * what lets config/entitlements.test.js and basketPricing.test.js exercise the
 * real pricing rules against a handful of invented rows instead of against
 * whatever happens to be in the database today.
 */
export function buildCatalog(rows) {
  const stories = rows.map(normalizeRow);
  const byKey = new Map(stories.map((s) => [s.key, s]));

  const partsOf = (keys) => keys.reduce((sum, key) => sum + (byKey.get(key)?.parts ?? 0), 0);
  const setPriceOf = (keys) =>
    keys.reduce((sum, key) => sum + (byKey.get(key)?.parts ?? 0) * SET_TRACK_PRICE_MINOR, 0);
  const allReady = (keys) => keys.every((key) => byKey.get(key)?.ready === true);

  const storyProduct = (s) => ({
    sku: storySku(s.key),
    kind: "story",
    storyKey: s.key,
    storyKeys: [s.key],
    parts: s.parts,
    amountMinor: s.amountMinor,
    durationDays: null,
    purchasable: s.ready && s.paid,
  });

  // A set is a character's STORIES, never the news that happens to feature
  // them: the news shelf is sold separately. Free stories are left out too —
  // a bundle must not charge for something already given away.
  const sellable = stories.filter((s) => s.paid);
  const characters = [...new Set(sellable.map((s) => s.character))].filter(Boolean);
  const setProduct = (character) => {
    const storyKeys = sellable
      .filter((s) => s.character === character && s.category === "general")
      .map((s) => s.key);
    return {
      sku: setSku(character),
      kind: "set",
      character,
      storyKeys,
      parts: partsOf(storyKeys),
      amountMinor: setPriceOf(storyKeys),
      durationDays: null,
      purchasable: storyKeys.length > 0 && allReady(storyKeys),
    };
  };

  const difficulties = [...new Set(sellable.map((s) => difficultyOf(s.key)))];
  const levelProduct = (difficulty) => {
    const storyKeys = sellable.filter((s) => difficultyOf(s.key) === difficulty).map((s) => s.key);
    return {
      sku: levelSku(difficulty),
      kind: "level",
      difficulty,
      storyKeys,
      parts: partsOf(storyKeys),
      amountMinor: LEVEL_PRICE_MINOR,
      durationDays: null,
      // Off until the price is decided: at the placeholder it costs more than
      // buying the whole level track by track.
      purchasable: false,
    };
  };

  const products = [
    ...sellable.map(storyProduct),
    ...characters.map(setProduct),
    ...difficulties.map(levelProduct),
  ];
  const bySku = new Map(products.map((p) => [p.sku, p]));

  const getProduct = (sku) => bySku.get(sku) ?? null;

  /**
   * What this buyer pays for a product, given the stories they already own.
   *
   * A set charges only for the tracks the buyer does not have yet, so someone
   * who bought one story and then wants the rest is never sold that story
   * twice. Everything else is its catalog price.
   */
  const priceFor = (product, ownedStoryKeys = []) => {
    if (!product) return 0;
    if (product.kind !== "set") return product.amountMinor;
    const owned = new Set(ownedStoryKeys);
    return setPriceOf(product.storyKeys.filter((key) => !owned.has(key)));
  };

  /**
   * Drops basket items that another item in the same basket already covers — a
   * story alongside its set, a set alongside its level. Charging for both is
   * the overcharge that ends in a chargeback.
   *
   * Widest scope wins; between two items granting the same stories, the cheaper
   * one is kept. Unknown SKUs are passed through untouched for the caller to
   * reject.
   */
  const collapseBasket = (skus) => {
    const unique = [...new Set(skus)];
    const known = unique.filter((sku) => getProduct(sku));
    const ranked = [...known].sort((a, b) => {
      const pa = getProduct(a);
      const pb = getProduct(b);
      return (
        pb.storyKeys.length - pa.storyKeys.length ||
        pa.amountMinor - pb.amountMinor ||
        a.localeCompare(b)
      );
    });

    const covered = new Set();
    const dropped = new Set();
    for (const sku of ranked) {
      const keys = getProduct(sku).storyKeys;
      if (keys.length > 0 && keys.every((key) => covered.has(key))) {
        dropped.add(sku);
        continue;
      }
      for (const key of keys) covered.add(key);
    }

    return {
      kept: unique.filter((sku) => !dropped.has(sku)),
      dropped: unique.filter((sku) => dropped.has(sku)),
    };
  };

  return {
    stories,
    products,
    getCatalogStory: (key) => byKey.get(key) ?? null,
    /** Every story the catalog knows, sold or free. */
    storyKeys: stories.map((s) => s.key),
    /** Only the ones that cost money. */
    paidStoryKeys: sellable.map((s) => s.key),
    /** A story nobody sells — explicitly marked free — is free to everyone. */
    isPaidStory: (key) => byKey.get(key)?.paid === true,
    /** Does the catalog know this story at all? Unknown means refused. */
    hasStory: (key) => byKey.has(key),
    getProduct,
    /**
     * Which SKUs unlock a given story — what the paywall offers. Smallest
     * scope first: the story, then its set, then its level.
     */
    skusGranting: (key) =>
      byKey.get(key)?.paid === true
        ? products.filter((p) => p.storyKeys.includes(key)).map((p) => p.sku)
        : [],
    /** The story keys a SKU grants. */
    storiesGrantedBy: (sku) => getProduct(sku)?.storyKeys ?? [],
    priceFor,
    collapseBasket,
  };
}

/**
 * The rows that ship in the source tree.
 *
 * FALLBACK ONLY — helpers/catalogStore.js prefers the story table. Keeping them
 * here means a fresh checkout, a fresh database, or a failed DB read still
 * prices the content that actually exists rather than refusing all of it.
 *
 * `parts` must match the real part count: it sets the price and the free
 * allowance.
 */
const entry = (key, character, parts, options = {}) => ({ key, character, parts, ...options });

export const BUILT_IN_ROWS = [
  entry("easy/leo", "leo", 10),
  entry("easy/leo-additional", "leo", 2),
  entry("easy/leo-new-job", "leo", 5, { ready: false, extension: true }),
  entry("easy/leo-doctor", "leo", 5, { ready: false, extension: true }),
  entry("easy/leo-moving-day", "leo", 5, { ready: false, extension: true }),
  entry("easy/news-roland-garros", "leo", 2, { category: "news" }),
  // No recording yet — its tracks ship with empty audio.
  entry("easy/news-family-visit", "leo", 2, { category: "news", ready: false }),
  entry("easy/news-grazing-board", "leo", 2, { category: "news" }),

  entry("medium/maya", "maya", 10),
  entry("medium/maya-interview", "maya", 5, { ready: false, extension: true }),
  entry("medium/maya-roommates", "maya", 5, { ready: false, extension: true }),
  entry("medium/maya-lost-luggage", "maya", 5, { ready: false, extension: true }),

  entry("hard/daniel", "daniel", 10),
  entry("hard/daniel-negotiation", "daniel", 5, { ready: false, extension: true }),
  entry("hard/daniel-startup-pitch", "daniel", 5, { ready: false, extension: true }),
  entry("hard/daniel-courtroom", "daniel", 5, { ready: false, extension: true }),
];

/** The catalog built from BUILT_IN_ROWS — the fallback, and what tests default to. */
export const BUILT_IN_CATALOG = buildCatalog(BUILT_IN_ROWS);

/** The placeholder stories scripts/seedExtensionPacks.js creates. */
export const EXTENSION_STORY_KEYS = BUILT_IN_ROWS.filter((s) => s.extension === true).map(
  (s) => s.key,
);
