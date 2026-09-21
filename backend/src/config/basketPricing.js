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

import { BUILT_IN_CATALOG, CURRENCY } from "./priceCatalog.js";
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
 * offer placeholder stories that production refuses — without shipping a
 * different build. "*" opens everything, which is a staging convenience and
 * must never appear in a production env file.
 */
export function isPurchasable(sku, extraSkus = [], catalog = BUILT_IN_CATALOG) {
  const product = catalog.getProduct(sku);
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
 * @param {number}   now
 * @param {object}   catalog      from helpers/catalogStore.js — the story table's
 *                                rows. Defaults to the built-in rows so scripts
 *                                and unit tests need not load one.
 * @returns {{items: {sku, amountMinor, durationDays}[], amountMinor: number, currency: string, dropped: string[]}}
 */
export function priceBasket(
  skus,
  entitlements = [],
  extraSkus = [],
  now = Date.now(),
  catalog = BUILT_IN_CATALOG,
) {
  const getProduct = (sku) => catalog.getProduct(sku);
  if (!Array.isArray(skus) || skus.length === 0) {
    throw new BasketError("EMPTY_BASKET", "Nothing to buy.");
  }
  if (skus.length > MAX_BASKET_ITEMS) {
    throw new BasketError("BASKET_TOO_LARGE", `At most ${MAX_BASKET_ITEMS} items.`);
  }
  if (!skus.every((s) => typeof s === "string")) {
    throw new BasketError("INVALID_SKU", "Basket items must be SKU strings.");
  }

  for (const sku of new Set(skus)) {
    if (!getProduct(sku)) {
      // Never price an unknown SKU as 0 — that is how a typo becomes a
      // free order.
      throw new BasketError("UNKNOWN_SKU", `Unknown item: ${sku}`, sku);
    }
    if (!isPurchasable(sku, extraSkus, catalog)) {
      // What stops anyone buying a placeholder before its audio exists.
      throw new BasketError("NOT_PURCHASABLE", `Not for sale yet: ${sku}`, sku);
    }
  }

  // A duplicate is charged once, and an item another item already covers (a
  // story next to its set, a set next to its level) is not charged at all.
  const { kept, dropped } = catalog.collapseBasket(skus);

  // Drop what they already own outright. A partly owned set stays, and is
  // priced below for only the tracks still missing.
  const { stories } = resolveAccess(entitlements, now, catalog);
  const owned = [...stories];
  const buying = kept.filter((sku) => {
    const product = getProduct(sku);
    if (product.durationDays !== null && product.durationDays !== undefined) return true;
    const ownsAll = product.storyKeys.length > 0 && product.storyKeys.every((k) => stories.has(k));
    if (ownsAll) dropped.push(sku);
    return !ownsAll;
  });

  if (buying.length === 0) {
    throw new BasketError("ALREADY_OWNED", "You already own everything in this basket.");
  }

  const items = buying.map((sku) => {
    const product = getProduct(sku);
    return {
      sku,
      amountMinor: catalog.priceFor(product, owned),
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
