// helpers/callbackToken.js
//
// Proves that a callback came from someone we handed the URL to.
//
// This is OUR infrastructure, not any acquirer's, which is why it lives here
// rather than inside a driver. We always choose the callbackUrl, so we can
// always plant a secret in it — and that works identically for an acquirer that
// signs its notifications and one that offers nothing at all. A driver whose
// acquirer DOES sign is free to verify that too; this is the floor, not the
// ceiling.
//
// The token is per-payment, not per-environment. That matters: acquirers log the
// URLs they call, support staff paste them into tickets, and proxies keep access
// logs. A single shared token in a URL leaks once and forges everything. This
// one leaks and forges exactly the order it already belonged to, which is worth
// nothing to an attacker — the order is already paid or already dead.

import crypto from "crypto";
import { config } from "../config/env.js";

function secret() {
  const value = config.payments.callbackSecret;
  if (!value) {
    // Never sign with a fallback. A predictable secret is indistinguishable
    // from no authentication, and it would fail silently rather than loudly.
    throw new Error(
      "PAYMENTS_CALLBACK_SECRET is not set — refusing to sign a callback token. " +
        "Generate one with `openssl rand -hex 32`."
    );
  }
  return value;
}

/** Hex HMAC-SHA256 of the order id. Deterministic, so it never needs storing. */
export function signOrder(orderId) {
  return crypto.createHmac("sha256", secret()).update(String(orderId)).digest("hex");
}

/**
 * Constant-time comparison.
 *
 * `===` on a secret leaks its contents through timing: it returns at the first
 * differing byte, so an attacker who can measure the difference recovers the
 * token one character at a time. timingSafeEqual always reads both buffers to
 * the end. It THROWS on a length mismatch rather than returning false, so the
 * lengths are compared first — that comparison leaks only the length of a
 * fixed-length digest, which is public.
 */
export function verifyOrder(orderId, token) {
  if (typeof orderId !== "string" || !orderId) return false;
  if (typeof token !== "string" || !token) return false;

  const expected = Buffer.from(signOrder(orderId), "utf8");
  const given = Buffer.from(token, "utf8");
  if (expected.length !== given.length) return false;

  return crypto.timingSafeEqual(expected, given);
}

/**
 * The full URL an acquirer should call. Built per payment, so the token is
 * bound to the order it belongs to.
 */
export function callbackUrlFor(driverName, orderId) {
  const base = (config.payments.publicApiBase ?? "").replace(/\/+$/, "");
  return (
    `${base}/api/payments/${driverName}/webhook` +
    `?order=${encodeURIComponent(orderId)}&t=${signOrder(orderId)}`
  );
}
