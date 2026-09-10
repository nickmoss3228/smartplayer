// controllers/payment.controller.js
//
// Taking money. The single rule everything here follows: the client sends SKU
// ids and nothing else. Prices, durations and what a SKU grants are all looked
// up server-side from config/priceCatalog.js.
//
// NOTHING IN THIS FILE KNOWS WHICH ACQUIRER IS SELECTED. That is the whole point
// of services/payments/index.js. This controller builds an order, hands the
// driver a callback URL, and later hands the driver some bytes to make sense of.
// Adding an acquirer must not require an edit here — if it does, the contract in
// services/payments/index.js is wrong and that is what needs fixing.

import { Payment } from "../models/Payment.js";
import { config } from "../config/env.js";
import {
  getProvider,
  CallbackRejected,
  CallbackUnparseable,
} from "../services/payments/index.js";
import { settlePayment } from "../helpers/settlePayment.js";
import { priceBasket, BasketError, isPurchasable } from "../config/basketPricing.js";
import { PRODUCTS, CURRENCY } from "../config/priceCatalog.js";
import { callbackUrlFor } from "../helpers/callbackToken.js";

const STATUS_FOR = {
  EMPTY_BASKET: 400,
  BASKET_TOO_LARGE: 400,
  INVALID_SKU: 400,
  UNKNOWN_SKU: 400,
  NOT_PURCHASABLE: 400,
  ALREADY_OWNED: 409,
};

/** Non-production only. Gates every field that would be an information leak in prod. */
const isDev = () => config.nodeEnv !== "production";

// GET /api/payments/config
// Runtime flag, deliberately NOT a Vite build arg: the frontend image is built
// by CI, so a build-time flag would need a rebuild and redeploy to flip. The
// shop renders instantly from its bundled catalog and consults this only to
// decide whether checkout is live.
export function getPaymentConfig(req, res) {
  // getProvider() throws when PAYMENTS_PROVIDER names a driver that does not
  // exist. This endpoint is public and hit on page load, so a misconfiguration
  // must degrade to "the shop is closed" rather than 500 for every visitor.
  let driver = null;
  try {
    driver = getProvider();
  } catch (error) {
    console.error("[payments] config requested with a broken driver:", error.message);
  }

  const body = {
    enabled: config.payments.enabled && Boolean(driver),
    currency: CURRENCY,
    // What THIS environment will actually sell — staging can offer placeholder
    // packs that production refuses, from the same bundle.
    purchasableSkus: PRODUCTS.filter((p) =>
      isPurchasable(p.sku, config.payments.purchasableSkus)
    ).map((p) => p.sku),
    // Lets the checkout page tell the buyer that no real money will move.
    fake: driver ? driver.realMoney === false : false,
  };

  if (isDev()) {
    // Feeds the diagnostic panel on the return page. Never in production: the
    // driver name is not a secret, but "which acquirer, in what mode" is not
    // something to volunteer to anyone who curls the API either.
    body.testMode = true;
    body.driver = driver?.name ?? null;
  }

  res.json(body);
}

// POST /api/payments/orders   { skus: string[] }
export async function createOrder(req, res) {
  if (!config.payments.enabled) {
    return res
      .status(503)
      .json({ error: "The shop is not taking payments yet.", code: "PAYMENTS_DISABLED" });
  }

  // A body carrying a price is not a helpful client, it is a probe. Refusing it
  // outright costs three lines and documents the contract better than a comment.
  for (const forbidden of ["amount", "amountMinor", "price", "total"]) {
    if (req.body?.[forbidden] !== undefined) {
      return res.status(400).json({
        error: "Prices are set by the server. Send SKUs only.",
        code: "PRICE_NOT_ACCEPTED",
      });
    }
  }

  let priced;
  try {
    priced = priceBasket(
      req.body?.skus,
      req.user.entitlements ?? [],
      config.payments.purchasableSkus
    );
  } catch (error) {
    if (error instanceof BasketError) {
      return res
        .status(STATUS_FOR[error.code] ?? 400)
        .json({ error: error.message, code: error.code, sku: error.detail });
    }
    throw error;
  }

  const driver = getProvider();

  // Created BEFORE the driver is called, so its _id can be the order id the
  // acquirer echoes back. That ordering is what makes a timed-out create
  // recoverable: the callback still names an order we already know about, even
  // when we never learned the acquirer's own id for it.
  const payment = await Payment.create({
    userId: req.user._id,
    provider: driver.name,
    status: "pending",
    amountMinor: priced.amountMinor,
    currency: priced.currency,
    items: priced.items,
  });

  const orderId = payment._id.toString();
  const returnBase = `${config.frontendUrl ?? ""}/checkout/return?orderId=${orderId}`;

  try {
    const created = await driver.createPayment({
      // Doubles as the idempotence key for any acquirer that wants one: it is
      // deterministic and already unique, so a retried HTTP request cannot
      // produce two payments on their side.
      orderId,
      amountMinor: priced.amountMinor,
      currency: priced.currency,
      description: `malako: ${priced.items.map((i) => i.sku).join(", ")}`,
      customer: buildCustomer(req.user),
      returnUrls: {
        success: returnBase,
        // Some banks honour this and some send every outcome to the success
        // URL. The hint is a nicety for the ones that do; the return page still
        // decides from polled state, never from which URL it was reached by.
        fail: `${returnBase}&hint=fail`,
      },
      callbackUrl: callbackUrlFor(driver.name, orderId),
      metadata: { orderId, userId: req.user._id.toString() },
    });

    payment.providerPaymentId = created.providerPaymentId;
    payment.confirmationUrl = created.confirmationUrl;
    payment.idempotenceKey = orderId;
    payment.raw = created.raw ?? null;
    await payment.save();

    res.json({
      orderId: payment._id,
      confirmationUrl: created.confirmationUrl,
      amountMinor: priced.amountMinor,
      currency: priced.currency,
      items: priced.items,
      // SKUs removed because they were redundant or already owned, so the UI can
      // say why the total is lower than the basket suggested.
      dropped: priced.dropped,
    });
  } catch (error) {
    console.error("[payments] driver createPayment failed:", error.message);
    await Payment.updateOne(
      { _id: payment._id, status: "pending" },
      { $set: { status: "failed", cancellationReason: error.message.slice(0, 300) } }
    );
    res
      .status(502)
      .json({ error: "The payment provider is unavailable.", code: "PROVIDER_UNAVAILABLE" });
  }
}

/**
 * Whatever we know about the buyer, in the contract's shape.
 *
 * Banks routinely require a contact field or refuse the payment, and support
 * teams on the acquirer's side need something to correlate against. Empty fields
 * are omitted rather than sent as empty strings — several acquirers validate
 * presence, not content, and an empty string passes presence.
 *
 * NOTE ON RECEIPTS: fiscalisation (54-ФЗ) is deliberately not modelled in the
 * driver contract. It is acquirer-specific, legally specific, and a question for
 * an accountant before it is a question for this file. Whichever real driver
 * lands first has to answer "who issues the чек" before it is switched on.
 */
function buildCustomer(user) {
  const customer = {};
  if (user?.username) customer.name = user.username;
  if (user?.email) customer.email = user.email;
  if (user?.phoneNumber) customer.phone = user.phoneNumber;
  if (user?._id) customer.externalId = user._id.toString();
  return Object.keys(customer).length ? customer : null;
}

// GET /api/payments/orders/:id — own orders only, for the return page to poll.
export async function getOrder(req, res) {
  const payment = await Payment.findOne({ _id: req.params.id, userId: req.user._id }).catch(
    () => null
  );
  if (!payment) return res.status(404).json({ error: "Order not found." });

  const body = {
    orderId: payment._id,
    status: payment.status,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    items: payment.items,
    // The client refreshes its entitlements when this flips true, so it must
    // mean "the rows are on the user" — not "we have decided to write them".
    // grantedAt is the idempotency latch and is set BEFORE grantFor() runs;
    // reporting it here opens a window where the buyer sees the success screen,
    // refetches, and gets entitlements that have not landed yet. Padlocks stay
    // on until something else triggers a refresh, which reads as "I paid and it
    // did not work". grantAppliedAt is stamped after the writes complete.
    granted: Boolean(payment.grantAppliedAt),
    confirmationUrl: payment.confirmationUrl,
  };

  if (isDev()) {
    // The return page's diagnostic panel. Makes a local or staging test run
    // legible at a glance instead of needing a terminal and a devtools tab.
    body.providerPaymentId = payment.providerPaymentId;
    body.paidAt = payment.paidAt;
    body.createdAt = payment.createdAt;
    body.provider = payment.provider;
  }

  res.json(body);
}

// GET /api/payments/orders — the buyer's own history.
export async function listOrders(req, res) {
  const payments = await Payment.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("status amountMinor currency items createdAt grantedAt");
  res.json({ orders: payments });
}

// ── The webhook ────────────────────────────────────────────────────────────

// POST /api/payments/:driver/webhook
//
// Mounted in app.js above the rate limiter and above express.json — see the
// comment there for why both matter. Carries no JWT: this is server-to-server,
// and requiring one would mean the acquirer gets a 401 and the buyer never
// receives what they paid for.
//
// THE RESPONSE CODE IS PART OF THE PROTOCOL. Acquirers retry non-2xx and treat
// repeated failures as a dead endpoint, so 2xx here means "dealt with", not
// "granted". A duplicate, an unknown order and a refused amount are all things
// we have dealt with. Only a database failure — the one case a retry can
// actually fix — is a 500.
export async function paymentWebhook(req, res) {
  const driver = getProvider();

  // A stale URL from a previously configured acquirer must not be handed to the
  // current one's parser, which would reject it as a forgery and bury the real
  // cause in a 403.
  if (req.params.driver !== driver.name) return res.sendStatus(404);

  let parsed;
  try {
    parsed = driver.parseCallback({
      rawBody: req.body,
      query: req.query,
      headers: req.headers,
    });
  } catch (error) {
    if (error instanceof CallbackRejected) {
      console.error(`[payments] webhook REJECTED from ${req.ip}: ${error.message}`);
      return res.sendStatus(403);
    }
    if (error instanceof CallbackUnparseable) {
      console.error(`[payments] webhook UNPARSEABLE from ${req.ip}: ${error.message}`);
      return res.sendStatus(400);
    }
    throw error;
  }

  try {
    const known = await Payment.findById(parsed.orderId).catch(() => null);
    if (!known) {
      console.warn(`[payments] webhook for unknown order ${parsed.orderId} — ignoring`);
      return res.sendStatus(200);
    }

    // Cross-checks against what we stored before the buyer ever left. The
    // amount is checked inside settlePayment, which also records the refusal;
    // these two are the ones it cannot see.
    if (parsed.currency && parsed.currency !== known.currency) {
      console.error(
        `[payments] currency mismatch on ${known._id}: callback says ${parsed.currency}, ` +
          `order says ${known.currency}. NOT settling.`
      );
      return res.sendStatus(200);
    }
    if (
      known.providerPaymentId &&
      parsed.providerPaymentId &&
      known.providerPaymentId !== parsed.providerPaymentId
    ) {
      console.error(
        `[payments] payment id mismatch on ${known._id}: callback says ` +
          `${parsed.providerPaymentId}, order says ${known.providerPaymentId}. NOT settling.`
      );
      return res.sendStatus(200);
    }

    const result = await settlePayment({ orderId: parsed.orderId }, parsed);
    console.log(`[payments] webhook ${parsed.orderId} -> ${result.outcome}`);
    return res.sendStatus(200);
  } catch (error) {
    // The only retryable case. Anything above this is a decision, not a fault.
    console.error(`[payments] webhook failed for ${parsed.orderId}:`, error.message);
    return res.sendStatus(500);
  }
}

// ── The fake acquirer's control surface ────────────────────────────────────
//
// These endpoints are not part of the app. They stand in for the buttons on a
// bank's hosted payment page, and they exist only while a driver that moves no
// money is selected. Any other driver 404s them, so they cannot become a
// grant-yourself-anything endpoint in production.

/** The selected driver, but only if it is the fake one. */
function fakeDriverOrNull() {
  let driver;
  try {
    driver = getProvider();
  } catch {
    return null;
  }
  if (driver.realMoney !== false || typeof driver.act !== "function") return null;
  return driver;
}

// GET /api/payments/fake/:id
export async function fakeDescribe(req, res) {
  const driver = fakeDriverOrNull();
  if (!driver) return res.sendStatus(404);

  const row = await driver.describe(req.params.id);
  if (!row) return res.status(404).json({ error: "Unknown payment." });
  res.json(row);
}

// POST /api/payments/fake/:id/act   { action, sim }
//
// Returns as soon as the decision is recorded. It does NOT wait for the
// callback, because the browser coming home before the notification arrives is
// the ordering a real acquirer produces — and the one the return page's polling
// has to survive.
export async function fakeAct(req, res) {
  const driver = fakeDriverOrNull();
  if (!driver) return res.sendStatus(404);

  const result = await driver.act(req.params.id, {
    action: req.body?.action,
    sim: req.body?.sim ?? {},
  });

  if (!result) return res.status(404).json({ error: "Unknown payment or action." });
  if (result.alreadyDecided) {
    return res.status(409).json({ error: "This payment has already been decided." });
  }

  res.json({ status: result.row.status, sim: result.row.sim });
}
