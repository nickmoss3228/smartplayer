// db/repos/fakePayments.repo.ts
//
// The fake acquirer's own records (services/payments/fake.js). Not our ledger:
// nothing here references `payment`, by design — see models/FakePayment.js.
//
// Rows come back in the shape fake.js already speaks: `_id`, and `sim` as a
// nested object. The table flattens `sim` into columns; that is a storage
// detail the driver should not have to know.

import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "../client.js";
import type { Tx } from "../client.js";
import { fakePayment } from "../schema.js";
import type { FakePayment } from "../schema.js";

export interface Delivery {
  at: string;
  attempt: number;
  code: number | null;
  error: string | null;
}

export interface FakePaymentDoc {
  _id: string;
  id: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  status: string;
  callbackUrl: string;
  sim: { delayMs: number; deliver: string; amount: string };
  deliveries: Delivery[];
  delivered: boolean;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toDoc(row: FakePayment): FakePaymentDoc {
  return {
    _id: row.id,
    id: row.id,
    orderId: row.orderId,
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: row.status,
    callbackUrl: row.callbackUrl,
    sim: { delayMs: row.simDelayMs, deliver: row.simDeliver, amount: row.simAmount },
    deliveries: row.deliveries ?? [],
    delivered: row.delivered,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function create(
  input: {
    id: string;
    orderId: string;
    amountMinor: number;
    currency: string;
    status: string;
    callbackUrl: string;
    simDelayMs: number;
  },
  tx: Tx = db(),
): Promise<FakePaymentDoc> {
  const [row] = await tx
    .insert(fakePayment)
    .values({
      id: input.id,
      orderId: input.orderId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      status: input.status,
      callbackUrl: input.callbackUrl,
      simDelayMs: input.simDelayMs,
    })
    .returning();
  if (!row) throw new Error("[fakePayments] create wrote no row");
  return toDoc(row);
}

export async function findById(id: unknown, tx: Tx = db()): Promise<FakePaymentDoc | null> {
  if (typeof id !== "string" || !id) return null;
  const [row] = await tx.select().from(fakePayment).where(eq(fakePayment.id, id));
  return row ? toDoc(row) : null;
}

/**
 * Record the customer's decision — but only while the payment is still open.
 *
 * The status guard is part of the write, so two button presses racing each
 * other cannot both decide; the loser gets null and reports "already decided".
 */
export async function decide(
  id: string,
  update: { status: string; paidAt: Date | null; sim: { delayMs: number; deliver: string; amount: string } },
  tx: Tx = db(),
): Promise<FakePaymentDoc | null> {
  const [row] = await tx
    .update(fakePayment)
    .set({
      status: update.status,
      paidAt: update.paidAt,
      simDelayMs: update.sim.delayMs,
      simDeliver: update.sim.deliver,
      simAmount: update.sim.amount,
      updatedAt: new Date(),
    })
    .where(and(eq(fakePayment.id, id), inArray(fakePayment.status, ["NEW", "PENDING"])))
    .returning();
  return row ? toDoc(row) : null;
}

/**
 * Append one delivery attempt, and optionally mark the payment delivered.
 *
 * The append is done in SQL (`deliveries || jsonb_build_array(...)`) rather
 * than read-modify-write, so a "twice" simulation's two rounds cannot lose one
 * another's entries.
 */
export async function recordDelivery(
  id: string,
  attempt: { attempt: number; code: number | null; error: string | null },
  delivered: boolean,
  tx: Tx = db(),
): Promise<void> {
  const entry = { at: new Date().toISOString(), ...attempt };
  await tx
    .update(fakePayment)
    .set({
      deliveries: sql`${fakePayment.deliveries} || ${JSON.stringify([entry])}::jsonb`,
      ...(delivered ? { delivered: true } : {}),
      updatedAt: new Date(),
    })
    .where(eq(fakePayment.id, id));
}

/** Boot recovery: decided, never delivered, and not a simulated loss. */
export async function findStranded(tx: Tx = db()): Promise<{ id: string }[]> {
  return tx
    .select({ id: fakePayment.id })
    .from(fakePayment)
    .where(
      and(
        eq(fakePayment.delivered, false),
        inArray(fakePayment.status, ["PAID", "FAILED", "CANCELED"]),
        ne(fakePayment.simDeliver, "never"),
      ),
    );
}
