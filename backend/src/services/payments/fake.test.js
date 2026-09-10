// services/payments/fake.test.js
//
// The fake driver's own translation layer.
//
// The contract suite (driverContract.test.js) checks the promises every driver
// makes. This checks the two things THIS driver does that the contract can only
// observe indirectly: rubles-to-kopecks in both directions, and the acquirer's
// uppercase status vocabulary.
//
// Anything needing a database — createPayment, act, delivery, boot recovery —
// is not here, following the convention settlePayment.test.js already sets:
// unit-test the pure surface, cover the rest in the walkthrough. The delivery
// path is what the walkthrough's steps 2 through 8 exist to exercise.

import test from "node:test";
import assert from "node:assert/strict";

process.env.PAYMENTS_CALLBACK_SECRET = "fake-driver-test-secret-00112233445566778899aabb";

const { toRubles, toMinor, normalizeStatus, parseCallback, name, realMoney } = await import(
  "./fake.js"
);
const { signOrder } = await import("../../helpers/callbackToken.js");
const { CallbackUnparseable } = await import("./errors.js");

test("the driver announces itself as taking no money", () => {
  assert.equal(name, "fake");
  assert.equal(realMoney, false);
});

test("kopecks become the rubles a human would write", () => {
  assert.equal(toRubles(129000), 1290);
  assert.equal(toRubles(69000), 690);
  assert.equal(toRubles(24900), 249);
  assert.equal(toRubles(1050), 10.5);
  assert.equal(toRubles(53209), 532.09);
  assert.equal(toRubles(1), 0.01);
});

test("rubles come back as exact integer kopecks", () => {
  assert.equal(toMinor(1290), 129000);
  assert.equal(toMinor(532.09), 53209);
  assert.equal(toMinor(10.5), 1050);
  assert.equal(toMinor(0.01), 1);
});

test("every catalog price survives a round trip", () => {
  // 53209 is here because 53209 / 100 is 532.0899999999999 in binary floating
  // point. Without the toFixed(2) step the acquirer is sent 532.0899999999999,
  // and what comes back is a rejected payment naming no field.
  for (const minor of [129000, 69000, 24900, 1050, 53209, 1, 99, 100]) {
    assert.equal(toMinor(toRubles(minor)), minor, `${minor} did not survive`);
  }
});

test("the acquirer's uppercase vocabulary maps onto ours", () => {
  assert.equal(normalizeStatus("PAID"), "succeeded");
  assert.equal(normalizeStatus("PENDING"), "pending");
  assert.equal(normalizeStatus("NEW"), "pending");
  assert.equal(normalizeStatus("FAILED"), "failed");
  assert.equal(normalizeStatus("CANCELED"), "canceled");
});

test("case is not load-bearing", () => {
  // Acquirers routinely answer PENDING on create and "paid" in the callback.
  for (const spelling of ["paid", "Paid", "PAID", "pAiD"]) {
    assert.equal(normalizeStatus(spelling), "succeeded", `"${spelling}" did not map`);
  }
});

test("an unknown status is pending, never succeeded", () => {
  for (const junk of ["", null, undefined, "AUTHORIZED", "part_paid", 0, {}]) {
    assert.equal(normalizeStatus(junk), "pending", `${JSON.stringify(junk)} mapped elsewhere`);
  }
});

test("a callback with no auth parameters is unparseable, not rejected", () => {
  // The distinction matters at the HTTP layer: unparseable is a 400 ("this is
  // not one of mine"), rejected is a 403 ("this is a forgery"). Conflating them
  // makes a misconfigured proxy look like an attack.
  const body = Buffer.from(JSON.stringify({ status: "PAID" }));
  assert.throws(() => parseCallback({ rawBody: body, query: {} }), CallbackUnparseable);
  assert.throws(
    () => parseCallback({ rawBody: body, query: { order: "abc" } }),
    CallbackUnparseable
  );
});

test("an authenticated callback with a truncated body is unparseable", () => {
  const order = "64b7f1c2e4a1d2f3a4b5c6d7";
  assert.throws(
    () =>
      parseCallback({
        rawBody: Buffer.from('{"status":"PAID","amount":'),
        query: { order, t: signOrder(order) },
      }),
    CallbackUnparseable
  );
});

test("a missing amount is reported as null rather than as zero", () => {
  // Zero would sail through settlePayment's amount check against a zero-priced
  // order, and "I could not tell" must never be indistinguishable from a number.
  const order = "64b7f1c2e4a1d2f3a4b5c6d7";
  const parsed = parseCallback({
    rawBody: Buffer.from(JSON.stringify({ status: "PAID", currency: "RUB" })),
    query: { order, t: signOrder(order) },
  });
  assert.equal(parsed.amountMinor, null);
});
