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
// ── The pricing model: subscriptions ─────────────────────────────────────────
//
//   one level     sub-easy · sub-medium · sub-hard   every story on that level
//   all levels    sub-all                            every story in the catalog
//
// Each runs for SUBSCRIPTION_DAYS. Buying it again while it is live ADDS the
// days to the end rather than restarting the clock (helpers/settlePayment.js),
// so renewing early never costs anyone time. Nothing renews by itself: there
// is no saved card, and the next period is a new purchase.
//
// A subscription covers its stories by LEVEL, not by list, so a story
// published tomorrow is inside every live subscription the moment it appears —
// that, and stories not being sold one at a time any more, is the point of the
// model (2026-10-05). Per-story and per-character purchases are gone; so is
// the row's priceMinor column as far as pricing goes (it is still stored, and
// ignored).
//
// freeParts/previewSeconds on a row still replace the length-derived free
// allowance. Null means "derive it", which is why most rows carry nothing.
//
// ── What is free ─────────────────────────────────────────────────────────────
//
// The same for guests and signed-in users: every story gives its first
// FREE_PARTS_LONG_STORY parts away in full — 3 of a 10-part story, 3 of a
// 5-part one, and BOTH parts of a 2-part one (a story shorter than the
// allowance is simply free to listen to). See freeAllowanceFor().
//
// There used to be a 30-second preview of part 1 for anything under
// LONG_STORY_MIN_PARTS. It is gone from the default (2026-09-23): a timed
// snippet that cuts off mid-sentence was a worse first taste than whole parts.
// An admin can still set previewSeconds on a row by hand, so the machinery for
// it (PREVIEW_SECONDS, isPreviewPart, the player's cut-off) stays.
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

/** How long one purchase of a subscription runs. */
export const SUBSCRIPTION_DAYS = 30;
/**
 * PLACEHOLDER PRICES — nobody has decided these yet. The only rule they
 * encode is the shape: one level is cheaper than all three, and all three cost
 * less than two levels bought separately, so "everything" is the obvious pick
 * for anyone who wants more than one level.
 */
export const LEVEL_SUBSCRIPTION_PRICE_MINOR = 19900; // 199 ₽ / 30 days, one level
export const ALL_SUBSCRIPTION_PRICE_MINOR = 34900; // 349 ₽ / 30 days, every level

export const levelSubscriptionSku = (difficulty) => `sub-${difficulty}`;
export const ALL_SUBSCRIPTION_SKU = "sub-all";

/** Shop order for the level subscriptions; anything else sorts after. */
const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

export const FREE_PARTS_LONG_STORY = 3;
/** No longer decides the allowance (see freeAllowanceFor); kept for callers. */
export const LONG_STORY_MIN_PARTS = 10;
/** Only used when an admin sets a preview on a row by hand. */
export const PREVIEW_SECONDS = 30;

/**
 * How much of a story a non-owner may hear, from its length alone.
 *
 *   freeParts       parts 1..freeParts play in full
 *   previewSeconds  when not null, part 1 plays for this long and then stops
 *
 * This is the DEFAULT, applied when a row does not state its own allowance.
 * Capped at the story's length, so a 2-part story reports 2, not 3 — callers
 * compare freeParts against totalParts, and "3 free of 2" would read as a lie.
 */
export function freeAllowanceFor(totalParts) {
  const parts = Math.max(0, Number(totalParts) || 0);
  return { freeParts: Math.min(FREE_PARTS_LONG_STORY, parts), previewSeconds: null };
}

const difficultyOf = (key) => key.split("/")[0];

/**
 * One catalog row, with every optional field resolved.
 *
 * `ready: false` marks content whose audio does not exist yet. It is still
 * inside its level's subscription — so it opens for every subscriber the day
 * it is released — but a subscription with nothing ready in it is not sold.
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
    // Total listening time, when every part has been measured. Display only.
    durationSeconds: Number.isFinite(row.durationSeconds) ? row.durationSeconds : null,
    // A free story gives everything away, whatever the row says — otherwise a
    // stale freeParts could resurrect a paywall on content an admin has
    // deliberately opened up.
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

  // Every paid story is inside a subscription, news and not-yet-released ones
  // included. A story whose free parts already cover it whole is in there too:
  // it adds nothing to the price, which no longer depends on what is inside.
  const paid = stories.filter((s) => s.paid);

  const partsOf = (keys) => keys.reduce((sum, key) => sum + (byKey.get(key)?.parts ?? 0), 0);
  const anyReady = (keys) => keys.some((key) => byKey.get(key)?.ready === true);

  const subscription = (fields, storyKeys, amountMinor) => ({
    ...fields,
    storyKeys,
    parts: partsOf(storyKeys),
    amountMinor,
    durationDays: SUBSCRIPTION_DAYS,
    // Sold once there is something in it to listen to.
    purchasable: anyReady(storyKeys),
  });

  const rank = (difficulty) => {
    const i = DIFFICULTY_ORDER.indexOf(difficulty);
    return i === -1 ? DIFFICULTY_ORDER.length : i;
  };
  const difficulties = [...new Set(paid.map((s) => difficultyOf(s.key)))].sort(
    (a, b) => rank(a) - rank(b),
  );

  const levelProducts = difficulties.map((difficulty) =>
    subscription(
      { sku: levelSubscriptionSku(difficulty), kind: "level", difficulty },
      paid.filter((s) => difficultyOf(s.key) === difficulty).map((s) => s.key),
      LEVEL_SUBSCRIPTION_PRICE_MINOR,
    ),
  );
  const allProduct = subscription(
    { sku: ALL_SUBSCRIPTION_SKU, kind: "all" },
    paid.map((s) => s.key),
    ALL_SUBSCRIPTION_PRICE_MINOR,
  );

  // Smallest scope first, so skusGranting() reads "this level, or everything".
  const products = paid.length > 0 ? [...levelProducts, allProduct] : [];
  const bySku = new Map(products.map((p) => [p.sku, p]));

  const getProduct = (sku) => bySku.get(sku) ?? null;

  /**
   * Drops basket items that another item in the same basket already covers —
   * a level next to the all-levels subscription. Charging for both is the
   * overcharge that ends in a chargeback.
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
    /** A story nobody sells — explicitly marked free — is free to everyone. */
    isPaidStory: (key) => byKey.get(key)?.paid === true,
    /** Does the catalog know this story at all? Unknown means refused. */
    hasStory: (key) => byKey.has(key),
    getProduct,
    /**
     * Which SKUs unlock a given story — what the paywall offers. Smallest
     * scope first: its level, then everything.
     */
    skusGranting: (key) =>
      byKey.get(key)?.paid === true
        ? products.filter((p) => p.storyKeys.includes(key)).map((p) => p.sku)
        : [],
    /**
     * The story keys a SKU grants. A row for a SKU the catalog no longer sells
     * — the per-story and per-character purchases before 2026-10-05 — grants
     * nothing.
     */
    storiesGrantedBy: (sku) => getProduct(sku)?.storyKeys ?? [],
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
 * `parts` must match the real part count: it sets the free allowance.
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
