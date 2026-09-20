// db/repos/payments.repo.ts
//
// The financial ledger. One row per attempt to take money, whatever happens to
// it afterwards — this is what support reads when someone says "I paid and got
// nothing", and it is the reconciliation job's work queue. Kept forever.
//
// ── The latch, and what transactions change ────────────────────────────────
//
// settlePayment.js is built around one conditional write:
//
//   findOneAndUpdate({ _id, grantedAt: null }, { $set: { grantedAt: now } })
//
// Of two concurrent webhook deliveries exactly one gets past that line. It
// translates directly (`UPDATE ... WHERE granted_at IS NULL RETURNING *`) and
// should be KEPT — it is still the cheapest correct way to make settlement
// happen once.
//
// What changes is what comes AFTER it. Today the latch is set, and then the
// entitlement rows are pushed in separate writes; a process that dies in
// between leaves a paid order with nothing granted, and jobs/reconcilePayments
// .js carries a whole second sweep to repair that. Run the latch and the grant
// in ONE transaction and that failure mode stops existing — delete the sweep,
// not port it. The ordering comment in reconcilePayments.js explaining why the
// latch must come first also stops applying: inside a transaction there is no
// "first".
//
// The webhook-chasing sweep (a lost notification) must stay. Transactions do
// not fix other people's networks.

import { and, eq, gt, gte, inArray, isNull, lt, lte, sql } from "drizzle-orm";

import { db } from "../client.js";
import { newId } from "../ids.js";
import { payment, paymentItem } from "../schema.js";
import type { Tx } from "../client.js";
import type { Payment, PaymentItem } from "../schema.js";

export type PaymentStatus = "pending" | "succeeded" | "canceled" | "failed" | "refunded";

export interface NewOrderItem {
  sku: string;
  /** PRICED SNAPSHOT, taken at order time and never recomputed. */
  amountMinor: number;
  durationDays?: number | null;
}

export interface PaymentWithItems extends Payment {
  items: PaymentItem[];
}

/**
 * Open an order, before the provider is called.
 *
 * The id is minted here rather than by the database because it is handed
 * straight to ЮKassa as the idempotence key — the value has to exist before
 * the row is durable, so that a retried create reuses it.
 */
export async function create(
  input: {
    userId: string;
    provider: string;
    amountMinor: number;
    currency?: string;
    items: NewOrderItem[];
  },
  tx: Tx = db(),
): Promise<PaymentWithItems> {
  const id = newId();

  const [row] = await tx
    .insert(payment)
    .values({
      id,
      userId: input.userId,
      provider: input.provider,
      amountMinor: input.amountMinor,
      currency: input.currency ?? "RUB",
      status: "pending",
      // Deterministic, and equal to the payment's own id, so a retried create
      // cannot produce two payments on the provider's side.
      idempotenceKey: id,
    })
    .returning();

  if (!row) throw new Error("[payments] create inserted no row");

  const items = input.items.length
    ? await tx
        .insert(paymentItem)
        .values(
          input.items.map((item, ordinal) => ({
            id: newId(),
            paymentId: id,
            ordinal,
            sku: item.sku,
            amountMinor: item.amountMinor,
            durationDays: item.durationDays ?? null,
          })),
        )
        .returning()
    : [];

  return { ...row, items };
}

export async function findById(id: string, tx: Tx = db()): Promise<PaymentWithItems | null> {
  const [row] = await tx.select().from(payment).where(eq(payment.id, id));
  if (!row) return null;
  return { ...row, items: await itemsFor(id, tx) };
}

export async function findByProviderId(
  providerPaymentId: string,
  tx: Tx = db(),
): Promise<PaymentWithItems | null> {
  const [row] = await tx
    .select()
    .from(payment)
    .where(eq(payment.providerPaymentId, providerPaymentId));
  if (!row) return null;
  return { ...row, items: await itemsFor(row.id, tx) };
}

export async function itemsFor(paymentId: string, tx: Tx = db()): Promise<PaymentItem[]> {
  return tx
    .select()
    .from(paymentItem)
    .where(eq(paymentItem.paymentId, paymentId))
    .orderBy(paymentItem.ordinal);
}

/** Record the provider's id and confirmation URL once they have answered. */
export async function attachProviderPayment(
  id: string,
  providerPaymentId: string,
  confirmationUrl: string | null,
  tx: Tx = db(),
): Promise<Payment | null> {
  const [row] = await tx
    .update(payment)
    .set({ providerPaymentId, confirmationUrl, updatedAt: new Date() })
    .where(eq(payment.id, id))
    .returning();
  return row ?? null;
}

/**
 * THE LATCH. Conditional on granted_at still being NULL, so of two concurrent
 * deliveries exactly one proceeds. Everything the caller does with a non-null
 * return runs at most once per payment.
 *
 * @returns the updated row, or `null` if it was already settled (a replay).
 */
export async function latchSucceeded(
  id: string,
  raw: unknown,
  now = new Date(),
  tx: Tx = db(),
): Promise<Payment | null> {
  const [row] = await tx
    .update(payment)
    .set({
      status: "succeeded",
      grantedAt: now,
      // Declared in the schema, unlike in Mongoose — where this write existed
      // in settlePayment.js but was silently discarded on every settlement.
      paidAt: now,
      raw: raw ?? null,
      updatedAt: now,
    })
    .where(and(eq(payment.id, id), isNull(payment.grantedAt)))
    .returning();

  return row ?? null;
}

/** Cancel, but only while still pending — a settled payment must not regress. */
export async function markCanceled(
  id: string,
  raw: unknown,
  reason: string | null = null,
  tx: Tx = db(),
): Promise<Payment | null> {
  const [row] = await tx
    .update(payment)
    .set({
      status: "canceled",
      cancellationReason: reason,
      raw: raw ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(payment.id, id), eq(payment.status, "pending")))
    .returning();
  return row ?? null;
}

/**
 * Refuse to grant when the provider's amount disagrees with what we priced.
 * Either the catalog moved under a live order or someone is playing games;
 * both want a human, and neither wants an entitlement.
 */
export async function markFailed(id: string, raw: unknown, tx: Tx = db()): Promise<Payment | null> {
  const [row] = await tx
    .update(payment)
    .set({ status: "failed", raw: raw ?? null, updatedAt: new Date() })
    .where(and(eq(payment.id, id), isNull(payment.grantedAt)))
    .returning();
  return row ?? null;
}

export async function markRefunded(id: string, tx: Tx = db()): Promise<Payment | null> {
  const [row] = await tx
    .update(payment)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(eq(payment.id, id))
    .returning();
  return row ?? null;
}

/**
 * The reconciler's work queue: pending, with a provider id, old enough that
 * the webhook should already have arrived, young enough that the provider has
 * not forgotten it.
 */
export async function findPendingForReconcile(
  minAgeMs: number,
  maxAgeMs: number,
  limit: number,
  now = Date.now(),
  tx: Tx = db(),
): Promise<Pick<Payment, "id" | "providerPaymentId">[]> {
  return tx
    .select({ id: payment.id, providerPaymentId: payment.providerPaymentId })
    .from(payment)
    .where(
      and(
        eq(payment.status, "pending"),
        sql`${payment.providerPaymentId} IS NOT NULL`,
        lt(payment.createdAt, new Date(now - minAgeMs)),
        gt(payment.createdAt, new Date(now - maxAgeMs)),
      ),
    )
    .limit(limit);
}

// ── Used by the controller, settlement and the reconciler ───────────────────

const PAYMENT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isUuid = (value: unknown): value is string => typeof value === "string" && PAYMENT_UUID.test(value);

/**
 * By id, treating a malformed id as "not found". A forged callback will happily
 * supply garbage as an order id, and against a uuid column that is a query
 * error — which the webhook would turn into a 500 and an acquirer into retries.
 */
export async function findByIdSafe(id: unknown, tx: Tx = db()): Promise<PaymentWithItems | null> {
  return isUuid(id) ? findById(id, tx) : null;
}

/** A payment only if it belongs to `userId` — the return page polls its own orders. */
export async function findOwned(id: unknown, userId: string, tx: Tx = db()): Promise<PaymentWithItems | null> {
  if (!isUuid(id)) return null;
  const [row] = await tx
    .select()
    .from(payment)
    .where(and(eq(payment.id, id), eq(payment.userId, userId)));
  return row ? { ...row, items: await itemsFor(row.id, tx) } : null;
}

/** What the acquirer answered to createPayment. */
export async function recordProviderCreate(
  id: string,
  created: { providerPaymentId: string | null; confirmationUrl: string | null; raw: unknown },
  tx: Tx = db(),
): Promise<Payment | null> {
  const [row] = await tx
    .update(payment)
    .set({
      providerPaymentId: created.providerPaymentId,
      confirmationUrl: created.confirmationUrl,
      idempotenceKey: id,
      raw: created.raw ?? null,
      updatedAt: new Date(),
    })
    .where(eq(payment.id, id))
    .returning();
  return row ?? null;
}

/** The acquirer could not be reached at all. Only a still-pending order is failed. */
export async function markCreateFailed(id: string, reason: string, tx: Tx = db()): Promise<void> {
  await tx
    .update(payment)
    .set({ status: "failed", cancellationReason: reason.slice(0, 300), updatedAt: new Date() })
    .where(and(eq(payment.id, id), eq(payment.status, "pending")));
}

/**
 * THE LATCH, carrying the settlement details.
 *
 * Same guard as latchSucceeded — `granted_at IS NULL` is part of the write — but
 * records the acquirer's paidAt and, when the create call never told us, their
 * payment id. Of two concurrent deliveries, the second UPDATE waits on the
 * first's row lock, re-checks the guard after it commits, and matches nothing.
 *
 * @returns the latched row, or null when it was already settled.
 */
export async function latch(
  id: string,
  details: { paidAt: Date; raw: unknown; providerPaymentId?: string | null },
  now = new Date(),
  tx: Tx = db(),
): Promise<Payment | null> {
  const [row] = await tx
    .update(payment)
    .set({
      status: "succeeded",
      grantedAt: now,
      paidAt: details.paidAt,
      raw: details.raw ?? null,
      updatedAt: now,
      ...(details.providerPaymentId ? { providerPaymentId: details.providerPaymentId } : {}),
    })
    .where(and(eq(payment.id, id), isNull(payment.grantedAt)))
    .returning();
  return row ?? null;
}

/**
 * A declined card. Recorded, but NOT terminal: an acquirer may still send
 * "paid" for the same payment after a retry, and the latch keys on granted_at
 * rather than status precisely so that later success still grants.
 */
export async function markFailedWhilePending(id: string, raw: unknown, tx: Tx = db()): Promise<void> {
  await tx
    .update(payment)
    .set({ status: "failed", raw: raw ?? null, updatedAt: new Date() })
    .where(and(eq(payment.id, id), isNull(payment.grantedAt), eq(payment.status, "pending")));
}

/** The entitlement rows have landed. The return page reports "granted" from this. */
export async function stampGrantApplied(id: string, tx: Tx = db()): Promise<void> {
  const now = new Date();
  await tx.update(payment).set({ grantAppliedAt: now, updatedAt: now }).where(eq(payment.id, id));
}

/** Items for many payments in one query. */
async function itemsForMany(ids: string[], tx: Tx): Promise<Map<string, PaymentItem[]>> {
  const grouped = new Map<string, PaymentItem[]>();
  if (!ids.length) return grouped;
  const rows = await tx
    .select()
    .from(paymentItem)
    .where(inArray(paymentItem.paymentId, ids))
    .orderBy(paymentItem.ordinal);
  for (const row of rows) {
    const list = grouped.get(row.paymentId) ?? [];
    list.push(row);
    grouped.set(row.paymentId, list);
  }
  return grouped;
}

/** A user's orders, newest first, each with its items. */
export async function listForUserWithItems(
  userId: string,
  limit = 50,
  tx: Tx = db(),
): Promise<PaymentWithItems[]> {
  const rows = await tx
    .select()
    .from(payment)
    .where(eq(payment.userId, userId))
    .orderBy(sql`${payment.createdAt} DESC`)
    .limit(limit);
  const items = await itemsForMany(rows.map((r) => r.id), tx);
  return rows.map((row) => ({ ...row, items: items.get(row.id) ?? [] }));
}

/**
 * Reconciler sweep 2: latched as succeeded, rows never applied.
 *
 * With settlement running the latch, the grant and the stamp in one
 * transaction this should always come back empty. It is kept as a watch on
 * that invariant, and for anything settled before that was true.
 */
export async function findUnapplied(
  maxAgeMs: number,
  limit: number,
  now = Date.now(),
  tx: Tx = db(),
): Promise<PaymentWithItems[]> {
  const rows = await tx
    .select()
    .from(payment)
    .where(
      and(
        eq(payment.status, "succeeded"),
        isNull(payment.grantAppliedAt),
        gte(payment.grantedAt, new Date(now - maxAgeMs)),
      ),
    )
    .limit(limit);
  const items = await itemsForMany(rows.map((r) => r.id), tx);
  return rows.map((row) => ({ ...row, items: items.get(row.id) ?? [] }));
}

/** Reconciler sweep 3: pending for so long that no callback is coming. */
export async function findAbandoned(
  maxAgeMs: number,
  limit: number,
  now = Date.now(),
  tx: Tx = db(),
): Promise<Pick<Payment, "id" | "userId" | "amountMinor" | "currency" | "createdAt">[]> {
  return tx
    .select({
      id: payment.id,
      userId: payment.userId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      createdAt: payment.createdAt,
    })
    .from(payment)
    .where(
      and(
        eq(payment.status, "pending"),
        isNull(payment.grantedAt),
        lte(payment.createdAt, new Date(now - maxAgeMs)),
      ),
    )
    .limit(limit);
}

/**
 * Cancel an abandoned payment — guarded, so one that settles at the last moment
 * is never overwritten. Returns rows changed.
 */
export async function retireAbandoned(id: string, reason: string, tx: Tx = db()): Promise<number> {
  const result = await tx
    .update(payment)
    .set({ status: "canceled", cancellationReason: reason, updatedAt: new Date() })
    .where(and(eq(payment.id, id), eq(payment.status, "pending"), isNull(payment.grantedAt)));
  return result.rowCount ?? 0;
}

/** A user's order history, newest first. Account page and support. */
export async function listForUser(
  userId: string,
  limit = 50,
  tx: Tx = db(),
): Promise<Payment[]> {
  return tx
    .select()
    .from(payment)
    .where(eq(payment.userId, userId))
    .orderBy(sql`${payment.createdAt} DESC`)
    .limit(limit);
}
