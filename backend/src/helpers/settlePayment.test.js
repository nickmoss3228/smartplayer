// helpers/settlePayment.test.js
//
// Covers rowsFor() — the decision about WHAT a settled payment grants — with
// no database in the loop. Importing the module pulls in the mongoose schemas
// but never connects; defining a schema is not a connection.
//
// What is deliberately NOT tested here: that Mongo applies the conditional
// update in settlePayment() atomically. That is assumed, exactly as
// helpers/spendCurrency.js assumes it. The end-to-end "the same webhook
// delivered twice grants once" property is verified against a real database by
// scripts/verifyPaymentLoop.mjs, because npm test must not require Mongo.
//
// Nothing in the catalog is dated any more, but rowsFor still honours a
// durationDays stored on an order line, so the extension rules are exercised
// through that path rather than deleted.

import test from "node:test";
import assert from "node:assert/strict";

import { rowsFor } from "./settlePayment.js";
import { BUILT_IN_CATALOG, setSku, storySku } from "../config/priceCatalog.js";

const { getProduct } = BUILT_IN_CATALOG;

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 6, 12, 0, 0);
const PAYMENT_ID = "payment-1";

const SET = setSku("leo");
const STORY = storySku("easy/leo");

const line = (sku, durationDays = null) => ({
  sku,
  amountMinor: getProduct(sku).amountMinor,
  durationDays,
});
const paymentOf = (...items) => ({ _id: PAYMENT_ID, items });

test("a perpetual SKU produces one never-expiring row tagged with its payment", () => {
  const { perpetual, extensions } = rowsFor(paymentOf(line(SET)), [], NOW);
  assert.equal(extensions.length, 0);
  assert.equal(perpetual.length, 1);
  assert.equal(perpetual[0].sku, SET);
  assert.equal(perpetual[0].expiresAt, null);
  assert.equal(perpetual[0].source, "purchase");
  // paymentId is what makes the $push idempotent — not decoration.
  assert.equal(perpetual[0].paymentId, PAYMENT_ID);
});

test("a dated line expires exactly its duration from now", () => {
  const { extensions, perpetual } = rowsFor(paymentOf(line(STORY, 30)), [], NOW);
  assert.equal(perpetual.length, 0);
  assert.equal(extensions[0].hadRow, false);
  assert.equal(+extensions[0].expiresAt, NOW + 30 * DAY);
});

test("renewing an ACTIVE dated row adds to it rather than resetting it", () => {
  const remaining = 10 * DAY;
  const existing = [{ sku: STORY, expiresAt: new Date(NOW + remaining) }];
  const { extensions } = rowsFor(paymentOf(line(STORY, 30)), existing, NOW);
  assert.equal(extensions[0].hadRow, true);
  assert.equal(+extensions[0].expiresAt, NOW + remaining + 30 * DAY);
});

test("re-buying an EXPIRED dated row starts from now, not from the old expiry", () => {
  const existing = [{ sku: STORY, expiresAt: new Date(NOW - 60 * DAY) }];
  const { extensions } = rowsFor(paymentOf(line(STORY, 30)), existing, NOW);
  assert.equal(+extensions[0].expiresAt, NOW + 30 * DAY);
});

test("a row expiring exactly now is treated as expired", () => {
  const existing = [{ sku: STORY, expiresAt: new Date(NOW) }];
  const { extensions } = rowsFor(paymentOf(line(STORY, 30)), existing, NOW);
  assert.equal(+extensions[0].expiresAt, NOW + 30 * DAY);
});

test("a mixed payment splits into perpetual pushes and dated extensions", () => {
  const { perpetual, extensions } = rowsFor(paymentOf(line(SET), line(STORY, 30)), [], NOW);
  assert.deepEqual(perpetual.map((r) => r.sku), [SET]);
  assert.deepEqual(extensions.map((r) => r.sku), [STORY]);
});

test("an item whose SKU has left the catalog grants nothing and does not throw", () => {
  const payment = { _id: PAYMENT_ID, items: [{ sku: "all-access-90d", amountMinor: 1, durationDays: 90 }] };
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
