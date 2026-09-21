// jobs/reconcilePayments.js
//
// Webhooks get lost. Acquirers have outages, containers restart mid-delivery, a
// proxy rule 404s a notification for a week before anyone notices. Without this
// job every one of those becomes "I paid and got nothing" in a support inbox.
//
// THREE SWEEPS, AND ONLY ONE OF THEM NEEDS THE ACQUIRER.
//
//   1. Ask about stale pending payments and settle what has actually been paid.
//      Requires getPayment(), which the driver contract makes OPTIONAL — plenty
//      of acquirers have no status endpoint at all. When the selected driver
//      lacks it this sweep is skipped, and log-watching becomes the fallback
//      for a lost callback. That is a real downgrade, so it is announced loudly
//      at boot rather than discovered later.
//
//   2. Repair a payment latched as succeeded whose entitlements never landed.
//      Settlement now latches, grants and stamps in ONE transaction, so this
//      should find nothing. It stays as a watch on that invariant: if it ever
//      logs, something wrote a latched payment outside settlePayment().
//
//   3. Retire pendings old enough that nothing is coming. Needs nobody. Without
//      it they accumulate forever and sweep 1 re-asks about them every five
//      minutes until the end of time.
//
// Sweep 1 runs payments through the SAME settlePayment() the webhook uses. That
// shared function is the whole point: two code paths to the same outcome would
// eventually disagree, and they would disagree exactly when the webhook path is
// broken and nobody is watching this one.

import { db, payments as paymentsRepo } from "../db/index.js";
import { config } from "../config/env.js";
import { getProvider } from "../services/payments/index.js";
import { settlePayment, grantFor } from "../helpers/settlePayment.js";

const MINUTE = 60 * 1000;

/** How often to sweep. */
export const RECONCILE_INTERVAL_MS = 5 * MINUTE;

/**
 * How old a pending payment must be before we chase it. Long enough that a
 * customer still on the acquirer's payment page is not treated as a failure,
 * short enough that a lost webhook is repaired before anyone writes in.
 */
const MIN_AGE_MS = 15 * MINUTE;

/** Past this, a pending payment was abandoned and the acquirer has forgotten it. */
const MAX_AGE_MS = 3 * 24 * 60 * MINUTE;

/** Bounded so one sweep cannot spend minutes hammering the acquirer's API. */
const BATCH = 50;

export async function reconcileOnce({ now = Date.now() } = {}) {
  const stats = { checked: 0, settled: 0, repaired: 0, retired: 0, errors: 0 };

  const provider = getProvider();
  const canAsk = typeof provider.getPayment === "function";

  // ── Sweep 1: ask the acquirer ────────────────────────────────────────────
  if (canAsk) {
    const pending = await paymentsRepo.findPendingForReconcile(MIN_AGE_MS, MAX_AGE_MS, BATCH, now);

    for (const row of pending) {
      stats.checked += 1;
      try {
        const confirmed = await provider.getPayment(row.providerPaymentId);
        const result = await settlePayment(row.providerPaymentId, confirmed);
        if (result.outcome === "granted") {
          stats.settled += 1;
          console.log(`[reconcile] settled ${row.providerPaymentId} that no webhook delivered`);
        }
      } catch (error) {
        stats.errors += 1;
        console.error(`[reconcile] ${row.providerPaymentId} failed:`, error.message);
      }
    }
  }

  // ── Sweep 2: latched but never applied ───────────────────────────────────
  //
  // Keyed on the PAYMENT (grant_applied_at), not on whether the user holds a
  // row tagged with it: a dated SKU that extends an existing row overwrites
  // that row's payment_id, so the tag-based question would call every
  // superseded payment unapplied and re-grant it forever.
  const unapplied = await paymentsRepo.findUnapplied(MAX_AGE_MS, BATCH, now);

  for (const payment of unapplied) {
    try {
      await db().transaction(async (tx) => {
        await grantFor(payment, tx);
        await paymentsRepo.stampGrantApplied(payment.id, tx);
      });
      stats.repaired += 1;
      console.warn(`[reconcile] repaired missing entitlements for payment ${payment.id}`);
    } catch (error) {
      stats.errors += 1;
      console.error(`[reconcile] repair of ${payment.id} failed:`, error.message);
    }
  }

  // ── Sweep 3: retire the abandoned ────────────────────────────────────────
  //
  // Guarded on granted_at so a payment that settles at the last moment is never
  // overwritten by this. Each one is warned about individually rather than
  // counted silently: with no status endpoint these logs ARE the record that a
  // callback went missing, and Loki is one query from turning them into an
  // alert.
  const abandoned = await paymentsRepo.findAbandoned(MAX_AGE_MS, BATCH, now);

  for (const payment of abandoned) {
    const ageDays = Math.round((now - +new Date(payment.createdAt)) / (24 * 60 * MINUTE));
    const changed = await paymentsRepo.retireAbandoned(payment.id, "abandoned — no callback received");
    if (changed) {
      stats.retired += 1;
      console.warn(
        `[reconcile] retiring ${payment.id} (${payment.amountMinor} ${payment.currency}, ` +
          `user ${payment.userId}, ${ageDays}d old) — no callback ever arrived`
      );
    }
  }

  return stats;
}

/**
 * Started from server.js — lifecycle belongs there, not in app.js.
 *
 * A plain setInterval is right at this scale: docker-compose.yml runs a single
 * backend replica, so there is no leader to elect. If that ever changes, note
 * that a second replica would double-run this and it would still be CORRECT —
 * every write it performs is conditional — merely wasteful.
 */
export function startReconciliation() {
  if (!config.payments.enabled) {
    console.log("[reconcile] payments disabled — reconciliation not started");
    return null;
  }

  let canAsk = false;
  try {
    canAsk = typeof getProvider().getPayment === "function";
  } catch (error) {
    console.error("[reconcile] not started — no usable driver:", error.message);
    return null;
  }

  if (!canAsk) {
    console.warn(
      "[reconcile] the selected driver has no getPayment(), so lost callbacks CANNOT be " +
        "chased automatically. Repair and retirement still run; watch for " +
        '"[reconcile] retiring" in the logs, which means a payment went missing.'
    );
  }

  const timer = setInterval(() => {
    reconcileOnce().catch((error) =>
      console.error("[reconcile] sweep failed:", error.message)
    );
  }, RECONCILE_INTERVAL_MS);

  // Do not hold the process open on shutdown.
  timer.unref?.();
  console.log(
    `[reconcile] started — every ${RECONCILE_INTERVAL_MS / MINUTE} min, ` +
      `chasing payments older than ${MIN_AGE_MS / MINUTE} min`
  );
  return timer;
}
