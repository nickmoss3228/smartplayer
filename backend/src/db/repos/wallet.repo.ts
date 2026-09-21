// db/repos/wallet.repo.ts
//
// In-app currency. bitAward is the general balance (quiz completion); bitWord
// and bitPhrase are earned by specific activities. See config/currency.js.
//
// ── The one idiom that must survive the migration ──────────────────────────
//
// helpers/spendCurrency.js is, by the improvement backlog's own assessment,
// the best code in the backend: the balance check and the decrement are a
// SINGLE conditional write, so two rapid purchases cannot both read a stale
// balance and both succeed. A read-then-write check would allow exactly that.
//
//   findOneAndUpdate({ _id, "wallet.bitAward": { $gte: n } }, { $inc: -n })
//
// translates one-to-one, and if anything more clearly:
//
//   UPDATE users SET bit_award = bit_award - n
//    WHERE id = $1 AND bit_award >= n
//    RETURNING ...
//
// Zero rows back means insufficient funds, exactly as `null` did. The guard is
// part of the write, not a step before it — do not "simplify" this into a
// SELECT followed by an UPDATE.
//
// What is NEW is the CHECK (bit_award >= 0) in the schema. The Mongo version's
// correctness rested entirely on every caller going through this function; now
// the database refuses an overdraft even if someone writes a direct UPDATE.

import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "../client.js";
import { users } from "../schema.js";
import type { Tx } from "../client.js";

/** The three balances, as every caller expects to receive them. */
export interface Wallet {
  bitAward: number;
  bitWord: number;
  bitPhrase: number;
}

export type Currency = keyof Wallet;

/**
 * Which column each currency lives in.
 *
 * This map is the replacement for Mongo's computed dotted path
 * (`` `wallet.${currency}` `` in spendCurrency.js). The important property is
 * that it is a LOOKUP, not string interpolation: an unknown currency name
 * finds nothing and the caller is refused, whereas building a column name from
 * user input would be a SQL injection waiting for a careless caller.
 */
const COLUMN = {
  bitAward: users.bitAward,
  bitWord: users.bitWord,
  bitPhrase: users.bitPhrase,
} as const;

const RETURNING = {
  bitAward: users.bitAward,
  bitWord: users.bitWord,
  bitPhrase: users.bitPhrase,
} as const;

function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && Object.hasOwn(COLUMN, value);
}

/** Current balances, or null if the user is gone. */
export async function get(userId: string, tx: Tx = db()): Promise<Wallet | null> {
  const [row] = await tx.select(RETURNING).from(users).where(eq(users.id, userId));
  return row ?? null;
}

/**
 * Atomically debit one balance, refusing if there is not enough.
 *
 * @returns the updated wallet, or `null` when the balance was too low — which
 *   callers must treat as "declined", not "error". Same contract as the
 *   Mongoose version so call sites need no rethinking.
 */
export async function spendFrom(
  userId: string,
  currency: Currency,
  amount: number,
  tx: Tx = db(),
): Promise<Wallet | null> {
  if (!isCurrency(currency)) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const column = COLUMN[currency];

  const [row] = await tx
    .update(users)
    .set({ [currency]: sql`${column} - ${amount}` })
    // THE GUARD, and it is part of the write. Of two concurrent debits of a
    // balance that only covers one, exactly one UPDATE matches a row.
    .where(and(eq(users.id, userId), gte(column, amount)))
    .returning(RETURNING);

  return row ?? null;
}

/** The bitAward-only shorthand its existing callers expect. */
export async function spend(userId: string, amount: number, tx: Tx = db()): Promise<Wallet | null> {
  return spendFrom(userId, "bitAward", amount, tx);
}

/**
 * Put an amount back.
 *
 * Deliberately not symmetric with spendFrom in its failure handling: there is
 * no balance to check, so the only way this returns null is a user that no
 * longer exists, and a caller reaching this point has already taken the money.
 *
 * NOTE: with real transactions this function's main historical caller —
 * school.controller.js's manual refund after losing a purchase race — should
 * disappear. Wrap the charge and the record in one transaction instead and let
 * ROLLBACK do it. Keep the function; it is still right for a genuine credit.
 */
export async function grantFrom(
  userId: string,
  currency: Currency,
  amount: number,
  tx: Tx = db(),
): Promise<Wallet | null> {
  if (!isCurrency(currency)) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const column = COLUMN[currency];

  const [row] = await tx
    .update(users)
    .set({ [currency]: sql`${column} + ${amount}` })
    .where(eq(users.id, userId))
    .returning(RETURNING);

  return row ?? null;
}

/**
 * Credit several balances at once — the awardCurrency() path.
 *
 * One statement rather than one per currency, so a quiz that mints both
 * bitAward and bitWord cannot half-pay if the process dies mid-way.
 */
export async function award(
  userId: string,
  amounts: Partial<Wallet>,
  tx: Tx = db(),
): Promise<Wallet | null> {
  const set: Record<string, unknown> = {};

  for (const [currency, amount] of Object.entries(amounts)) {
    if (!isCurrency(currency)) continue;
    if (!Number.isFinite(amount) || (amount as number) <= 0) continue;
    set[currency] = sql`${COLUMN[currency]} + ${amount}`;
  }

  // Nothing to add is not an error — recordPhraseRepeat calls this with 0 for
  // a 1x repeat — so return the current state rather than a misleading null.
  if (Object.keys(set).length === 0) return get(userId, tx);

  const [row] = await tx.update(users).set(set).where(eq(users.id, userId)).returning(RETURNING);
  return row ?? null;
}
