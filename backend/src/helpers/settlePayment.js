// helpers/settlePayment.js
//
// Turns a confirmed payment into entitlements, exactly once.
//
// Both the webhook and the reconciliation job call THIS function. That is the
// point of it: they are two paths to the same outcome, and any difference
// between them is a bug that only shows up when a webhook is lost — which is
// precisely when nobody is watching.
//
// The idempotency discipline: the guard is part of the write, not a
// read-then-write check. A provider will deliver the same event twice and will
// retry until it gets a 2xx, so "have we already granted this?" asked as a
// separate query is a race with a payout on the losing side.
//
// What Postgres changed: the latch, the entitlement writes and the
// grant-applied stamp now commit TOGETHER. The Mongo version latched first and
// granted second, so a process dying between the two left a paid order with
// nothing granted and needed a repair sweep; here that state cannot be written.

import {
  db,
  entitlements as entitlementsRepo,
  payments as paymentsRepo,
  userDocs,
} from "../db/index.js";
import { BUILT_IN_CATALOG } from "../config/priceCatalog.js";
import { getCatalog } from "./catalogStore.js";

/**
 * Builds the entitlement rows one payment grants.
 *
 * Split out and pure so the interesting part — dated SKUs extending rather
 * than stacking — is testable without a database.
 */
export function rowsFor(
  payment,
  existingEntitlements = [],
  now = Date.now(),
  catalog = BUILT_IN_CATALOG,
) {
  const perpetual = [];
  const extensions = [];

  for (const item of payment.items ?? []) {
    const product = catalog.getProduct(item.sku);
    if (!product) continue; // catalog changed under an old order — grant nothing

    const days = item.durationDays ?? product.durationDays ?? null;

    if (days === null || days === undefined) {
      perpetual.push({
        sku: item.sku,
        grantedAt: new Date(now),
        expiresAt: null,
        source: "purchase",
        paymentId: payment._id,
      });
      continue;
    }

    // Dated: extend from whichever is later, now or the current expiry.
    // Renewing a pass that still has a month left must ADD to it, not reset
    // it — a customer who renews early is otherwise punished for it.
    const existing = existingEntitlements.find((row) => row.sku === item.sku);
    const from =
      existing?.expiresAt && +new Date(existing.expiresAt) > now
        ? +new Date(existing.expiresAt)
        : now;

    extensions.push({
      sku: item.sku,
      expiresAt: new Date(from + days * 24 * 60 * 60 * 1000),
      hadRow: Boolean(existing),
      paymentId: payment._id,
    });
  }

  return { perpetual, extensions };
}

/**
 * WHY THIS TAKES TWO KINDS OF ID.
 *
 * createOrder writes the payment row FIRST, then calls the acquirer. If that
 * call times out after the acquirer has already created the payment on their
 * side, we never learn their id — but their callback still arrives, carrying
 * OUR order id, because that is the one identifier both sides agreed on before
 * anything could go wrong.
 *
 * Looking up only by providerPaymentId strands exactly those payments, and they
 * are payments a customer has actually made. So the webhook settles by orderId,
 * the reconciler settles by providerPaymentId, and both arrive here.
 */
async function findPayment(lookup) {
  if (typeof lookup === "string") {
    return paymentsRepo.findByProviderId(lookup);
  }
  if (lookup?.orderId) {
    // A junk id is "unknown", not a 500 — a forged callback will happily
    // supply one.
    return paymentsRepo.findByIdSafe(lookup.orderId);
  }
  if (lookup?.providerPaymentId) {
    return paymentsRepo.findByProviderId(lookup.providerPaymentId);
  }
  return null;
}

/**
 * @param {string|{orderId?: string, providerPaymentId?: string}} lookup
 *   Which payment this is about. A bare string means providerPaymentId.
 * @param {{status: string, amountMinor: number, providerPaymentId?: string,
 *          paidAt?: Date, raw?: object}} confirmed
 *   The outcome, already translated into the contract's vocabulary by the
 *   driver. Never a raw webhook body: by the time it reaches this function,
 *   something has authenticated it.
 * @returns {Promise<{outcome: string, payment?: object}>}
 *   outcome: "granted" | "replay" | "unknown" | "pending" | "canceled"
 *          | "failed" | "amount_mismatch"
 */
export async function settlePayment(lookup, confirmed) {
  const known = await findPayment(lookup);
  if (!known) {
    // Not ours. Answer 200 anyway — retrying will never make it ours, and an
    // acquirer that keeps retrying for 24h is noise in the logs, not a fix.
    return { outcome: "unknown" };
  }

  if (confirmed.status === "canceled") {
    await paymentsRepo.markCanceled(known.id, confirmed.raw ?? null);
    return { outcome: "canceled", payment: known };
  }

  if (confirmed.status === "failed") {
    // Recorded, but NOT terminal. A declined card followed by a good one is an
    // ordinary purchase, and an acquirer is entitled to send "paid" for this
    // same payment afterwards — see markFailedWhilePending.
    await paymentsRepo.markFailedWhilePending(known.id, confirmed.raw ?? null);
    return { outcome: "failed", payment: known };
  }

  if (confirmed.status !== "succeeded") {
    return { outcome: "pending", payment: known };
  }

  // Refuse to grant when the acquirer's amount disagrees with the order we
  // priced. Either the catalog moved under a live order or someone is playing
  // games; both want a human, and neither wants an entitlement. A missing
  // amount fails this too, deliberately — "I could not tell" is not "it matched".
  if (Number(confirmed.amountMinor) !== Number(known.amountMinor)) {
    console.error(
      `[payments] amount mismatch on ${known.id}: ` +
        `acquirer says ${confirmed.amountMinor}, order says ${known.amountMinor}. NOT granting.`
    );
    await paymentsRepo.markFailed(known.id, confirmed.raw ?? null);
    return { outcome: "amount_mismatch", payment: known };
  }

  // THE LATCH, THE GRANT AND THE STAMP — one transaction.
  //
  // The latch is conditional on granted_at still being null, so of two
  // concurrent deliveries exactly one proceeds; the other's UPDATE waits on the
  // row lock and then matches nothing. Everything after it in this transaction
  // runs at most once per payment, and commits or rolls back with the latch.
  const payment = await db().transaction(async (tx) => {
    const latched = await paymentsRepo.latch(
      known.id,
      {
        paidAt: confirmed.paidAt ?? new Date(),
        raw: confirmed.raw ?? null,
        // Backfill the acquirer's id when the create call never got to tell us
        // — the timed-out-create case in findPayment's comment.
        providerPaymentId:
          !known.providerPaymentId && confirmed.providerPaymentId ? confirmed.providerPaymentId : null,
      },
      new Date(),
      tx,
    );
    if (!latched) return null;

    const settled = { ...latched, items: known.items };
    await grantFor(settled, tx);
    await paymentsRepo.stampGrantApplied(latched.id, tx);
    return settled;
  });

  if (!payment) {
    // Already settled by the other delivery, or by the reconciler.
    return { outcome: "replay", payment: known };
  }

  return { outcome: "granted", payment };
}

/**
 * Applies a settled payment's entitlements.
 *
 * Takes the user's row lock first, then computes and writes. The lock is what
 * makes rowsFor's "extend from the current expiry" safe: two payments for the
 * same dated SKU settling at once would otherwise both read the same expiry and
 * one extension would be lost.
 *
 * @param {object} payment a payment row with its `items`
 * @param {object} [tx] the settlement transaction; one is opened if absent
 */
export async function grantFor(payment, tx) {
  const run = async (t) => {
    const user = await userDocs.loadUser(payment.userId, { lock: true }, t);
    if (!user) {
      console.error(`[payments] ${payment.id} settled for a user that no longer exists.`);
      return;
    }

    const { perpetual, extensions } = rowsFor(
      { ...payment, _id: payment.id },
      user.entitlements ?? [],
      Date.now(),
      await getCatalog(),
    );

    // Idempotent by the (user, sku) unique constraint: a second attempt updates
    // the same row rather than appending another.
    for (const row of perpetual) {
      await entitlementsRepo.grantPerpetual(payment.userId, row.sku, row.paymentId, "purchase", t);
    }
    for (const ext of extensions) {
      await entitlementsRepo.grantUntil(payment.userId, ext.sku, ext.expiresAt, ext.paymentId, "purchase", t);
    }

    console.log(
      `[payments] granted ${payment.items.map((i) => i.sku).join(", ")} ` +
        `to ${payment.userId} for ${payment.amountMinor} ${payment.currency} (${payment.id})`
    );
  };

  return tx ? run(tx) : db().transaction(run);
}
