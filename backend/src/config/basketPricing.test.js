// config/basketPricing.test.js
//
// The rule under test is the one the whole payment design rests on: **the
// server prices the basket, the client only names it.** Everything here is an
// attempt to make priceBasket charge something other than what the catalog
// says, or to charge for something the buyer should not be sold.

import test from "node:test";
import assert from "node:assert/strict";

import { priceBasket, isPurchasable, BasketError, MAX_BASKET_ITEMS } from "./basketPricing.js";
import {
  BUILT_IN_CATALOG,
  levelSku,
  setSku,
  storySku,
  SET_TRACK_PRICE_MINOR,
  TRACK_PRICE_MINOR,
} from "./priceCatalog.js";

const { getProduct, getCatalogStory } = BUILT_IN_CATALOG;

const LEO = storySku("easy/leo");
const LEO_EXTRA = storySku("easy/leo-additional");
const PLACEHOLDER = storySku("easy/leo-new-job");
const SET = setSku("leo");
const LEVEL = levelSku("easy");
const ALL = ["*"];

const perpetual = (sku) => ({ sku, grantedAt: new Date(), expiresAt: null });

test("prices from the catalog, not from anything the caller supplies", () => {
  const { amountMinor, items } = priceBasket([LEO], [], []);
  assert.equal(amountMinor, getProduct(LEO).amountMinor);
  assert.equal(amountMinor, 10 * TRACK_PRICE_MINOR, "a 10-track story is 290 ₽");
  assert.deepEqual(Object.keys(items[0]).sort(), ["amountMinor", "durationDays", "sku"]);
});

test("extra properties on the input cannot influence the price", () => {
  assert.throws(
    () => priceBasket([{ sku: LEO, amountMinor: 1 }], [], ALL),
    (e) => e instanceof BasketError && e.code === "INVALID_SKU",
  );
});

test("an unknown SKU is refused, never priced as zero", () => {
  for (const gone of ["pack-atlantis", "all-access-90d"]) {
    assert.throws(
      () => priceBasket([gone], [], ALL),
      (e) => e instanceof BasketError && e.code === "UNKNOWN_SKU",
    );
  }
});

test("a placeholder story is refused until its audio exists, unless the env opens it", () => {
  assert.equal(getProduct(PLACEHOLDER).purchasable, false, "fixture assumption");
  assert.throws(
    () => priceBasket([PLACEHOLDER], [], []),
    (e) => e instanceof BasketError && e.code === "NOT_PURCHASABLE",
  );
  assert.doesNotThrow(() => priceBasket([PLACEHOLDER], [], [PLACEHOLDER]));
  assert.doesNotThrow(() => priceBasket([PLACEHOLDER], [], ALL));
});

test("a recorded story sells out of the box; the level bundle does not", () => {
  assert.equal(isPurchasable(LEO, []), true);
  assert.equal(isPurchasable(LEVEL, []), false);
});

test("a duplicated SKU is charged once", () => {
  const { amountMinor, items } = priceBasket([LEO, LEO, LEO], [], ALL);
  assert.equal(items.length, 1);
  assert.equal(amountMinor, getProduct(LEO).amountMinor);
});

test("a story next to its set is dropped; a set next to its level is dropped", () => {
  const withSet = priceBasket([LEO, LEO_EXTRA, SET], [], ALL);
  assert.deepEqual(withSet.items.map((i) => i.sku), [SET]);
  assert.deepEqual(withSet.dropped.sort(), [LEO, LEO_EXTRA].sort());

  const withLevel = priceBasket([SET, LEVEL], [], ALL);
  assert.deepEqual(withLevel.items.map((i) => i.sku), [LEVEL]);
});

test("a set is 19 ₽ per track, and charges only for tracks not already owned", () => {
  const fresh = priceBasket([SET], [], ALL);
  assert.equal(fresh.amountMinor, getProduct(SET).parts * SET_TRACK_PRICE_MINOR);

  const leoParts = getCatalogStory("easy/leo").parts;
  const partial = priceBasket([SET], [perpetual(LEO)], ALL);
  assert.equal(partial.amountMinor, (getProduct(SET).parts - leoParts) * SET_TRACK_PRICE_MINOR);
});

test("owning a set drops the stories inside it", () => {
  assert.throws(
    () => priceBasket([LEO, LEO_EXTRA], [perpetual(SET)], ALL),
    (e) => e instanceof BasketError && e.code === "ALREADY_OWNED",
  );

  const news = storySku("easy/news-roland-garros");
  const { items, dropped } = priceBasket([LEO, news], [perpetual(SET)], ALL);
  assert.deepEqual(items.map((i) => i.sku), [news]);
  assert.ok(dropped.includes(LEO));
});

test("empty and oversized baskets are refused", () => {
  for (const bad of [[], null, undefined, LEO]) {
    assert.throws(
      () => priceBasket(bad, [], ALL),
      (e) => e instanceof BasketError,
      `${JSON.stringify(bad)} should be refused`,
    );
  }
  assert.throws(
    () => priceBasket(Array(MAX_BASKET_ITEMS + 1).fill(LEO), [], ALL),
    (e) => e instanceof BasketError && e.code === "BASKET_TOO_LARGE",
  );
});

test("the total is the exact integer sum of its parts", () => {
  const { amountMinor, items } = priceBasket(
    [LEO, storySku("medium/maya"), storySku("easy/news-grazing-board")],
    [],
    ALL,
  );
  assert.equal(amountMinor, items.reduce((n, i) => n + i.amountMinor, 0));
  assert.ok(Number.isInteger(amountMinor));
});
