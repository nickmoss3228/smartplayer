// End-to-end verification of the payment loop against the dev database.
//
// Runs the real thing: a real HTTP listener, a real out-of-band callback from
// the fake acquirer, the real webhook route, the real settle path. Nothing is
// stubbed except the money.
//
// Refuses to run against any database whose name does not contain "dev".
//
// Run it with:  node --import tsx src/scripts/verifyPaymentLoop.mjs

import { randomUUID } from "node:crypto";

const PORT = 5099;

process.env.PAYMENTS_ENABLED = "true";
process.env.PAYMENTS_PROVIDER = "fake";
process.env.PAYMENTS_CALLBACK_SECRET = "verify-run-secret-0123456789abcdef0123456789abcdef";
process.env.PUBLIC_API_BASE = `http://localhost:${PORT}`;
process.env.FAKE_CALLBACK_DELAY_MS = "0";
process.env.PORT = String(PORT);

const B = "..";
const { eq, inArray, sql } = await import("drizzle-orm");
const { default: app } = await import(`${B}/app.js`);
const { closeDb, db, entitlements, fakePayments, payments, ping, schema, sessions, userDocs } =
  await import(`${B}/db/index.js`);
const fake = await import(`${B}/services/payments/fake.js`);
const { callbackUrlFor, signOrder } = await import(`${B}/helpers/callbackToken.js`);
const { signAccessToken } = await import(`${B}/helpers/sessionStore.js`);
const { reconcileOnce } = await import(`${B}/jobs/reconcilePayments.js`);
const { getProduct } = await import(`${B}/config/priceCatalog.js`);

// Every catalog SKU is perpetual, so each scenario buys its own SKU and
// counting that SKU's rows means something.
const SET_A = "set-leo";
const SET_B = "set-maya";
const SET_C = "set-daniel";
const STORY_A = "story-easy-leo-new-job";
const STORY_B = "story-easy-leo-doctor";
const STORY_C = "story-medium-maya-interview";
const STORY_D = "story-hard-daniel-courtroom";
const price = (sku) => getProduct(sku).amountMinor;

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

const { database: dbName } = await ping();
if (!dbName.includes("dev")) {
  console.error(`REFUSING TO RUN: database is "${dbName}", which is not a dev database.`);
  await closeDb();
  process.exit(1);
}
console.log(`\nconnected to ${dbName}`);

const server = app.listen(PORT);
await new Promise((r) => server.once("listening", r));
console.log(`listening on ${PORT}\n`);

let USER_ID = null;
const orders = [];

async function newOrder(sku, amountMinor, durationDays = null) {
  const payment = await payments.create({
    userId: USER_ID,
    provider: "fake",
    amountMinor,
    currency: "RUB",
    items: [{ sku, amountMinor, durationDays }],
  });
  const orderId = payment.id;
  orders.push(orderId);

  const made = await fake.createPayment({
    orderId,
    amountMinor,
    currency: "RUB",
    callbackUrl: callbackUrlFor("fake", orderId),
  });
  await payments.recordProviderCreate(orderId, {
    providerPaymentId: made.providerPaymentId,
    confirmationUrl: made.confirmationUrl ?? null,
    raw: null,
  });
  return { orderId, fakeId: made.providerPaymentId };
}

const rowsFor = async (sku) => (await entitlements.listFor(USER_ID)).filter((e) => e.sku === sku);

/** Ages a payment past the reconciler's threshold. */
const age = (orderId, ms) =>
  db()
    .update(schema.payment)
    .set({ createdAt: new Date(Date.now() - ms) })
    .where(eq(schema.payment.id, orderId));

const post = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const webhookUrl = (orderId, token = signOrder(orderId)) =>
  `http://localhost:${PORT}/api/payments/fake/webhook?order=${orderId}&t=${token}`;

try {
  const user = await userDocs.createUser({
    username: `verify-run-${Date.now()}`,
    password: "not-a-login-this-account-is-deleted-at-the-end",
  });
  USER_ID = user._id;

  // ── 0. The real HTTP entry point ─────────────────────────────────────────
  //
  // Every other step below creates its payment row directly, to keep the focus
  // on settlement. This one goes through the actual authenticated API — the
  // route the shop calls — so createOrder, priceBasket, the price-probe guard
  // and the URLs the controller builds are all covered by a real request.
  console.log("0. the shop, over HTTP");
  {
    const api = `http://localhost:${PORT}`;
    // A session-bound token: tokens without a jti stopped being accepted when
    // the legacy grace window closed (config/sessions.js).
    const jti = randomUUID();
    await sessions.attach({ userId: USER_ID, jti, deviceId: "verify-run", deviceLabel: "verify-run", ipPrefix: null });
    const token = signAccessToken(USER_ID, jti);
    const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const cfg = await (await fetch(`${api}/api/payments/config`)).json();
    check("the shop reports itself open", cfg.enabled === true, JSON.stringify(cfg.enabled));
    check("the client is told no real money moves", cfg.fake === true);
    check("the catalog is on sale", cfg.purchasableSkus.includes(SET_A) && cfg.purchasableSkus.includes(STORY_C));

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
    check("priced by the server, not the client", order.amountMinor === price(STORY_C), `${order.amountMinor}`);
    check(
      "and points at the acquirer's page",
      typeof order.confirmationUrl === "string" && order.confirmationUrl.includes("/checkout/fake"),
      order.confirmationUrl
    );
    orders.push(String(order.orderId));

    // The buyer follows confirmationUrl; the page reads ?fp= and asks about it.
    const fp = new URL(order.confirmationUrl).searchParams.get("fp");
    const shown = await (await fetch(`${api}/api/payments/fake/${fp}`)).json();
    check("the acquirer's page shows the right amount", shown.amountMinor === price(STORY_C));

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
    const { orderId, fakeId } = await newOrder(STORY_D, price(STORY_D));
    await fake.act(fakeId, { action: "pay", sim: { delayMs: 0 } });

    const rows = await waitFor(async () => {
      const r = await rowsFor(STORY_D);
      return r.length ? r : null;
    });
    const settled = await payments.findById(orderId);

    check("the callback arrives over HTTP and grants", Boolean(rows));
    check("the order is marked succeeded", settled.status === "succeeded", settled.status);
    check("paidAt was persisted (it used to be silently dropped)", Boolean(settled.paidAt));
    check("grantAppliedAt was stamped", Boolean(settled.grantAppliedAt));
    check("exactly one entitlement row", rows?.length === 1, `${rows?.length}`);
    check("the purchase never expires", rows?.[0]?.expiresAt === null, String(rows?.[0]?.expiresAt));
  }

  // ── 2. A duplicate delivery ──────────────────────────────────────────────
  console.log("\n2. duplicate delivery (the idempotency latch)");
  {
    const { orderId, fakeId } = await newOrder(SET_A, price(SET_A));
    await fake.act(fakeId, { action: "pay", sim: { delayMs: 0, deliver: "twice" } });

    await waitFor(async () => (await rowsFor(SET_A)).length || null);
    await sleep(1500); // let the second delivery land too

    const row = await fakePayments.findById(fakeId);
    check("the acquirer really delivered twice", row.deliveries.length >= 2, `${row.deliveries.length} attempts`);
    check("both deliveries answered 2xx", row.deliveries.every((d) => d.code === 200));
    check("a duplicate grants nothing extra", (await rowsFor(SET_A)).length === 1);
    check("the order settled once", (await payments.findById(orderId)).status === "succeeded");
  }

  // ── 3. A wrong amount ────────────────────────────────────────────────────
  console.log("\n3. an amount that disagrees with the order");
  {
    const { orderId, fakeId } = await newOrder(SET_B, price(SET_B));
    await fake.act(fakeId, { action: "pay", sim: { delayMs: 0, amount: "wrong" } });
    await sleep(1500);

    const row = await payments.findById(orderId);
    check("nothing is granted", (await rowsFor(SET_B)).length === 0);
    check("the order is not marked succeeded", row.status !== "succeeded", row.status);
    check("no grant latch was set", row.grantedAt === null);
  }

  // ── 4. Forged and misaddressed callbacks ─────────────────────────────────
  console.log("\n4. forgery");
  {
    const { orderId } = await newOrder(SET_C, price(SET_C));
    const body = { paymentId: "fake_forged", clientOrderId: orderId, status: "PAID", amount: price(SET_C) / 100, currency: "RUB" };
    const good = signOrder(orderId);
    const bad = `${good.slice(0, -1)}${good.endsWith("0") ? "1" : "0"}`;

    check("a tampered token is refused", (await post(webhookUrl(orderId, bad), body)).status === 403);
    check(
      "a missing token is refused",
      (await post(`http://localhost:${PORT}/api/payments/fake/webhook?order=${orderId}`, body)).status === 400
    );
    check(
      "a token from another order is refused",
      (await post(webhookUrl(orderId, signOrder(randomUUID())), body)).status === 403
    );
    check(
      "a webhook addressed to another driver 404s",
      (await post(`http://localhost:${PORT}/api/payments/vtb/webhook?order=${orderId}&t=${good}`, body)).status === 404
    );
    check("no forgery granted anything", (await rowsFor(SET_C)).length === 0);
  }

  // ── 5. A lost callback, and the reconciler ───────────────────────────────
  console.log("\n5. a callback that never arrives");
  {
    const { orderId, fakeId } = await newOrder(STORY_A, price(STORY_A));
    await fake.act(fakeId, { action: "pay", sim: { delayMs: 0, deliver: "never" } });
    await sleep(800);

    const stranded = await payments.findById(orderId);
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
    const { orderId, fakeId } = await newOrder(STORY_B, price(STORY_B));
    await fake.act(fakeId, { action: "decline", sim: { delayMs: 0 } });
    await sleep(1200);

    const afterDecline = await payments.findById(orderId);
    check("a decline is recorded as failed", afterDecline.status === "failed", afterDecline.status);
    check("a decline grants nothing", (await rowsFor(STORY_B)).length === 0);

    await post(webhookUrl(orderId), {
      paymentId: fakeId,
      clientOrderId: orderId,
      status: "PAID",
      amount: price(STORY_B) / 100,
      currency: "RUB",
      paidAt: new Date().toISOString(),
    });
    await sleep(500);

    check("FAILED -> PAID still grants", Boolean((await payments.findById(orderId)).grantedAt));
    check("and grants exactly once", (await rowsFor(STORY_B)).length === 1);
  }

  // ── 7. Boot recovery ─────────────────────────────────────────────────────
  console.log("\n7. an undelivered callback survives a restart");
  {
    const { orderId, fakeId } = await newOrder(SET_C, price(SET_C));
    // Decided, but with a delay long enough that "the process died" first.
    await fake.act(fakeId, { action: "pay", sim: { delayMs: 600000 } });
    check("nothing delivered yet", (await payments.findById(orderId)).grantedAt === null);

    const rescheduled = await fake.resumePendingDeliveries(); // what server.js does on boot
    check("boot recovery finds it", rescheduled >= 1, `${rescheduled} rescheduled`);
    check(
      "and the callback is delivered after all",
      Boolean(await waitFor(async () => (await payments.findById(orderId)).grantedAt))
    );
  }

  // ── 8. The repair sweep, run repeatedly over settled payments ────────────
  console.log("\n8. reconciling repeatedly grants nothing twice");
  {
    // The regression this guards: the repair sweep once re-granted a settled
    // payment on every run. Every order above is settled now; sweeping three
    // more times must leave each SKU with exactly the rows it already had.
    const before = {};
    for (const sku of [STORY_D, SET_A, STORY_A, STORY_B, SET_C]) before[sku] = (await rowsFor(sku)).length;

    for (let i = 0; i < 3; i += 1) await reconcileOnce();

    for (const [sku, count] of Object.entries(before)) {
      const after = (await rowsFor(sku)).length;
      check(`three sweeps leave ${sku} at ${count} row(s)`, after === count, `${after} rows`);
    }
  }
} finally {
  if (USER_ID) {
    // payment.user_id is ON DELETE RESTRICT — the ledger must go before the user.
    await db().execute(
      sql`DELETE FROM payment_item WHERE payment_id IN (SELECT id FROM payment WHERE user_id = ${USER_ID})`
    );
    await db().delete(schema.payment).where(eq(schema.payment.userId, USER_ID));
    await userDocs.deleteUser(USER_ID);
  }
  if (orders.length) {
    await db().delete(schema.fakePayment).where(inArray(schema.fakePayment.orderId, orders));
  }
  server.close();
  await closeDb();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${"=".repeat(62)}`);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nFAILURES:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
  }
  process.exit(failed.length ? 1 : 0);
}
