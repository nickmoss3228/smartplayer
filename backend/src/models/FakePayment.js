// models/FakePayment.js
//
// The fake acquirer's OWN database. Not part of our ledger.
//
// This separation is the thing being proven. A real acquirer keeps its own
// records on its own machines and tells us about them over HTTP; if the fake
// reached into models/Payment.js instead, it would be a shortcut through the
// exact boundary the driver abstraction exists to test, and every bug that
// boundary is supposed to catch would go unnoticed until a real gateway arrived.
//
// It is in Mongo rather than an in-process Map (which is what this replaced) so
// that a restart does not forget every payment in flight. That matters more than
// it sounds: a pending payment surviving a restart is what makes the
// reconciliation job testable at all, and "the server rebooted mid-checkout" is
// an ordinary Tuesday in production.

import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    attempt: { type: Number, required: true },
    // HTTP status we got back, or null if the request never completed.
    code: { type: Number, default: null },
    error: { type: String, default: null },
  },
  { _id: false }
);

const simSchema = new mongoose.Schema(
  {
    /** How long the acquirer "takes" before calling back. */
    delayMs: { type: Number, default: 2000 },
    /**
     * once  — one delivery, the normal case
     * twice — the same notification sent twice, ~200ms apart
     * never — no delivery at all, so the reconciler has to find it
     */
    deliver: { type: String, enum: ["once", "twice", "never"], default: "once" },
    /** "wrong" reports an amount that disagrees with the order. */
    amount: { type: String, enum: ["correct", "wrong"], default: "correct" },
  },
  { _id: false }
);

const fakePaymentSchema = new mongoose.Schema(
  {
    // "fake_<uuid>", assigned by the driver — the acquirer's id for the payment,
    // which is what a real one would hand us as providerPaymentId.
    _id: { type: String },

    // Our order id, as passed in clientOrderId would be. The fake stores it
    // because a real acquirer echoes it back in the callback.
    orderId: { type: String, required: true, index: true },

    amountMinor: { type: Number, required: true },
    currency: { type: String, required: true, default: "RUB" },

    // The fake speaks its OWN dialect on purpose: uppercase, and "PAID" rather
    // than our internal "succeeded". Real RU gateways do exactly this, and it
    // means the driver's translation layer is exercised on every local run
    // instead of lying dormant until an acquirer with different words arrives.
    status: {
      type: String,
      enum: ["NEW", "PENDING", "PAID", "FAILED", "CANCELED"],
      default: "PENDING",
      required: true,
    },

    // Where to call back to. Captured at create time, exactly as an acquirer
    // would store it — so a later change to PUBLIC_API_BASE cannot retarget the
    // callbacks of payments already in flight.
    callbackUrl: { type: String, required: true },

    sim: { type: simSchema, default: () => ({}) },

    // Every delivery attempt, so the fake checkout page can show what it did and
    // the retry behaviour is inspectable rather than a claim in a comment.
    deliveries: { type: [deliverySchema], default: [] },
    delivered: { type: Boolean, default: false },

    paidAt: { type: Date, default: null },
  },
  { timestamps: true, _id: false }
);

// Boot recovery's query: decided, but never successfully delivered.
fakePaymentSchema.index({ delivered: 1, status: 1 });

export const FakePayment = mongoose.model("FakePayment", fakePaymentSchema);
