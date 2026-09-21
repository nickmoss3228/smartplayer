// helpers/callbackToken.test.js
//
// The only thing standing between a forged POST and a free entitlement, so it
// gets tested harder than its size suggests.
//
// Dynamic imports: config/env.js reads process.env at module scope and static
// imports hoist above assignments, so the secret has to be planted first.

import test from "node:test";
import assert from "node:assert/strict";

process.env.PAYMENTS_CALLBACK_SECRET =
  "callback-token-test-secret-fedcba9876543210fedcba98";

const { signOrder, verifyOrder, callbackUrlFor } = await import("./callbackToken.js");
const { config } = await import("../config/env.js");

const ORDER = "64b7f1c2e4a1d2f3a4b5c6d7";
const OTHER = "64b7f1c2e4a1d2f3a4b5c6d8";

test("signing is deterministic, so the token never needs storing", () => {
  assert.equal(signOrder(ORDER), signOrder(ORDER));
});

test("a token verifies for the order it was issued for", () => {
  assert.equal(verifyOrder(ORDER, signOrder(ORDER)), true);
});

test("a token issued for one order does not verify for another", () => {
  // The property that makes a leaked callback URL worth nothing: acquirers log
  // the URLs they call, and support staff paste them into tickets.
  assert.equal(verifyOrder(OTHER, signOrder(ORDER)), false);
});

test("a tampered token is refused", () => {
  const token = signOrder(ORDER);
  const flipped = `${token.slice(0, -1)}${token.endsWith("0") ? "1" : "0"}`;
  assert.equal(verifyOrder(ORDER, flipped), false);
});

test("a wrong-length token is refused rather than throwing", () => {
  // timingSafeEqual throws on a length mismatch instead of returning false, so
  // an attacker could turn the endpoint into a 500 generator by sending a short
  // token. The length is compared first for exactly this reason.
  assert.doesNotThrow(() => verifyOrder(ORDER, "abc"));
  assert.equal(verifyOrder(ORDER, "abc"), false);
  assert.equal(verifyOrder(ORDER, signOrder(ORDER) + "ff"), false);
});

test("empty and non-string tokens are refused", () => {
  for (const bad of ["", null, undefined, 12345, {}, []]) {
    assert.equal(verifyOrder(ORDER, bad), false, `accepted ${JSON.stringify(bad)}`);
  }
});

test("an empty order id never verifies", () => {
  assert.equal(verifyOrder("", signOrder("")), false);
});

test("the callback URL carries the order and its token", () => {
  config.payments.publicApiBase = "https://example.test";
  const url = new URL(callbackUrlFor("fake", ORDER));

  assert.equal(url.pathname, "/api/payments/fake/webhook");
  assert.equal(url.searchParams.get("order"), ORDER);
  assert.equal(verifyOrder(ORDER, url.searchParams.get("t")), true);
});

test("a trailing slash on the base does not produce a doubled path", () => {
  config.payments.publicApiBase = "https://example.test/";
  assert.ok(callbackUrlFor("fake", ORDER).startsWith("https://example.test/api/payments/"));
});

test("signing refuses to fall back to a default secret", () => {
  // A predictable secret is indistinguishable from no authentication at all, and
  // it would fail silently rather than loudly — so the failure is made loud.
  const saved = config.payments.callbackSecret;
  config.payments.callbackSecret = undefined;
  try {
    assert.throws(() => signOrder(ORDER), /PAYMENTS_CALLBACK_SECRET/);
  } finally {
    config.payments.callbackSecret = saved;
  }
});
