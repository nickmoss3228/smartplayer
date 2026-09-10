// config/basketPricing.test.js
//
// The rule under test is the one the whole payment design rests on: **the
// server prices the basket, the client only names it.** Everything here is an
// attempt to make priceBasket charge something other than what the catalog
// says, or to charge for something the buyer should not be sold.

import test from "node:test";
import assert from "node:assert/strict";

import { priceBasket, isPurchasable, BasketError, MAX_BASKET_ITEMS } from "./basketPricing.js";
import { getProduct, PACK_STORIES } from "./priceCatalog.js";

const PASS = "all-access-90d";
const PACK = "pack-easy";
const STORY = `story-${PACK_STORIES["pack-easy"][0].replace("/", "-")}`;
const ALL = ["*"];

const perpetual = (sku) => ({ sku, grantedAt: new Date(), expiresAt: null });

test("prices from the catalog, not from anything the caller supplies", () => {
  const { amountMinor, items } = priceBasket([PACK], [], ALL);
  assert.equal(amountMinor, getProduct(PACK).amountMinor);
  assert.equal(items[0].sku, PACK);
  // The returned item carries only fields the SERVER decided.
  assert.deepEqual(Object.keys(items[0]).sort(), ["amountMinor", "durationDays", "sku"]);
});

test("extra properties on the input cannot influence the price", () => {
  // priceBasket takes strings. Anything object-shaped is refused outright
  // rather than being read for a price field.
  assert.throws(
    () => priceBasket([{ sku: PACK, amountMinor: 1 }], [], ALL),
    (e) => e instanceof BasketError && e.code === "INVALID_SKU",
  );
});

test("an unknown SKU is refused, never priced as zero", () => {
  // The failure this prevents: a typo silently becoming a free order.
  assert.throws(
    () => priceBasket(["pack-atlantis"], [], ALL),
    (e) => e instanceof BasketError && e.code === "UNKNOWN_SKU",
  );
});

test("a SKU that is not purchasable in this environment is refused", () => {
  // No PURCHASABLE_SKUS: the placeholder packs are purchasable:false in the
  // catalog, which is what stops them being sold before their audio exists.
  assert.equal(getProduct(PACK).purchasable, false, "fixture assumption");
  assert.throws(
    () => priceBasket([PACK], [], []),
    (e) => e instanceof BasketError && e.code === "NOT_PURCHASABLE",
  );
  // Staging opens them without a different build.
  assert.doesNotThrow(() => priceBasket([PACK], [], [PACK]));
  assert.doesNotThrow(() => priceBasket([PACK], [], ALL));
});

test("the pass is sellable out of the box; the starter pack is not sellable at all", () => {
  assert.equal(isPurchasable(PASS, []), true);
  assert.equal(isPurchasable("starter", ALL), false, "starter is not a product");
});

test("a duplicated SKU is charged once", () => {
  const { amountMinor, items } = priceBasket([PACK, PACK, PACK], [], ALL);
  assert.equal(items.length, 1);
  assert.equal(amountMinor, getProduct(PACK).amountMinor);
});

test("a basket containing the pass is normalized down to just the pass", () => {
  // Charging for a pack alongside an all-access pass that already covers it is
  // the overcharge that ends in a chargeback.
  const { items, amountMinor, dropped } = priceBasket([PACK, STORY, PASS], [], ALL);
  assert.deepEqual(items.map((i) => i.sku), [PASS]);
  assert.equal(amountMinor, getProduct(PASS).amountMinor);
  assert.deepEqual(dropped.sort(), [PACK, STORY].sort());
});

test("owning a pack drops both the pack and the single stories inside it", () => {
  // Ownership is resolved through what a SKU GRANTS, not by matching sku
  // strings — so someone who owns pack-easy cannot be sold one of its stories
  // a second time. Here that empties the basket entirely, which is refused.
  assert.throws(
    () => priceBasket([PACK, STORY], [perpetual(PACK)], ALL),
    (e) => e instanceof BasketError && e.code === "ALREADY_OWNED",
  );

  // With one un-owned item alongside, the owned ones are dropped and the rest
  // is priced normally.
  const otherStory = `story-${PACK_STORIES["pack-medium"][0].replace("/", "-")}`;
  const { items, dropped } = priceBasket([PACK, STORY, otherStory], [perpetual(PACK)], ALL);
  assert.deepEqual(items.map((i) => i.sku), [otherStory]);
  assert.ok(dropped.includes(PACK), "the owned pack should be dropped");
  assert.ok(dropped.includes(STORY), "a story inside the owned pack should be dropped");
});

test("a wholly-owned basket is refused rather than creating a zero-value order", () => {
  assert.throws(
    () => priceBasket([PACK], [perpetual(PACK)], ALL),
    (e) => e instanceof BasketError && e.code === "ALREADY_OWNED",
  );
});

test("the pass can be re-bought while active, because buying it extends it", () => {
  // The opposite of the rule above, and deliberately so: a perpetual SKU is
  // pointless to re-buy, a dated one is a renewal.
  const active = { sku: PASS, grantedAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000) };
  const { items } = priceBasket([PASS], [active], ALL);
  assert.deepEqual(items.map((i) => i.sku), [PASS]);
});

test("an active pass drops perpetual items from the basket", () => {
  const active = { sku: PASS, grantedAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000) };
  assert.throws(
    () => priceBasket([PACK], [active], ALL),
    (e) => e instanceof BasketError && e.code === "ALREADY_OWNED",
  );
});

test("an EXPIRED pass does not drop anything", () => {
  const lapsed = { sku: PASS, grantedAt: new Date(0), expiresAt: new Date(Date.now() - 1) };
  const { items } = priceBasket([PACK], [lapsed], ALL);
  assert.deepEqual(items.map((i) => i.sku), [PACK]);
});

test("empty and oversized baskets are refused", () => {
  for (const bad of [[], null, undefined, "pack-easy"]) {
    assert.throws(
      () => priceBasket(bad, [], ALL),
      (e) => e instanceof BasketError,
      `${JSON.stringify(bad)} should be refused`,
    );
  }
  assert.throws(
    () => priceBasket(Array(MAX_BASKET_ITEMS + 1).fill(PASS), [], ALL),
    (e) => e instanceof BasketError && e.code === "BASKET_TOO_LARGE",
  );
});

test("the total is the exact integer sum of its parts", () => {
  // Floats would round here. Kopecks are integers precisely so they cannot.
  const skus = PACK_STORIES["pack-easy"].map((k) => `story-${k.replace("/", "-")}`);
  const { amountMinor, items } = priceBasket(skus, [], ALL);
  assert.equal(amountMinor, items.reduce((n, i) => n + i.amountMinor, 0));
  assert.ok(Number.isInteger(amountMinor));
});
