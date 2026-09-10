// services/payments/driverContract.test.js
//
// Runs the contract suite against the fake driver, twice.
//
// The second run is against a copy with the optional methods removed, which is
// how the feature-detection path gets exercised. Without it, every local run
// would go down the "this driver has getPayment" branch and the other branch —
// the one a real acquirer with no status endpoint takes — would first execute in
// production, on a payment, with money attached.
//
// Everything is imported dynamically because config/env.js reads process.env at
// module scope, and static imports hoist above any assignment in this file. The
// signing secret has to be in place before the first import, or verifyOrder
// throws while refusing to sign with a fallback (which is the correct behaviour;
// it just has to be arranged for).

process.env.PAYMENTS_CALLBACK_SECRET =
  "contract-suite-secret-0123456789abcdef0123456789abcdef";

const { runDriverContract } = await import("./driverContract.js");
const { signOrder } = await import("../../helpers/callbackToken.js");
const fake = await import("./fake.js");

/**
 * Kopecks to rubles, written out independently of the driver.
 *
 * Building the test's input with the driver's own toRubles() would make the
 * round-trip test self-confirming: a symmetric bug in the conversion would
 * cancel itself out and pass. These are the values a human would write down.
 */
const RUBLES = {
  129000: 1290,
  69000: 690,
  24900: 249,
  1050: 10.5,
  53209: 532.09,
};

const harness = {
  makeCallback: ({ orderId, amountMinor, currency, status }) => ({
    rawBody: Buffer.from(
      JSON.stringify({
        paymentId: `fake_${orderId}`,
        clientOrderId: orderId,
        status,
        amount: RUBLES[amountMinor] ?? Number((amountMinor / 100).toFixed(2)),
        currency,
        paidAt: "2026-09-10T09:00:00.000Z",
      })
    ),
    query: { order: orderId, t: signOrder(orderId) },
    headers: { "content-type": "application/json" },
  }),

  // This driver authenticates with a token in the callback URL, so that is what
  // gets corrupted. An acquirer that signs a header would corrupt the header.
  tamper: (callback) => ({
    ...callback,
    query: { ...callback.query, t: `${callback.query.t.slice(0, -1)}0` },
  }),

  // A different, well-formed order id the notification was not issued for.
  foreignOrderId: "64b7f1c2e4a1d2f3a4b5c6d8",
};

runDriverContract(fake, { ...harness, label: "fake" });

// The same driver as an acquirer with no status endpoint and no refund API —
// which is not a hypothetical shape, it is what several real ones look like.
const stripped = { ...fake };
delete stripped.getPayment;
delete stripped.refund;

runDriverContract(stripped, { ...harness, label: "fake (optional methods stripped)" });
