// helpers/settlePayment.js
//
// Turns a confirmed payment into entitlements, exactly once.
//
// Both the webhook and the reconciliation job call THIS function. That is the
// point of it: they are two paths to the same outcome, and any difference
// between them is a bug that only shows up when a webhook is lost — which is
// precisely when nobody is watching.
//
// The idempotency discipline is the one from helpers/spendCurrency.js: the
// guard is part of the write, not a read-then-write check. A provider will
// deliver the same event twice and will retry until it gets a 2xx, so "have we
// already granted this?" asked as a separate query is a race with a payout on
// the losing side.

import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
import { getProduct } from "../config/priceCatalog.js";

/**
 * Builds the entitlement rows one payment grants.
 *
 * Split out and pure so the interesting part — dated SKUs extending rather
 * than stacking — is testable without a database.
 */
export function rowsFor(payment, existingEntitlements = [], now = Date.now()) {
  const perpetual = [];
  const extensions = [];

  for (const item of payment.items ?? []) {
    const product = getProduct(item.sku);
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
 * createOrder writes the Payment row FIRST, then calls the acquirer. If that
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
    return Payment.findOne({ providerPaymentId: lookup });
  }
  if (lookup?.orderId) {
    // A junk id is a 404, not a 500: findById throws CastError on anything that
    // is not a valid ObjectId, and a forged callback will happily supply one.
    return Payment.findById(lookup.orderId).catch(() => null);
  }
  if (lookup?.providerPaymentId) {
    return Payment.findOne({ providerPaymentId: lookup.providerPaymentId });
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
    await Payment.updateOne(
      { _id: known._id, status: "pending" },
      { $set: { status: "canceled", raw: confirmed.raw ?? null } }
    );
    return { outcome: "canceled", payment: known };
  }

  if (confirmed.status === "failed") {
    // Recorded, but NOT terminal. A declined card followed by a good one is an
    // ordinary purchase, and an acquirer is entitled to send "paid" for this
    // same payment afterwards. The latch below keys on grantedAt rather than on
    // status, so that later success still grants — which is why this write is
    // guarded on grantedAt too, and why nothing here closes the payment off.
    await Payment.updateOne(
      { _id: known._id, grantedAt: null, status: "pending" },
      { $set: { status: "failed", raw: confirmed.raw ?? null } }
    );
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
      `[payments] amount mismatch on ${known._id}: ` +
        `acquirer says ${confirmed.amountMinor}, order says ${known.amountMinor}. NOT granting.`
    );
    await Payment.updateOne(
      { _id: known._id, grantedAt: null },
      { $set: { status: "failed", raw: confirmed.raw ?? null } }
    );
    return { outcome: "amount_mismatch", payment: known };
  }

  const patch = {
    status: "succeeded",
    grantedAt: new Date(),
    paidAt: confirmed.paidAt ?? new Date(),
    raw: confirmed.raw ?? null,
  };

  // Backfill the acquirer's id when the create call never got to tell us — the
  // timed-out-create case in findPayment's comment. Inside the latch, so it
  // happens exactly once under the same guard as everything else.
  if (!known.providerPaymentId && confirmed.providerPaymentId) {
    patch.providerPaymentId = confirmed.providerPaymentId;
  }

  // THE LATCH. Conditional on grantedAt still being null, so of two concurrent
  // deliveries exactly one proceeds past this line. Everything after it runs at
  // most once per payment.
  const payment = await Payment.findOneAndUpdate(
    { _id: known._id, grantedAt: null },
    { $set: patch },
    { new: true }
  );

  if (!payment) {
    // Already settled by the other delivery, or by the reconciler.
    return { outcome: "replay", payment: known };
  }

  await grantFor(payment);

  // Only now, after the rows are actually on the user. The reconciler's repair
  // sweep keys on this, so it must not be set before grantFor returns.
  await Payment.updateOne({ _id: payment._id }, { $set: { grantAppliedAt: new Date() } });

  return { outcome: "granted", payment };
}

/**
 * Applies a settled payment's entitlements.
 *
 * Separate from the latch so the reconciler can repair the crash-in-between
 * case: a payment marked succeeded whose rows never landed. Safe to call
 * twice — the perpetual push is guarded on paymentId, and the dated extension
 * is computed from the row that is actually there.
 */
export async function grantFor(payment) {
  const user = await User.findById(payment.userId).select("entitlements");
  if (!user) {
    console.error(`[payments] ${payment._id} settled for a user that no longer exists.`);
    return;
  }

  const { perpetual, extensions } = rowsFor(payment, user.entitlements ?? []);

  if (perpetual.length) {
    // The $ne guard makes the push itself idempotent: a second attempt matches
    // no document rather than appending a duplicate row.
    await User.updateOne(
      { _id: payment.userId, "entitlements.paymentId": { $ne: payment._id } },
      { $push: { entitlements: { $each: perpetual } } }
    );
  }

  for (const ext of extensions) {
    if (ext.hadRow) {
      await User.updateOne(
        { _id: payment.userId, "entitlements.sku": ext.sku },
        {
          $set: {
            "entitlements.$.expiresAt": ext.expiresAt,
            "entitlements.$.paymentId": ext.paymentId,
            "entitlements.$.source": "purchase",
          },
        }
      );
    } else {
      await User.updateOne(
        { _id: payment.userId, "entitlements.sku": { $ne: ext.sku } },
        {
          $push: {
            entitlements: {
              sku: ext.sku,
              grantedAt: new Date(),
              expiresAt: ext.expiresAt,
              source: "purchase",
              paymentId: ext.paymentId,
            },
          },
        }
      );
    }
  }

  console.log(
    `[payments] granted ${payment.items.map((i) => i.sku).join(", ")} ` +
      `to ${payment.userId} for ${payment.amountMinor} ${payment.currency} (${payment._id})`
  );
}
