// helpers/settlePayment.test.js
//
// Covers rowsFor() — the decision about WHAT a settled payment grants — with
// no database in the loop. Importing the module pulls in the mongoose schemas
// but never connects; defining a schema is not a connection.
//
// What is deliberately NOT tested here: that Mongo applies the conditional
// update in settlePayment() atomically. That is assumed, exactly as
// helpers/spendCurrency.js assumes it. The end-to-end "the same webhook
// delivered twice grants once" property is verified against a real database
// (see docs — it is a manual integration check, not part of this suite,
// because npm test must not require Mongo).

import test from "node:test";
import assert from "node:assert/strict";

import { rowsFor } from "./settlePayment.js";
import { PASS_DURATION_DAYS, getProduct, PACK_STORIES } from "../config/priceCatalog.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 6, 12, 0, 0);
const PAYMENT_ID = "payment-1";

const paymentFor = (skus) => ({
  _id: PAYMENT_ID,
  items: skus.map((sku) => {
    const product = getProduct(sku);
    return { sku, amountMinor: product.amountMinor, durationDays: product.durationDays ?? null };
  }),
});

const PACK = "pack-easy";
const STORY = `story-${PACK_STORIES["pack-easy"][0].replace("/", "-")}`;
const PASS = "all-access-90d";

test("a perpetual SKU produces one never-expiring row tagged with its payment", () => {
  const { perpetual, extensions } = rowsFor(paymentFor([PACK]), [], NOW);
  assert.equal(extensions.length, 0);
  assert.equal(perpetual.length, 1);
  assert.equal(perpetual[0].sku, PACK);
  assert.equal(perpetual[0].expiresAt, null);
  assert.equal(perpetual[0].source, "purchase");
  // paymentId is what makes the $push idempotent — not decoration.
  assert.equal(perpetual[0].paymentId, PAYMENT_ID);
});

test("a first-time pass expires exactly the catalog duration from now", () => {
  const { extensions, perpetual } = rowsFor(paymentFor([PASS]), [], NOW);
  assert.equal(perpetual.length, 0);
  assert.equal(extensions.length, 1);
  assert.equal(extensions[0].hadRow, false);
  assert.equal(+extensions[0].expiresAt, NOW + PASS_DURATION_DAYS * DAY);
});

test("renewing an ACTIVE pass adds to it rather than resetting it", () => {
  // The failure this prevents: renewing early silently throws away the time
  // you had left, which is the kind of thing that produces a refund request.
  const remaining = 30 * DAY;
  const existing = [{ sku: PASS, expiresAt: new Date(NOW + remaining) }];
  const { extensions } = rowsFor(paymentFor([PASS]), existing, NOW);
  assert.equal(extensions[0].hadRow, true);
  assert.equal(+extensions[0].expiresAt, NOW + remaining + PASS_DURATION_DAYS * DAY);
});

test("re-buying an EXPIRED pass starts from now, not from the old expiry", () => {
  // Extending from a date in the past would hand back a pass that is still
  // expired — the customer pays and gets nothing.
  const existing = [{ sku: PASS, expiresAt: new Date(NOW - 60 * DAY) }];
  const { extensions } = rowsFor(paymentFor([PASS]), existing, NOW);
  assert.equal(extensions[0].hadRow, true);
  assert.equal(+extensions[0].expiresAt, NOW + PASS_DURATION_DAYS * DAY);
});

test("a pass expiring exactly now is treated as expired", () => {
  // Matches isActive()'s exclusive boundary in config/entitlements.js.
  const existing = [{ sku: PASS, expiresAt: new Date(NOW) }];
  const { extensions } = rowsFor(paymentFor([PASS]), existing, NOW);
  assert.equal(+extensions[0].expiresAt, NOW + PASS_DURATION_DAYS * DAY);
});

test("a mixed payment splits into perpetual pushes and dated extensions", () => {
  const { perpetual, extensions } = rowsFor(paymentFor([PACK, STORY, PASS]), [], NOW);
  assert.deepEqual(perpetual.map((r) => r.sku).sort(), [PACK, STORY].sort());
  assert.deepEqual(extensions.map((r) => r.sku), [PASS]);
});

test("an item whose SKU has left the catalog grants nothing and does not throw", () => {
  // Orders are permanent, catalogs are edited. An exception here would strand
  // a payment that has already been taken.
  const payment = { _id: PAYMENT_ID, items: [{ sku: "pack-atlantis", amountMinor: 1 }] };
  assert.doesNotThrow(() => rowsFor(payment, [], NOW));
  const { perpetual, extensions } = rowsFor(payment, [], NOW);
  assert.equal(perpetual.length + extensions.length, 0);
});

test("a payment with no items grants nothing", () => {
  for (const payment of [{ _id: PAYMENT_ID }, { _id: PAYMENT_ID, items: [] }]) {
    const { perpetual, extensions } = rowsFor(payment, [], NOW);
    assert.equal(perpetual.length + extensions.length, 0);
  }
});

test("the stored durationDays wins over the catalog's current value", () => {
  // The order is a priced SNAPSHOT. If the catalog later changes the pass to
  // 30 days, someone who already bought 90 must still receive 90.
  const payment = {
    _id: PAYMENT_ID,
    items: [{ sku: PASS, amountMinor: getProduct(PASS).amountMinor, durationDays: 365 }],
  };
  const { extensions } = rowsFor(payment, [], NOW);
  assert.equal(+extensions[0].expiresAt, NOW + 365 * DAY);
});
