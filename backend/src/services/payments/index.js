// services/payments/index.js
//
// The payment driver registry, and the contract every driver honours.
//
// The point of the seam: what varies between acquirers is enormous — the money
// format, the status vocabulary, how a callback proves it came from them,
// whether you can ask about a payment at all — and none of it should be visible
// to the controller, the ledger, or the frontend. Adding an acquirer must be one
// new file here plus one line in ADAPTERS. If it ever needs a change elsewhere,
// this contract was wrong; fix the contract rather than special-casing the
// caller.
//
// ── THE CONTRACT ───────────────────────────────────────────────────────────
//
// Required of every driver:
//
//   name: string
//   realMoney: boolean
//     Whether this driver can actually charge someone. config/env.js refuses to
//     enable payments in production for any driver where this is not true — a
//     denylist of one name (the shape this used to have) silently reopens the
//     hole the moment a second fake exists or one gets renamed.
//
//   createPayment({ orderId, amountMinor, currency, description, customer,
//                   returnUrls: { success, fail }, callbackUrl, metadata })
//     -> { providerPaymentId, confirmationUrl, status, raw }
//
//   parseCallback({ rawBody, query, headers })
//     -> { orderId, providerPaymentId, status, amountMinor, currency, paidAt, raw }
//     Throws CallbackRejected    (-> 403) when authentication fails.
//     Throws CallbackUnparseable (-> 400) when the payload is not one of ours.
//
// Optional, feature-detected. Absent is fine. A stub that lies is not:
//
//   getPayment(providerPaymentId) -> { status, amountMinor, raw }
//   refund({ providerPaymentId, amountMinor, currency, idempotenceKey })
//
// ── WHY parseCallback IS THE PIVOT ─────────────────────────────────────────
//
// Acquirers authenticate their notifications in incompatible ways: an HMAC
// header, a source-IP allowlist, a secret we planted in the callback URL, or
// "trust nothing in the body, re-fetch the payment over our API". They also
// disagree about the body's shape and about what the statuses are called.
//
// Put that knowledge in the controller and every new acquirer edits the
// controller. Put it behind one method and the controller is written once: it
// hands over bytes and gets back the contract's shape, or an error telling it
// which HTTP status to return.
//
// ── TWO INVARIANTS THAT CROSS THE BOUNDARY ─────────────────────────────────
//
// STATUS is a closed set: "pending" | "succeeded" | "failed" | "canceled" |
// "refunded". Drivers translate into it. Anything a driver does not recognise
// becomes "pending" — never something grantable.
//
// MONEY is integer minor units (kopecks) at the boundary, always. Whatever
// decimal string or float an acquirer wants happens inside that driver and
// nowhere else. Spreading a second money format through this codebase is the
// classic way to charge someone a hundredth of the intended price.

import { config } from "../../config/env.js";
import * as fake from "./fake.js";

// Re-exported so callers have one import site for the whole contract; the
// definitions live in ./errors.js so drivers can import them without pulling
// in the registry that imports the drivers.
export { CallbackRejected, CallbackUnparseable } from "./errors.js";

/** The only statuses allowed to cross the driver boundary. */
export const STATUSES = Object.freeze([
  "pending",
  "succeeded",
  "failed",
  "canceled",
  "refunded",
]);

const ADAPTERS = { fake };

const REQUIRED_METHODS = ["createPayment", "parseCallback"];

/**
 * Boot-time shape check. A driver that half-implements the contract should fail
 * at startup with a sentence naming what is missing — not at the first checkout,
 * where the failure lands on a customer instead of on whoever wrote the driver.
 */
export function assertDriverShape(driver, key = driver?.name) {
  const problems = [];

  if (typeof driver?.name !== "string" || !driver.name) problems.push("missing `name`");
  if (typeof driver?.realMoney !== "boolean") problems.push("missing boolean `realMoney`");

  for (const method of REQUIRED_METHODS) {
    if (typeof driver?.[method] !== "function") problems.push(`missing \`${method}()\``);
  }

  // Optional methods may be absent. They may NOT be present-but-not-callable:
  // the reconciler feature-detects with `typeof === "function"`, so a truthy
  // non-function would be detected as available and then throw mid-sweep.
  for (const method of ["getPayment", "refund"]) {
    if (driver?.[method] !== undefined && typeof driver[method] !== "function") {
      problems.push(`\`${method}\` is present but not a function`);
    }
  }

  if (problems.length) {
    throw new Error(`Payment driver "${key}" does not satisfy the contract: ${problems.join(", ")}.`);
  }
  return driver;
}

export function getProvider() {
  const adapter = ADAPTERS[config.payments.provider];
  if (!adapter) {
    // Falling back to a fake here would be the worst possible failure: the shop
    // would appear to work while charging nobody. Refuse instead.
    throw new Error(
      `Unknown PAYMENTS_PROVIDER "${config.payments.provider}". ` +
        `Expected one of: ${Object.keys(ADAPTERS).join(", ")}.`
    );
  }
  return adapter;
}

/** True when the selected driver moves no money — the UI says so on the checkout page. */
export const isFakeProvider = () => getProvider().realMoney === false;

/** Called once from server.js, so a broken driver stops the boot rather than a purchase. */
export function assertProvidersValid() {
  for (const [key, adapter] of Object.entries(ADAPTERS)) assertDriverShape(adapter, key);
}

export { ADAPTERS };

/**
 * Refuse to take money in production with a driver that cannot take money.
 *
 * This used to be a check for the literal name "mock", which is the wrong shape:
 * it protects against exactly one string, so renaming that driver or adding a
 * second fake silently disarms it — and the failure it disarms is the worst one
 * available, a shop that appears to work while charging nobody.
 *
 * Keying on the driver's own `realMoney` flag makes the safe behaviour the
 * default for every driver that will ever exist: a new one has to declare itself
 * capable of charging before production will run it.
 *
 * Lives here rather than in config/env.js because the answer belongs to the
 * driver, and env.js cannot import the registry that reads env.js. server.js
 * calls this at boot, before anything can be bought.
 */
export function assertPaymentsSafeForEnvironment() {
  if (!config.payments.enabled) return;

  const driver = getProvider();
  if (config.nodeEnv === "production" && driver.realMoney !== true) {
    console.error(
      `[payments] PAYMENTS_ENABLED=true with driver "${driver.name}" in production.\n` +
        `[payments] DISABLED: this driver moves no money, so every order would grant\n` +
        `[payments] entitlements to someone who was never charged.`
    );
    config.payments.enabled = false;
    return;
  }

  console.log(
    `[payments] enabled with driver "${driver.name}"` +
      (driver.realMoney ? " (REAL MONEY)" : " (no money moves)")
  );
}
