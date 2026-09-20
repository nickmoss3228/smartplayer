// db/repos/entitlements.repo.ts
//
// What a user has PAID FOR. Real money only — bitAward buys cosmetics, rubles
// buy stories, and nothing converts between them.
//
// ── The collapse ───────────────────────────────────────────────────────────
//
// helpers/settlePayment.js needed THREE separately-guarded conditional writes
// to grant entitlements idempotently, because Mongo could not express
// "one row per (user, sku), extend it if it exists":
//
//   updateOne({ _id, "entitlements.paymentId": { $ne: id } }, { $push: ... })
//   updateOne({ _id, "entitlements.sku": sku }, { $set: { "entitlements.$...
//   updateOne({ _id, "entitlements.sku": { $ne: sku } }, { $push: ... })
//
// UNIQUE (user_id, sku) states that invariant once, and every one of those
// becomes a single INSERT ... ON CONFLICT. "Re-buying the 90-day pass EXTENDS
// the existing row rather than pushing a second one" — the rule models/User.js
// spells out to explain why the array stays bounded — is now enforced rather
// than merely intended.
//
// What is FREE is still NOT stored here. It is derived from each story's
// length (freeAllowanceFor in config/priceCatalog.js), with no backfill.

import { and, eq, sql } from "drizzle-orm";

import { db } from "../client.js";
import { newId } from "../ids.js";
import { userEntitlement } from "../schema.js";
import type { Tx } from "../client.js";
import type { UserEntitlement } from "../schema.js";

export type EntitlementSource = "purchase" | "admin" | "promo";

/** Everything this user holds. Expiry is resolved by config/entitlements.js. */
export async function listFor(userId: string, tx: Tx = db()): Promise<UserEntitlement[]> {
  return tx.select().from(userEntitlement).where(eq(userEntitlement.userId, userId));
}

export async function findBySku(
  userId: string,
  sku: string,
  tx: Tx = db(),
): Promise<UserEntitlement | null> {
  const [row] = await tx
    .select()
    .from(userEntitlement)
    .where(and(eq(userEntitlement.userId, userId), eq(userEntitlement.sku, sku)));
  return row ?? null;
}

/**
 * Grant a perpetual entitlement.
 *
 * Idempotent by the unique constraint rather than by a `$ne` guard: a replayed
 * webhook conflicts and updates the same row instead of appending a second.
 * `grantedAt` is deliberately NOT touched on conflict — the first grant is when
 * they got it, and a retry must not rewrite that date.
 */
export async function grantPerpetual(
  userId: string,
  sku: string,
  paymentId: string | null,
  source: EntitlementSource = "purchase",
  tx: Tx = db(),
): Promise<UserEntitlement> {
  const [row] = await tx
    .insert(userEntitlement)
    .values({ id: newId(), userId, sku, paymentId, source, expiresAt: null })
    .onConflictDoUpdate({
      target: [userEntitlement.userId, userEntitlement.sku],
      set: { expiresAt: null, paymentId, source },
    })
    .returning();

  if (!row) throw new Error(`[entitlements] grantPerpetual wrote no row for ${sku}`);
  return row;
}

/**
 * Grant or extend a dated entitlement.
 *
 * Renewing a pass that still has a month left must ADD to it, not reset it — a
 * customer who renews early is otherwise punished for it. The Mongo version
 * computed the new expiry in JS from a row it had read moments earlier, which
 * is a lost-update race between two settlements of the same SKU.
 *
 * `GREATEST(existing.expires_at, now())` does the same arithmetic inside the
 * statement, against the row actually being written. Two concurrent renewals
 * therefore stack correctly instead of one overwriting the other.
 */
export async function grantOrExtend(
  userId: string,
  sku: string,
  durationDays: number,
  paymentId: string | null,
  source: EntitlementSource = "purchase",
  tx: Tx = db(),
): Promise<UserEntitlement> {
  const interval = sql`make_interval(days => ${durationDays})`;

  const [row] = await tx
    .insert(userEntitlement)
    .values({
      id: newId(),
      userId,
      sku,
      paymentId,
      source,
      expiresAt: sql`now() + ${interval}` as unknown as Date,
    })
    .onConflictDoUpdate({
      target: [userEntitlement.userId, userEntitlement.sku],
      set: {
        // Extend from whichever is later: now, or the current expiry. An
        // already-expired row restarts from now rather than from the past.
        expiresAt: sql`GREATEST(COALESCE(${userEntitlement.expiresAt}, now()), now()) + ${interval}`,
        paymentId,
        source,
      },
    })
    .returning();

  if (!row) throw new Error(`[entitlements] grantOrExtend wrote no row for ${sku}`);
  return row;
}

/**
 * Grant or reset a dated entitlement to an EXACT expiry.
 *
 * For settlement, where rowsFor() (helpers/settlePayment.js) has already
 * computed the expiry from the row that is there — under the user's row lock,
 * so the computation and this write cannot be split by a concurrent grant.
 * grantOrExtend() above does the same arithmetic in SQL instead, for callers
 * that have not.
 */
export async function grantUntil(
  userId: string,
  sku: string,
  expiresAt: Date,
  paymentId: string | null,
  source: EntitlementSource = "purchase",
  tx: Tx = db(),
): Promise<UserEntitlement> {
  const [row] = await tx
    .insert(userEntitlement)
    .values({ id: newId(), userId, sku, paymentId, source, expiresAt })
    .onConflictDoUpdate({
      target: [userEntitlement.userId, userEntitlement.sku],
      set: { expiresAt, paymentId, source },
    })
    .returning();

  if (!row) throw new Error(`[entitlements] grantUntil wrote no row for ${sku}`);
  return row;
}

/**
 * Revoke by SKU — the admin panel's action, and half of a refund.
 *
 * Returns rows removed; admin.controller.js branches on it to tell "revoked"
 * from "they never had it".
 */
export async function revoke(userId: string, sku: string, tx: Tx = db()): Promise<number> {
  const result = await tx
    .delete(userEntitlement)
    .where(and(eq(userEntitlement.userId, userId), eq(userEntitlement.sku, sku)));
  return result.rowCount ?? 0;
}

/**
 * Revoke everything a given payment granted — the other half of a refund.
 *
 * This is what payment_id is for. In Mongo it meant scanning an embedded array
 * for a matching ObjectId; here it is an indexed delete.
 */
export async function revokeByPayment(paymentId: string, tx: Tx = db()): Promise<number> {
  const result = await tx.delete(userEntitlement).where(eq(userEntitlement.paymentId, paymentId));
  return result.rowCount ?? 0;
}

/**
 * Whether a payment's entitlements have landed.
 *
 * Used by the reconciler's repair sweep today. NOTE: once settlement runs in a
 * single transaction, the case this detects — latched as succeeded but rows
 * never written — becomes impossible, and that sweep should be deleted rather
 * than ported. Kept here because deleting it is a separate, reviewable change.
 */
export async function existsForPayment(paymentId: string, tx: Tx = db()): Promise<boolean> {
  const [row] = await tx
    .select({ id: userEntitlement.id })
    .from(userEntitlement)
    .where(eq(userEntitlement.paymentId, paymentId))
    .limit(1);
  return Boolean(row);
}
