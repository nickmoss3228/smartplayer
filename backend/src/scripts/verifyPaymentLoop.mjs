// End-to-end verification of the payment loop against the dev database.
//
// Runs the real thing: a real HTTP listener, a real out-of-band callback from
// the fake acquirer, the real webhook route, the real settle path. Nothing is
// stubbed except the money.
//
// Refuses to run against any database whose name does not contain "dev".
//
// Run it with:  node src/scripts/verifyPaymentLoop.mjs

const PORT = 5099;

process.env.PAYMENTS_ENABLED = "true";
process.env.PAYMENTS_PROVIDER = "fake";
process.env.PAYMENTS_CALLBACK_SECRET = "verify-run-secret-0123456789abcdef0123456789abcdef";
process.env.PUBLIC_API_BASE = `http://localhost:${PORT}`;
process.env.FAKE_CALLBACK_DELAY_MS = "0";
process.env.PORT = String(PORT);

const B = "..";
const mongoose = (await import("mongoose")).default;
const { config } = await import(`${B}/config/env.js`);
const { default: app } = await import(`${B}/app.js`);
const { Payment } = await import(`${B}/models/Payment.js`);
const { FakePayment } = await import(`${B}/models/FakePayment.js`);
const { User } = await import(`${B}/models/User.js`);
const fake = await import(`${B}/services/payments/fake.js`);
const { callbackUrlFor, signOrder } = await import(`${B}/helpers/callbackToken.js`);
const { reconcileOnce } = await import(`${B}/jobs/reconcilePayments.js`);
const jwt = (await import("jsonwebtoken")).default;

// A dated SKU (extends on renewal) and perpetual ones (one row each), so that
// counting rows means something in every scenario.
const PASS = "all-access-90d";
const PACK_A = "pack-easy";
const PACK_B = "pack-medium";
const PACK_C = "pack-hard";
const STORY_A = "story-easy-leo-new-job";
const STORY_B = "story-easy-leo-doctor";
const STORY_C = "story-medium-maya-interview";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const waitFor = async (fn, ms = 8000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const value = await fn();
    if (value) return value;
    await sleep(150);
  }
  return null;
};

await mongoose.connect(config.mongoUri);
const dbName = mongoose.connection.name;
if (!dbName.includes("dev")) {
  console.error(`REFUSING TO RUN: database is "${dbName}", which is not a dev database.`);
  process.exit(1);
}
console.log(`\nconnected to ${dbName}`);

const server = app.listen(PORT);
await new Promise((r) => server.once("listening", r));
console.log(`listening on ${PORT}\n`);

const USER_ID = new mongoose.Types.ObjectId();
const orders = [];

async function newOrder(sku, amountMinor, durationDays = null) {
  const payment = await Payment.create({
    userId: USER_ID,
    provider: "fake",
    status: "pending",
    amountMinor,
    currency: "RUB",
    items: [{ sku, amountMinor, durationDays }],
  });
  orders.push(payment._id.toString());

  const orderId = payment._id.toString();
  const made = await fake.createPayment({
    orderId,
    amountMinor,
    currency: "RUB",
    callbackUrl: callbackUrlFor("fake", orderId),
  });
  payment.providerPaymentId = made.providerPaymentId;
  await payment.save();
  return { orderId, fakeId: made.providerPaymentId };
}

const rowsFor = async (sku) => {
  const user = await User.findById(USER_ID).select("entitlements").lean();
  return (user?.entitlements ?? []).filter((e) => e.sku === sku);
};

/** Ages a payment past the reconciler's threshold. Mongoose makes createdAt
 *  immutable under timestamps:true, so this has to go through the raw driver. */
const age = (orderId, ms) =>
  Payment.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(orderId) },
    { $set: { createdAt: new Date(Date.now() - ms) } }
  );

const post = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const webhookUrl = (orderId, token = signOrder(orderId)) =>
  `http://localhost:${PORT}/api/payments/fake/webhook?order=${orderId}&t=${token}`;

try {
  await User.collection.insertOne({ _id: USER_ID, username: "verify-run", entitlements: [] });

  // ── 0. The real HTTP entry point ─────────────────────────────────────────
  //
  // Every other step below creates its Payment row directly, to keep the focus
  // on settlement. This one goes through the actual authenticated API — the
  // route the shop calls — so createOrder, priceBasket, the price-probe guard
  // and the URLs the controller builds are all covered by a real request.
  console.log("0. the shop, over HTTP");
  {
    const api = `http://localhost:${PORT}`;
    const token = jwt.sign({ userId: USER_ID.toString() }, config.jwtSecret, { expiresIn: "1h" });
    const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const cfg = await (await fetch(`${api}/api/payments/config`)).json();
    check("the shop reports itself open", cfg.enabled === true, JSON.stringify(cfg.enabled));
    check("the client is told no real money moves", cfg.fake === true);
    check("the catalog is on sale", cfg.purchasableSkus.includes(PASS) && cfg.purchasableSkus.includes(STORY_C));

    // A body carrying a price is a probe, not a helpful client.
    const probe = await fetch(`${api}/api/payments/orders`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ skus: [STORY_C], amountMinor: 1 }),
    });
    check("a client-supplied price is refused", probe.status === 400, `HTTP ${probe.status}`);
    check("...with the documented code", (await probe.json()).code === "PRICE_NOT_ACCEPTED");

    const res = await fetch(`${api}/api/payments/orders`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ skus: [STORY_C] }),
    });
    const order = await res.json();
    check("an order is created", res.status === 200, `HTTP ${res.status}`);
    check("priced by the server, not the client", order.amountMinor === 24900, `${order.amountMinor}`);
    check(
      "and points at the acquirer's page",
      typeof order.confirmationUrl === "string" && order.confirmationUrl.includes("/checkout/fake"),
      order.confirmationUrl
    );
    orders.push(String(order.orderId));

    // The buyer follows confirmationUrl; the page reads ?fp= and asks about it.
    const fp = new URL(order.confirmationUrl).searchParams.get("fp");
    const shown = await (await fetch(`${api}/api/payments/fake/${fp}`)).json();
    check("the acquirer's page shows the right amount", shown.amountMinor === 24900);

    // Press Pay. Returns immediately; the callback follows out of band.
    const acted = await fetch(`${api}/api/payments/fake/${fp}/act`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", sim: { delayMs: 0 } }),
    });
    check("the buyer can pay", acted.status === 200, `HTTP ${acted.status}`);

    // What CheckoutReturn.tsx does.
    const granted = await waitFor(async () => {
      const row = await (await fetch(`${api}/api/payments/orders/${order.orderId}`, { headers: auth })).json();
      return row.granted ? row : null;
    });
    check("the return page's poll sees it granted", Boolean(granted));
    check("the diagnostic fields are present outside production", Boolean(granted?.providerPaymentId));

    // Buys its own story SKU, so nothing has to be cleaned up between steps —
    // an earlier version wiped entitlements here and raced with its own
    // in-flight grant, which is precisely the bug this step now guards against.
  }

  // ── 1. The happy path, out of band ───────────────────────────────────────
  console.log("1. pay -> callback -> grant");
  {
    const { orderId, fakeId } = await newOrder(PASS, 129000, 90);
    await fake.act(fakeId, { action: "pay", sim: { delayMs: 0 } });

    const rows = await waitFor(async () => {
      const r = await rowsFor(PASS);
      return r.length ? r : null;
    });
    const settled = await Payment.findById(orderId);

    check("the callback arrives over HTTP and grants", Boolean(rows));
    check("the order is marked succeeded", settled.status === "succeeded", settled.status);
    check("paidAt was persisted (it used to be silently dropped)", Boolean(settled.paidAt));
    check("grantAppliedAt was stamped", Boolean(settled.grantAppliedAt));
    check("exactly one entitlement row", rows?.length === 1, `${rows?.length}`);

    const days = Math.round((+new Date(rows[0].expiresAt) - Date.now()) / 86400000);
    check("the pass expires ~90 days out", days === 90, `${days} days`);
  }

  // ── 2. A duplicate delivery ──────────────────────────────────────────────
  console.log("\n2. duplicate delivery (the idempotency latch)");
  {
    const { orderId, fakeId } = await newOrder(PACK_A, 69000);
    await fake.act(fakeId, { action: "pay", sim: { delayMs: 0, deliver: "twice" } });

    await waitFor(async () => (await rowsFor(PACK_A)).length || null);
    await sleep(1500); // let the second delivery land too

    const row = await FakePayment.findById(fakeId);
    check("the acquirer really delivered twice", row.deliveries.length >= 2, `${row.deliveries.length} attempts`);
    check("both deliveries answered 2xx", row.deliveries.every((d) => d.code === 200));
    check("a duplicate grants nothing extra", (await rowsFor(PACK_A)).length === 1);
    check("the order settled once", (await Payment.findById(orderId)).status === "succeeded");
  }

  // ── 3. A wrong amount ────────────────────────────────────────────────────
  console.log("\n3. an amount that disagrees with the order");
  {
    const { orderId, fakeId } = await newOrder(PACK_B, 69000);
    await fake.act(fakeId, { action: "pay", sim: { delayMs: 0, amount: "wrong" } });
    await sleep(1500);

    const row = await Payment.findById(orderId);
    check("nothing is granted", (await rowsFor(PACK_B)).length === 0);
    check("the order is not marked succeeded", row.status !== "succeeded", row.status);
    check("no grant latch was set", row.grantedAt === null);
  }

  // ── 4. Forged and misaddressed callbacks ─────────────────────────────────
  console.log("\n4. forgery");
  {
    const { orderId } = await newOrder(PACK_C, 69000);
    const body = { paymentId: "fake_forged", clientOrderId: orderId, status: "PAID", amount: 690, currency: "RUB" };
    const good = signOrder(orderId);
    const bad = `${good.slice(0, -1)}${good.endsWith("0") ? "1" : "0"}`;

    check("a tampered token is refused", (await post(webhookUrl(orderId, bad), body)).status === 403);
    check(
      "a missing token is refused",
      (await post(`http://localhost:${PORT}/api/payments/fake/webhook?order=${orderId}`, body)).status === 400
    );
    check(
      "a token from another order is refused",
      (await post(webhookUrl(orderId, signOrder("64b7f1c2e4a1d2f3a4b5c6d8")), body)).status === 403
    );
    check(
      "a webhook addressed to another driver 404s",
      (await post(`http://localhost:${PORT}/api/payments/vtb/webhook?order=${orderId}&t=${good}`, body)).status === 404
    );
    check("no forgery granted anything", (await rowsFor(PACK_C)).length === 0);
  }

  // ── 5. A lost callback, and the reconciler ───────────────────────────────
  console.log("\n5. a callback that never arrives");
  {
    const { orderId, fakeId } = await newOrder(STORY_A, 24900);
    await fake.act(fakeId, { action: "pay", sim: { delayMs: 0, deliver: "never" } });
    await sleep(800);

    const stranded = await Payment.findById(orderId);
    check("the payment is stranded, as designed", stranded.grantedAt === null && stranded.status === "pending");
    check("no entitlement yet", (await rowsFor(STORY_A)).length === 0);

    // Sweep 1 only chases payments older than 15 minutes.
    await age(orderId, 20 * 60 * 1000);
    const stats = await reconcileOnce();
    check("the reconciler settles it without any callback", stats.settled >= 1, JSON.stringify(stats));
    check("the entitlement lands", (await rowsFor(STORY_A)).length === 1);
  }

  // ── 6. Declined, then paid ───────────────────────────────────────────────
  console.log("\n6. declined, then paid on a second attempt");
  {
    const { orderId, fakeId } = await newOrder(STORY_B, 24900);
    await fake.act(fakeId, { action: "decline", sim: { delayMs: 0 } });
    await sleep(1200);

    const afterDecline = await Payment.findById(orderId);
    check("a decline is recorded as failed", afterDecline.status === "failed", afterDecline.status);
    check("a decline grants nothing", (await rowsFor(STORY_B)).length === 0);

    await post(webhookUrl(orderId), {
      paymentId: fakeId,
      clientOrderId: orderId,
      status: "PAID",
      amount: 249,
      currency: "RUB",
      paidAt: new Date().toISOString(),
    });
    await sleep(500);

    check("FAILED -> PAID still grants", Boolean((await Payment.findById(orderId)).grantedAt));
    check("and grants exactly once", (await rowsFor(STORY_B)).length === 1);
  }

  // ── 7. Boot recovery ─────────────────────────────────────────────────────
  console.log("\n7. an undelivered callback survives a restart");
  {
    const { orderId, fakeId } = await newOrder(PACK_C, 69000);
    // Decided, but with a delay long enough that "the process died" first.
    await fake.act(fakeId, { action: "pay", sim: { delayMs: 600000 } });
    check("nothing delivered yet", (await Payment.findById(orderId)).grantedAt === null);

    const rescheduled = await fake.resumePendingDeliveries(); // what server.js does on boot
    check("boot recovery finds it", rescheduled >= 1, `${rescheduled} rescheduled`);
    check(
      "and the callback is delivered after all",
      Boolean(await waitFor(async () => (await Payment.findById(orderId)).grantedAt))
    );
  }

  // ── 8. Renewal, and the repair sweep that used to run away ───────────────
  console.log("\n8. renewing a dated pass, then reconciling repeatedly");
  {
    // The pass from step 1 is still active. Renewing must EXTEND it, and — the
    // regression this guards — the repair sweep must not then treat the older,
    // superseded payment as unapplied and grant it again on every pass.
    const before = (await rowsFor(PASS))[0];
    const { fakeId } = await newOrder(PASS, 129000, 90);
    await fake.act(fakeId, { action: "pay", sim: { delayMs: 0 } });

    await waitFor(async () => {
      const row = (await rowsFor(PASS))[0];
      return +new Date(row.expiresAt) > +new Date(before.expiresAt) ? row : null;
    });

    const renewed = (await rowsFor(PASS))[0];
    const addedDays = Math.round((+new Date(renewed.expiresAt) - +new Date(before.expiresAt)) / 86400000);
    check("renewing extends rather than resets", addedDays === 90, `+${addedDays} days`);
    check("still one pass row", (await rowsFor(PASS)).length === 1);

    for (let i = 0; i < 3; i += 1) await reconcileOnce();

    const afterSweeps = (await rowsFor(PASS))[0];
    const drift = Math.round((+new Date(afterSweeps.expiresAt) - +new Date(renewed.expiresAt)) / 86400000);
    check(
      "three reconciler sweeps add no free time",
      drift === 0,
      drift ? `expiry moved ${drift} days` : "expiry unchanged"
    );
  }
} finally {
  await Payment.deleteMany({ userId: USER_ID });
  await FakePayment.deleteMany({ orderId: { $in: orders } });
  await User.deleteOne({ _id: USER_ID });
  server.close();
  await mongoose.disconnect();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${"=".repeat(62)}`);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nFAILURES:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
  }
  process.exit(failed.length ? 1 : 0);
}
