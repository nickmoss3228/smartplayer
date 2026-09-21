// services/payments/driverContract.js
//
// The contract, as executable assertions.
//
// This is the payoff of the whole abstraction. Swapping in a real acquirer is
// supposed to be one new file plus one line in ADAPTERS — but "supposed to be"
// is worth very little, so this turns the claim into a checklist a driver either
// passes or does not. When a real acquirer arrives, its driver imports this,
// supplies a harness that knows how to build one genuine callback in that
// acquirer's shape, and the swap is finished when the suite is green.
//
// What it deliberately does NOT test: anything requiring a database or a live
// acquirer. This repo's convention (see helpers/settlePayment.test.js, which
// tests rowsFor and stops) is that the pure surface is unit-tested and the rest
// is covered by the walkthrough in docs/payments-explained.md. The parts that
// matter most here — authentication, money translation, status translation —
// are all pure, which is not a coincidence: they were designed to be.
//
// THE HARNESS a driver must supply:
//
//   makeCallback({ orderId, amountMinor, currency, status })
//     -> { rawBody, query, headers }
//     A genuine notification, authenticated the way that acquirer authenticates.
//
//   tamper(callback) -> callback
//     The same notification with its authentication broken. For an acquirer that
//     signs a header, corrupt the signature; for one authenticated by a token in
//     the URL, corrupt the token.
//
//   foreignOrderId
//     An order id the callback was NOT issued for, used to check that
//     authentication is bound to a specific payment rather than to the
//     environment.

import test from "node:test";
import assert from "node:assert/strict";

import { assertDriverShape, STATUSES } from "./index.js";
import { CallbackRejected, CallbackUnparseable } from "./errors.js";

export function runDriverContract(driver, harness) {
  const { label = driver.name, makeCallback, tamper, foreignOrderId } = harness;
  const at = (what) => `[${label}] ${what}`;

  const ORDER_ID = "64b7f1c2e4a1d2f3a4b5c6d7";
  const AMOUNT_MINOR = 129000; // the real all-access price, in kopecks
  const CURRENCY = "RUB";

  const genuine = (over = {}) =>
    makeCallback({
      orderId: ORDER_ID,
      amountMinor: AMOUNT_MINOR,
      currency: CURRENCY,
      status: "paid",
      ...over,
    });

  test(at("satisfies the driver shape"), () => {
    assert.doesNotThrow(() => assertDriverShape(driver));
  });

  test(at("declares whether it can take real money"), () => {
    // Not merely truthy. server.js refuses anything that is not exactly true in
    // production, so a driver returning "yes" or 1 must fail here rather than be
    // quietly treated as safe.
    assert.equal(typeof driver.realMoney, "boolean");
  });

  test(at("parseCallback returns every field the contract promises"), () => {
    const parsed = driver.parseCallback(genuine());

    assert.equal(parsed.orderId, ORDER_ID, "orderId must survive the round trip");
    assert.ok("providerPaymentId" in parsed, "providerPaymentId must be present, even if null");
    assert.ok(STATUSES.includes(parsed.status), `status "${parsed.status}" is outside the closed set`);
    assert.ok("currency" in parsed);
    assert.ok("raw" in parsed, "raw must be kept — it is what settles an argument later");
  });

  test(at("parseCallback reports money in integer minor units"), () => {
    const parsed = driver.parseCallback(genuine());

    assert.equal(
      parsed.amountMinor,
      AMOUNT_MINOR,
      "the driver must translate the acquirer's money format into kopecks"
    );
    assert.ok(
      Number.isInteger(parsed.amountMinor),
      "a fractional amountMinor means the conversion leaked a float across the boundary"
    );
  });

  test(at("parseCallback survives the money values this app actually charges"), () => {
    // The catalog's three prices, plus two values chosen because naive
    // division produces a repeating binary fraction for them.
    for (const amountMinor of [129000, 69000, 24900, 1050, 53209]) {
      const parsed = driver.parseCallback(genuine({ amountMinor }));
      assert.equal(
        parsed.amountMinor,
        amountMinor,
        `${amountMinor} kopecks did not round-trip — got ${parsed.amountMinor}`
      );
    }
  });

  test(at("a paid callback maps to succeeded"), () => {
    assert.equal(driver.parseCallback(genuine({ status: "paid" })).status, "succeeded");
  });

  test(at("an unrecognised status never becomes grantable"), () => {
    // The failure this prevents: an acquirer adds a status, the driver does not
    // know it, and a default of "succeeded" hands out entitlements for it.
    for (const status of ["banana", "", "SUCCEEDED_MAYBE", "0"]) {
      const parsed = driver.parseCallback(genuine({ status }));
      assert.notEqual(
        parsed.status,
        "succeeded",
        `"${status}" was translated into succeeded, which grants entitlements`
      );
      assert.ok(STATUSES.includes(parsed.status));
    }
  });

  test(at("parseCallback rejects a tampered notification"), () => {
    assert.throws(() => driver.parseCallback(tamper(genuine())), CallbackRejected);
  });

  test(at("authentication is bound to one order, not to the environment"), () => {
    // A notification genuinely issued for order A, replayed against order B.
    // If this passes, one leaked callback URL forges every payment.
    const forOtherOrder = genuine();
    const parsedQuery = { ...forOtherOrder.query, order: foreignOrderId };
    assert.throws(
      () => driver.parseCallback({ ...forOtherOrder, query: parsedQuery }),
      CallbackRejected
    );
  });

  test(at("parseCallback refuses a body that is not JSON"), () => {
    assert.throws(
      () => driver.parseCallback({ ...genuine(), rawBody: Buffer.from("<html>nope</html>") }),
      CallbackUnparseable
    );
  });

  test(at("optional methods are absent or genuinely callable"), () => {
    // "A stub that lies is worse than nothing": the reconciler feature-detects
    // with typeof === "function", so a truthy non-function would be detected as
    // available and then throw in the middle of a sweep.
    for (const method of ["getPayment", "refund"]) {
      if (driver[method] === undefined) continue;
      assert.equal(typeof driver[method], "function", `${method} is present but not callable`);
    }
  });

  test(at("createPayment is callable and the contract knows its shape"), () => {
    assert.equal(typeof driver.createPayment, "function");
    // Actually calling it needs the acquirer (or a database, for the fake), so
    // the behavioural half of this lives in the walkthrough. What is checked
    // here is that the seam exists and has not drifted to a different name.
    assert.equal(driver.createPayment.length >= 1, true);
  });
}
