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
  ALL_SUBSCRIPTION_PRICE_MINOR,
  ALL_SUBSCRIPTION_SKU,
  BUILT_IN_CATALOG,
  LEVEL_SUBSCRIPTION_PRICE_MINOR,
  SUBSCRIPTION_DAYS,
  buildCatalog,
  levelSubscriptionSku,
} from "./priceCatalog.js";

const { getProduct } = BUILT_IN_CATALOG;

const EASY = levelSubscriptionSku("easy");
const MEDIUM = levelSubscriptionSku("medium");
const HARD = levelSubscriptionSku("hard");
const ALL_LEVELS = ALL_SUBSCRIPTION_SKU;
const ALL = ["*"];

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 5);
const until = (sku, ms) => ({ sku, grantedAt: new Date(NOW), expiresAt: new Date(ms) });

test("prices from the catalog, not from anything the caller supplies", () => {
  const { amountMinor, items } = priceBasket([EASY], [], []);
  assert.equal(amountMinor, getProduct(EASY).amountMinor);
  assert.equal(amountMinor, LEVEL_SUBSCRIPTION_PRICE_MINOR);
  assert.deepEqual(Object.keys(items[0]).sort(), ["amountMinor", "durationDays", "sku"]);
});

test("every product is a dated subscription, and one level is cheaper than all three", () => {
  for (const sku of [EASY, MEDIUM, HARD, ALL_LEVELS]) {
    assert.equal(priceBasket([sku], [], []).items[0].durationDays, SUBSCRIPTION_DAYS, sku);
  }
  assert.ok(LEVEL_SUBSCRIPTION_PRICE_MINOR < ALL_SUBSCRIPTION_PRICE_MINOR);
  // Otherwise two levels bought separately would be the better deal.
  assert.ok(ALL_SUBSCRIPTION_PRICE_MINOR < 2 * LEVEL_SUBSCRIPTION_PRICE_MINOR);
});

test("extra properties on the input cannot influence the price", () => {
  assert.throws(
    () => priceBasket([{ sku: EASY, amountMinor: 1 }], [], ALL),
    (e) => e instanceof BasketError && e.code === "INVALID_SKU",
  );
});

test("an unknown SKU is refused, never priced as zero — including the retired ones", () => {
  // story-/set-/level- were sold before 2026-10-05; all-access-90d before that.
  for (const gone of ["story-easy-leo", "set-leo", "level-easy", "all-access-90d"]) {
    assert.throws(
      () => priceBasket([gone], [], ALL),
      (e) => e instanceof BasketError && e.code === "UNKNOWN_SKU",
      gone,
    );
  }
});

test("a level with nothing released is refused, unless the env opens it", () => {
  const unreleased = buildCatalog([
    { key: "easy/leo", character: "leo", parts: 10 },
    { key: "hard/soon", character: "kim", parts: 5, ready: false },
  ]);
  const SOON = levelSubscriptionSku("hard");
  assert.equal(unreleased.getProduct(SOON).purchasable, false, "fixture assumption");
  assert.throws(
    () => priceBasket([SOON], [], [], NOW, unreleased),
    (e) => e instanceof BasketError && e.code === "NOT_PURCHASABLE",
  );
  assert.doesNotThrow(() => priceBasket([SOON], [], [SOON], NOW, unreleased));
  assert.doesNotThrow(() => priceBasket([SOON], [], ALL, NOW, unreleased));

  // One released story is enough; the unreleased one rides along inside it.
  assert.equal(unreleased.getProduct(ALL_LEVELS).purchasable, true);
});

test("every built-in subscription sells out of the box", () => {
  for (const sku of [EASY, MEDIUM, HARD, ALL_LEVELS]) assert.equal(isPurchasable(sku, []), true, sku);
});

test("a duplicated SKU is charged once", () => {
  const { amountMinor, items } = priceBasket([EASY, EASY, EASY], [], ALL);
  assert.equal(items.length, 1);
  assert.equal(amountMinor, getProduct(EASY).amountMinor);
});

test("a level next to the all-levels subscription is dropped", () => {
  const { items, dropped } = priceBasket([EASY, ALL_LEVELS, HARD], [], ALL);
  assert.deepEqual(items.map((i) => i.sku), [ALL_LEVELS]);
  assert.deepEqual(dropped.sort(), [EASY, HARD].sort());
});

test("a live subscription can be bought again: that is a renewal, at full price", () => {
  const live = [until(EASY, NOW + 10 * DAY)];
  const { items, amountMinor } = priceBasket([EASY], live, ALL, NOW);
  assert.deepEqual(items.map((i) => i.sku), [EASY]);
  assert.equal(amountMinor, LEVEL_SUBSCRIPTION_PRICE_MINOR);
});

test("empty and oversized baskets are refused", () => {
  for (const bad of [[], null, undefined, EASY]) {
    assert.throws(
      () => priceBasket(bad, [], ALL),
      (e) => e instanceof BasketError,
      `${JSON.stringify(bad)} should be refused`,
    );
  }
  assert.throws(
    () => priceBasket(Array(MAX_BASKET_ITEMS + 1).fill(EASY), [], ALL),
    (e) => e instanceof BasketError && e.code === "BASKET_TOO_LARGE",
  );
});

test("the total is the exact integer sum of its parts", () => {
  const { amountMinor, items } = priceBasket([EASY, MEDIUM, HARD], [], ALL);
  assert.equal(amountMinor, items.reduce((n, i) => n + i.amountMinor, 0));
  assert.equal(amountMinor, 3 * LEVEL_SUBSCRIPTION_PRICE_MINOR);
  assert.ok(Number.isInteger(amountMinor));
});
