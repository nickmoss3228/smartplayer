// models/Payment.js
//
// The financial ledger. One row per attempt to take money, whatever happens to
// it afterwards — this is what support reads when someone says "I paid and got
// nothing", and it is the reconciliation job's work queue.
//
// Entitlements live on the User document (models/User.js) because they are read
// on every authenticated request. Payments live here because they are read
// almost never and must be kept forever, which is the opposite trade.

import mongoose from "mongoose";

const paymentItemSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    // PRICED SNAPSHOT, taken from config/priceCatalog.js at order time and
    // never recomputed. A later price change must not rewrite what somebody
    // actually paid, and support needs the historical number to answer a
    // dispute. This is also why the webhook compares against payment
    // .amountMinor rather than re-pricing the basket.
    amountMinor: { type: Number, required: true },
    durationDays: { type: Number, default: null },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    provider: { type: String, required: true, default: "fake" },
    // The provider's id for this payment. Unique AND sparse: unique is the
    // last line of defence against a double grant if two webhook deliveries
    // race; sparse because the row is created BEFORE the provider is called,
    // so it is briefly null and several nulls must be allowed to coexist.
    providerPaymentId: { type: String, default: null },
    // What we sent as the provider's idempotence key. Deterministic (the
    // payment's own _id), so a retried create cannot produce two payments on
    // their side.
    idempotenceKey: { type: String, default: null },

    status: {
      type: String,
      enum: ["pending", "succeeded", "canceled", "failed", "refunded"],
      default: "pending",
      required: true,
    },

    amountMinor: { type: Number, required: true },
    currency: { type: String, required: true, default: "RUB" },
    items: { type: [paymentItemSchema], default: [] },

    confirmationUrl: { type: String, default: null },
    cancellationReason: { type: String, default: null },

    // When the acquirer says the money moved. Distinct from grantedAt, which
    // is when WE acted on that: the gap between them is the webhook latency,
    // and a support question about a slow unlock is answered by comparing the
    // two. settlePayment() has always written this field; until now it was not
    // on the schema, so Mongoose silently dropped it on every settlement.
    paidAt: { type: Date, default: null },

    // Set exactly once, by the conditional write in helpers/settlePayment.js.
    // This field IS the idempotency latch — not a timestamp for display.
    grantedAt: { type: Date, default: null },

    // Set once the entitlement rows have actually landed, which is NOT the same
    // moment as grantedAt: the latch flips first, the rows are written second,
    // and a process that dies between the two leaves a paid order with nothing
    // granted. The reconciler's repair sweep looks for exactly that gap.
    //
    // It is a field rather than an inference for a reason. The obvious check —
    // "does the user hold an entitlement tagged with this payment's id?" —
    // breaks on dated SKUs: renewing a pass EXTENDS the existing row and
    // overwrites its paymentId, so the older payment stops being visible there.
    // The repair sweep would then re-grant it every five minutes, adding 90 days
    // each time, forever.
    grantAppliedAt: { type: Date, default: null },

    // Last payload the provider gave us, for arguing with them later.
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// A replayed webhook must collide here rather than grant twice. Partial rather
// than sparse so the constraint only covers rows that actually have an id.
paymentSchema.index(
  { providerPaymentId: 1 },
  { unique: true, partialFilterExpression: { providerPaymentId: { $type: "string" } } }
);

// The reconciliation job's query: pending, and old enough that the webhook
// should already have arrived.
paymentSchema.index({ status: 1, createdAt: 1 });

// "Show me this user's orders", for the account page and for support.
paymentSchema.index({ userId: 1, createdAt: -1 });

export const Payment = mongoose.model("Payment", paymentSchema);
