// config/basketPricing.js
//
// Turns a list of SKU STRINGS into a priced order. Pure — no mongoose, no env,
// no clock beyond what is passed in — so the rules that decide what a customer
// is charged can be tested exhaustively without a database or a provider.
//
// The one rule this file exists to enforce: **the client never sends a price.**
// It sends ids. Everything monetary is looked up here, from the server's own
// catalog. A request body carrying `amount` is not "helpfully pre-computed",
// it is an attack, and the route rejects it outright.

import { getProduct, PACK_STORIES, CURRENCY } from "./priceCatalog.js";
import { resolveAccess } from "./entitlements.js";

/** Nobody legitimately buys twenty things at once; this is an abuse ceiling. */
export const MAX_BASKET_ITEMS = 20;

export class BasketError extends Error {
  constructor(code, message, detail = null) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

/**
 * Which SKUs this environment will actually sell.
 *
 * `purchasable` in the catalog is the PRODUCTION default. `extraSkus` comes
 * from PURCHASABLE_SKUS in the env and only ever widens the set, so staging can
 * offer placeholder packs that production refuses — without shipping a
 * different build. "*" opens everything, which is a staging convenience and
 * must never appear in a production env file.
 */
export function isPurchasable(sku, extraSkus = []) {
  const product = getProduct(sku);
  if (!product) return false;
  if (product.purchasable) return true;
  return extraSkus.includes("*") || extraSkus.includes(sku);
}

/**
 * Prices a basket, or throws a BasketError the route maps to a status code.
 *
 * @param {string[]} skus         ids only, straight off the request
 * @param {object[]} entitlements the buyer's current rows, to drop what they own
 * @param {string[]} extraSkus    PURCHASABLE_SKUS from the environment
 * @returns {{items: {sku, amountMinor, durationDays}[], amountMinor: number, currency: string, dropped: string[]}}
 */
export function priceBasket(skus, entitlements = [], extraSkus = [], now = Date.now()) {
  if (!Array.isArray(skus) || skus.length === 0) {
    throw new BasketError("EMPTY_BASKET", "Nothing to buy.");
  }
  if (skus.length > MAX_BASKET_ITEMS) {
    throw new BasketError("BASKET_TOO_LARGE", `At most ${MAX_BASKET_ITEMS} items.`);
  }
  if (!skus.every((s) => typeof s === "string")) {
    throw new BasketError("INVALID_SKU", "Basket items must be SKU strings.");
  }

  // Charge once for a SKU listed twice, rather than rejecting the order. A
  // duplicate is a UI slip, and refusing the whole basket over it is a worse
  // experience than quietly doing the right thing.
  let unique = [...new Set(skus)];

  for (const sku of unique) {
    if (!getProduct(sku)) {
      // Never price an unknown SKU as 0 — that is how a typo becomes a
      // free order.
      throw new BasketError("UNKNOWN_SKU", `Unknown item: ${sku}`, sku);
    }
    if (!isPurchasable(sku, extraSkus)) {
      // This is what stops anyone buying the placeholder packs before their
      // audio exists, and what stops "starter" being purchasable at all.
      throw new BasketError("NOT_PURCHASABLE", `Not for sale yet: ${sku}`, sku);
    }
  }

  // The pass subsumes everything else, so a basket containing it is normalized
  // down to just the pass. Charging for a pack alongside an all-access pass
  // that already covers it is the kind of overcharge that ends in a chargeback.
  const dropped = [];
  if (unique.includes("all-access-90d") && unique.length > 1) {
    dropped.push(...unique.filter((s) => s !== "all-access-90d"));
    unique = ["all-access-90d"];
  }

  // Drop what they already own. A perpetual SKU is pointless to re-buy; a
  // DATED one is not — re-buying the pass extends it, so it is kept.
  const { stories, allAccess } = resolveAccess(entitlements, now);
  unique = unique.filter((sku) => {
    const product = getProduct(sku);
    if (product.durationDays !== null && product.durationDays !== undefined) return true;
    if (allAccess) {
      dropped.push(sku);
      return false;
    }
    const grants =
      product.kind === "story" ? [product.storyKey] : (PACK_STORIES[sku] ?? []);
    const ownsAll = grants.length > 0 && grants.every((k) => stories.has(k));
    if (ownsAll) dropped.push(sku);
    return !ownsAll;
  });

  if (unique.length === 0) {
    throw new BasketError("ALREADY_OWNED", "You already own everything in this basket.");
  }

  const items = unique.map((sku) => {
    const product = getProduct(sku);
    return {
      sku,
      amountMinor: product.amountMinor,
      durationDays: product.durationDays ?? null,
    };
  });

  return {
    items,
    amountMinor: items.reduce((sum, i) => sum + i.amountMinor, 0),
    currency: CURRENCY,
    dropped,
  };
}
