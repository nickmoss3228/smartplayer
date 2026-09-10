// services/payments/fake.js
//
// A payment acquirer that takes no money and otherwise behaves like one.
//
// This is a FAKE, not a mock: a working implementation with the money removed,
// rather than a test double that records calls. It is what makes the feature
// developable — real acquirer onboarding needs a legal entity, and that is a
// question for an accountant, not a programmer — but more importantly it is what
// makes the feature TESTABLE, because it exercises the same paths a real one
// will.
//
// ── WHAT IT REFUSES TO SHORTCUT ────────────────────────────────────────────
//
// The version this replaced settled payments in-process: the fake checkout page
// called an endpoint, that endpoint called settlePayment() directly, and then
// the browser navigated. Everything interesting was skipped. The webhook route
// never ran, the idempotency latch never saw a duplicate, and the return page's
// polling loop always found the payment already granted.
//
// So this one goes the long way round. On "pay" it schedules a real HTTP POST to
// the callbackUrl it was handed at create time, some seconds later, with retries
// on failure — out of process as far as the rest of the app is concerned. The
// browser is redirected immediately, before the callback lands, which recreates
// the race the polling loop exists for.
//
// ── TWO DELIBERATE INCONVENIENCES ──────────────────────────────────────────
//
// It speaks RUBLES (532.10), not kopecks, and its statuses are UPPERCASE
// ("PAID", not "succeeded"). Both are annoying, both are what real RU gateways
// do, and both mean the driver's translation layer is exercised on every local
// run instead of lying dormant until an acquirer with different conventions
// arrives.

import crypto from "crypto";
import { config } from "../../config/env.js";
import { FakePayment } from "../../models/FakePayment.js";
import { CallbackRejected, CallbackUnparseable } from "./errors.js";
import { verifyOrder } from "../../helpers/callbackToken.js";

export const name = "fake";

/** No money moves here. config/env.js refuses to enable this in production. */
export const realMoney = false;

// ── Money ──────────────────────────────────────────────────────────────────

/**
 * Kopecks in, rubles out. toFixed(2) before Number() is not decoration:
 * 5321 / 100 is 53.21, but plenty of values land on 53.209999999999994, and an
 * acquirer that rejects the amount rarely tells you which field was wrong.
 */
// Exported not for convenience but because this IS the driver boundary: the
// contract says minor units cross it, and a test that cannot see the conversion
// cannot check that promise.
export const toRubles = (amountMinor) => Number((amountMinor / 100).toFixed(2));
export const toMinor = (rubles) => Math.round(Number(rubles) * 100);

// ── Status ─────────────────────────────────────────────────────────────────

const INTERNAL = {
  new: "pending",
  pending: "pending",
  paid: "succeeded",
  failed: "failed",
  canceled: "canceled",
  refunded: "refunded",
};

/**
 * Their vocabulary to ours. Anything unrecognised becomes "pending" — the one
 * safe default, because it grants nothing and leaves the payment eligible for a
 * later, better-understood notification.
 */
export const normalizeStatus = (value) =>
  INTERNAL[String(value ?? "").toLowerCase()] ?? "pending";

// ── Creating a payment ─────────────────────────────────────────────────────

export async function createPayment({ orderId, amountMinor, currency = "RUB", callbackUrl }) {
  const id = `fake_${crypto.randomUUID()}`;

  await FakePayment.create({
    _id: id,
    orderId: String(orderId),
    amountMinor,
    currency,
    status: "PENDING",
    // Captured now, exactly as an acquirer would. A later change to
    // PUBLIC_API_BASE must not retarget callbacks for payments already in
    // flight.
    callbackUrl,
    sim: { delayMs: config.payments.fakeDelayMs },
  });

  // Stands in for the bank's hosted page. Deliberately on the frontend origin,
  // so the redirect is a genuine cross-page navigation rather than a route
  // change inside the SPA.
  const base = (config.frontendUrl ?? "").replace(/\/+$/, "");

  return {
    providerPaymentId: id,
    confirmationUrl: `${base}/checkout/fake?fp=${encodeURIComponent(id)}`,
    status: "pending",
    raw: { fake: true, id },
  };
}

// ── Reading a payment (optional in the contract; present here) ──────────────

/**
 * Present because it costs one query and keeps the reconciler's primary sweep
 * exercised locally. Some real acquirers have no equivalent at all, which is why
 * the contract makes it optional and jobs/reconcilePayments.js feature-detects
 * it — see driverContract.test.js, which runs the whole suite a second time
 * against a copy of this driver with the optional methods stripped off.
 */
export async function getPayment(providerPaymentId) {
  const row = await FakePayment.findById(providerPaymentId);
  if (!row) {
    // Report unknown as pending rather than inventing an outcome. It mirrors
    // what a real acquirer does for an id it is still processing, and the
    // reconciler will simply ask again.
    return { status: "pending", amountMinor: null, raw: { fake: true, unknown: true } };
  }
  return {
    status: normalizeStatus(row.status),
    amountMinor: row.amountMinor,
    raw: row.toObject(),
  };
}

// `refund` is deliberately ABSENT. Nothing in the app calls it, no route exposes
// it, and a stub returning a fabricated success would be worse than nothing —
// the contract says optional methods may be missing, but must not lie.

// ── Reading a callback ─────────────────────────────────────────────────────

export function parseCallback({ rawBody, query }) {
  const orderId = query?.order;
  const token = query?.t;

  if (!orderId || !token) {
    throw new CallbackUnparseable("callback is missing ?order or ?t");
  }

  // FIRST, before the body is even parsed. A forged notification should cost us
  // one HMAC and nothing else.
  if (!verifyOrder(String(orderId), String(token))) {
    throw new CallbackRejected(`callback token does not verify for order ${orderId}`);
  }

  let body;
  try {
    // express.raw hands us a Buffer, deliberately: the exact bytes are what a
    // signature check needs, and what settles an argument with an acquirer.
    const text = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody ?? "");
    body = JSON.parse(text);
  } catch {
    throw new CallbackUnparseable("callback body is not JSON");
  }

  if (!body || typeof body !== "object") {
    throw new CallbackUnparseable("callback body is not an object");
  }

  return {
    orderId: String(orderId),
    providerPaymentId: body.paymentId ?? null,
    status: normalizeStatus(body.status),
    // Their rubles, our kopecks. This conversion happens here and nowhere else.
    amountMinor: body.amount === undefined ? null : toMinor(body.amount),
    currency: body.currency ?? null,
    paidAt: body.paidAt ? new Date(body.paidAt) : null,
    raw: body,
  };
}

// ── The acquirer's own behaviour ───────────────────────────────────────────
//
// Everything below stands in for what happens on the bank's side. Nothing in
// the app calls it; the fake checkout page does, through the control endpoints
// in payment.controller.js.

const ACTION_STATUS = { pay: "PAID", decline: "FAILED", cancel: "CANCELED" };

/** What the fake checkout page renders. */
export async function describe(id) {
  const row = await FakePayment.findById(id);
  if (!row) return null;
  return {
    id: row._id,
    orderId: row.orderId,
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: row.status,
    sim: row.sim,
    deliveries: row.deliveries,
    delivered: row.delivered,
  };
}

/**
 * The customer pressed a button on the bank's page.
 *
 * Returns as soon as the decision is recorded, WITHOUT waiting for the
 * callback — the browser must be able to come home before the notification
 * arrives, because that is the ordering a real acquirer produces and the one the
 * return page's polling has to survive.
 */
export async function act(id, { action, sim = {} } = {}) {
  const status = ACTION_STATUS[action];
  if (!status) return null;

  const row = await FakePayment.findById(id);
  if (!row) return null;
  // A completed payment is final on the acquirer's side; its page would show an
  // outcome rather than buttons.
  if (row.status !== "PENDING" && row.status !== "NEW") return { alreadyDecided: true, row };

  row.status = status;
  row.paidAt = status === "PAID" ? new Date() : null;
  row.sim = {
    delayMs: Number.isFinite(Number(sim.delayMs)) ? Number(sim.delayMs) : row.sim.delayMs,
    deliver: sim.deliver ?? row.sim.deliver,
    amount: sim.amount ?? row.sim.amount,
  };
  await row.save();

  scheduleDelivery(row._id, row.sim.delayMs);
  return { alreadyDecided: false, row };
}

const timers = new Map();

export function scheduleDelivery(id, delayMs = 0) {
  clearTimeout(timers.get(id));
  const timer = setTimeout(() => {
    timers.delete(id);
    deliverNow(id).catch((error) =>
      console.error(`[fake] delivery for ${id} threw:`, error.message)
    );
  }, Math.max(0, Number(delayMs) || 0));
  // Never hold the process open on shutdown.
  timer.unref?.();
  timers.set(id, timer);
}

const RETRIES = 3;
const RETRY_GAP_MS = 1000;
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Deliver the notification, retrying the way a real acquirer does.
 *
 * The retry policy is the part worth having: it proves our webhook answers 2xx
 * for everything it has genuinely dealt with. A handler that returns 500 on a
 * duplicate looks fine in isolation and produces an acquirer retrying every
 * second until it gives up — at which point a real payment is stranded.
 */
export async function deliverNow(id) {
  const row = await FakePayment.findById(id);
  if (!row) return { skipped: "unknown" };

  if (row.sim.deliver === "never") {
    console.warn(`[fake] ${id} decided ${row.status}, delivering NOTHING (simulated loss)`);
    return { skipped: "simulated-loss" };
  }

  const rounds = row.sim.deliver === "twice" ? 2 : 1;
  let last;
  for (let round = 0; round < rounds; round += 1) {
    last = await deliverOnce(row);
    // A duplicate arrives close behind the original, not minutes later — that
    // narrow gap is what makes the latch's race worth testing.
    if (round + 1 < rounds) await sleep(200);
  }
  return last;
}

async function deliverOnce(row) {
  const amountMinor = row.sim.amount === "wrong" ? row.amountMinor + 100 : row.amountMinor;

  const body = {
    paymentId: row._id,
    clientOrderId: row.orderId,
    status: row.status,
    amount: toRubles(amountMinor),
    currency: row.currency,
    ...(row.status === "PAID" ? { paidAt: (row.paidAt ?? new Date()).toISOString() } : {}),
    ...(row.status === "FAILED" ? { failedAt: new Date().toISOString() } : {}),
    ...(row.status === "CANCELED" ? { canceledAt: new Date().toISOString() } : {}),
  };

  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    let code = null;
    let error = null;

    try {
      const res = await fetch(row.callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      code = res.status;
      if (res.ok) {
        await FakePayment.updateOne(
          { _id: row._id },
          { $set: { delivered: true }, $push: { deliveries: { attempt, code } } }
        );
        console.log(`[fake] delivered ${row._id} (${row.status}) -> ${code} on attempt ${attempt}`);
        return { ok: true, code, attempt };
      }
    } catch (err) {
      error = err.message;
    }

    await FakePayment.updateOne(
      { _id: row._id },
      { $push: { deliveries: { attempt, code, error } } }
    );
    console.warn(
      `[fake] delivery ${attempt}/${RETRIES} for ${row._id} failed (${code ?? error})`
    );
    if (attempt < RETRIES) await sleep(RETRY_GAP_MS);
  }

  console.error(`[fake] gave up delivering ${row._id} after ${RETRIES} attempts`);
  return { ok: false };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Boot recovery.
 *
 * A real acquirer's retry queue survives its own restarts; ours has to survive
 * nodemon. Without this, restarting the backend during the delivery delay
 * strands the payment forever — exactly the scenario the old in-process Map made
 * impossible to test, and exactly the one worth testing.
 */
export async function resumePendingDeliveries() {
  const stranded = await FakePayment.find({
    delivered: false,
    status: { $in: ["PAID", "FAILED", "CANCELED"] },
    "sim.deliver": { $ne: "never" },
  }).select("_id");

  for (const row of stranded) scheduleDelivery(row._id, 0);

  if (stranded.length) {
    console.log(`[fake] re-scheduled ${stranded.length} undelivered callback(s) after restart`);
  }
  return stranded.length;
}
