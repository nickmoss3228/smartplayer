// helpers/settlePayment.test.js
//
// Covers rowsFor() — the decision about WHAT a settled payment grants — with
// no database in the loop. Importing the module loads the data layer, which
// is lazy (db/client.ts) and opens no connection until something queries.
//
// What is deliberately NOT tested here: that Postgres applies the conditional
// update in settlePayment() atomically. That is assumed, exactly as
// helpers/spendCurrency.js assumes it. The end-to-end "the same webhook
// delivered twice grants once" property is verified against a real database by
// scripts/verifyPaymentLoop.mjs, because npm test must not require a database.
//
// Everything sold is a subscription, so every grant is dated, and the
// extension rules below are the whole of what a renewal means.

import test from "node:test";
import assert from "node:assert/strict";

import { rowsFor } from "./settlePayment.js";
import {
  ALL_SUBSCRIPTION_SKU,
  BUILT_IN_CATALOG,
  SUBSCRIPTION_DAYS,
  levelSubscriptionSku,
} from "../config/priceCatalog.js";

const { getProduct } = BUILT_IN_CATALOG;

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 6, 12, 0, 0);
const PAYMENT_ID = "payment-1";
const PERIOD = SUBSCRIPTION_DAYS * DAY;

const EASY = levelSubscriptionSku("easy");
const ALL = ALL_SUBSCRIPTION_SKU;

const line = (sku, durationDays = SUBSCRIPTION_DAYS) => ({
  sku,
  amountMinor: getProduct(sku).amountMinor,
  durationDays,
});
const paymentOf = (...items) => ({ _id: PAYMENT_ID, items });

test("a subscription produces one dated row, a period from now, tagged with its payment", () => {
  const { perpetual, extensions } = rowsFor(paymentOf(line(EASY)), [], NOW);
  assert.equal(perpetual.length, 0);
  assert.equal(extensions.length, 1);
  assert.equal(extensions[0].sku, EASY);
  assert.equal(extensions[0].hadRow, false);
  assert.equal(+extensions[0].expiresAt, NOW + PERIOD);
  // paymentId is what lets a refund find the row — not decoration.
  assert.equal(extensions[0].paymentId, PAYMENT_ID);
});

test("an order line with no period falls back to the product's own", () => {
  const { perpetual, extensions } = rowsFor(paymentOf(line(EASY, null)), [], NOW);
  assert.equal(perpetual.length, 0, "a subscription never turns perpetual");
  assert.equal(+extensions[0].expiresAt, NOW + PERIOD);
});

test("renewing a LIVE subscription adds to it rather than resetting it", () => {
  const remaining = 10 * DAY;
  const existing = [{ sku: EASY, expiresAt: new Date(NOW + remaining) }];
  const { extensions } = rowsFor(paymentOf(line(EASY)), existing, NOW);
  assert.equal(extensions[0].hadRow, true);
  assert.equal(+extensions[0].expiresAt, NOW + remaining + PERIOD);
});

test("re-buying an ENDED subscription starts from now, not from the old end", () => {
  const existing = [{ sku: EASY, expiresAt: new Date(NOW - 60 * DAY) }];
  const { extensions } = rowsFor(paymentOf(line(EASY)), existing, NOW);
  assert.equal(+extensions[0].expiresAt, NOW + PERIOD);
});

test("a row ending exactly now is treated as ended", () => {
  const existing = [{ sku: EASY, expiresAt: new Date(NOW) }];
  const { extensions } = rowsFor(paymentOf(line(EASY)), existing, NOW);
  assert.equal(+extensions[0].expiresAt, NOW + PERIOD);
});

test("each subscription extends only its own row", () => {
  const existing = [{ sku: EASY, expiresAt: new Date(NOW + 10 * DAY) }];
  const { extensions } = rowsFor(paymentOf(line(EASY), line(ALL)), existing, NOW);
  const by = Object.fromEntries(extensions.map((r) => [r.sku, +r.expiresAt]));
  assert.equal(by[EASY], NOW + 10 * DAY + PERIOD);
  assert.equal(by[ALL], NOW + PERIOD);
});

test("an item whose SKU has left the catalog grants nothing and does not throw", () => {
  // The per-story and per-character SKUs sold before 2026-10-05, and the old pass.
  for (const sku of ["all-access-90d", "story-easy-leo", "set-leo"]) {
    const payment = { _id: PAYMENT_ID, items: [{ sku, amountMinor: 1, durationDays: 90 }] };
    assert.doesNotThrow(() => rowsFor(payment, [], NOW));
    const { perpetual, extensions } = rowsFor(payment, [], NOW);
    assert.equal(perpetual.length + extensions.length, 0, sku);
  }
});

test("a payment with no items grants nothing", () => {
  for (const payment of [{ _id: PAYMENT_ID }, { _id: PAYMENT_ID, items: [] }]) {
    const { perpetual, extensions } = rowsFor(payment, [], NOW);
    assert.equal(perpetual.length + extensions.length, 0);
  }
});
