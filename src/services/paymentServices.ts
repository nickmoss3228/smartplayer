// services/paymentServices.ts
// Follows the shared-client shape documented at the top of walletServices.ts.
import { api } from "./apiClient";

export interface PaymentConfig {
  enabled: boolean;
  currency: string;
  /** What the SERVER will price right now — staging sells more than production. */
  purchasableSkus: string[];
  /** True when the selected driver moves no money; the checkout page says so. */
  fake: boolean;
  /** Non-production only. Gates the diagnostic panel on the return page. */
  testMode?: boolean;
  /** Non-production only. Which payment driver is live, e.g. "fake". */
  driver?: string | null;
}

export interface OrderItem {
  sku: string;
  amountMinor: number;
  durationDays: number | null;
}

export interface CreatedOrder {
  orderId: string;
  confirmationUrl: string;
  amountMinor: number;
  currency: string;
  items: OrderItem[];
  /** SKUs removed as redundant or already owned, so the UI can explain the total. */
  dropped: string[];
}

export interface OrderStatus {
  orderId: string;
  status: "pending" | "succeeded" | "canceled" | "failed" | "refunded";
  amountMinor: number;
  currency: string;
  items: OrderItem[];
  /** Entitlements have actually landed. This, not `status`, is what unlocks the UI. */
  granted: boolean;
  confirmationUrl: string | null;

  // Present only outside production — the server gates these. They feed the
  // diagnostic panel, so that a test run can be read off the page instead of out
  // of a terminal.
  providerPaymentId?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
  provider?: string;
}

export const fetchPaymentConfig = async (): Promise<PaymentConfig> => {
  const res = await api.get("/api/payments/config");
  return res.data;
};

/**
 * Creates an order. Sends SKU ids and NOTHING ELSE — the server prices the
 * basket from its own catalog and rejects any body carrying an amount. Do not
 * "helpfully" add a total here; it will be refused with PRICE_NOT_ACCEPTED.
 */
export const createOrder = async (skus: string[]): Promise<CreatedOrder> => {
  const res = await api.post("/api/payments/orders", { skus });
  return res.data;
};

export const fetchOrder = async (orderId: string): Promise<OrderStatus> => {
  const res = await api.get(`/api/payments/orders/${orderId}`);
  return res.data;
};

// ── The fake acquirer's page ───────────────────────────────────────────────
//
// These call the stand-in for a bank's hosted payment page. The server 404s them
// unless a driver that moves no money is selected, so they cannot do anything in
// production even if a stale bundle tries.

export type FakeAction = "pay" | "decline" | "cancel";

/** once — normal. twice — a duplicate delivery. never — the callback is lost. */
export type FakeDeliver = "once" | "twice" | "never";
/** wrong — report an amount that disagrees with the order. */
export type FakeAmount = "correct" | "wrong";

/** What the acquirer will do with the notification once a button is pressed. */
export interface FakeSim {
  /** How long it "takes" before calling back, in milliseconds. */
  delayMs?: number;
  deliver?: FakeDeliver;
  amount?: FakeAmount;
}

export interface FakePayment {
  id: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  status: "NEW" | "PENDING" | "PAID" | "FAILED" | "CANCELED";
  sim: Required<FakeSim>;
  deliveries: { at: string; attempt: number; code: number | null; error: string | null }[];
  delivered: boolean;
}

export const fetchFakePayment = async (id: string): Promise<FakePayment> => {
  const res = await api.get(`/api/payments/fake/${id}`);
  return res.data;
};

/**
 * Presses a button on the fake bank's page.
 *
 * Resolves as soon as the decision is recorded — NOT when the callback lands.
 * That is deliberate: a real acquirer redirects the browser home while its
 * notification is still in flight, and the return page has to survive arriving
 * before the payment is settled.
 */
export const actOnFakePayment = async (id: string, action: FakeAction, sim: FakeSim) => {
  const res = await api.post(`/api/payments/fake/${id}/act`, { action, sim });
  return res.data as { status: string; sim: Required<FakeSim> };
};
