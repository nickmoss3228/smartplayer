// helpers/spendCurrency.js
//
// Thin, stable names over db/repos/wallet.repo.ts, kept so the call sites in
// the school and shop controllers read the same as they always have. The
// property that matters lives in the repo: the balance check and the decrement
// are ONE conditional UPDATE (`... WHERE balance >= amount`), so two purchases
// racing each other cannot both pass a read-then-write check and overdraw.
//
// Every function takes an optional transaction as its last argument. Pass one
// when a debit is one step of a purchase, so the charge and the thing bought
// commit together — which is what retires the old charge-then-refund dance.
import { wallet } from "../db/index.js";

/**
 * Atomically decrements a user's bitAward balance, refusing if funds are
 * insufficient.
 *
 * @returns {Promise<{bitAward: number, bitWord: number, bitPhrase: number} | null>}
 *   Updated wallet on success, null if the user doesn't have enough bitAward.
 */
export async function spendCurrency(userId, amount, tx) {
  if (!amount || amount <= 0) return null;
  return wallet.spend(userId, amount, tx);
}

// Generalized form used by the Dream School, where every room is priced in
// exactly one currency and which currency depends on what the room is for (see
// schoolCatalog.js). Returns null when the balance is too low, which callers
// must treat as "declined", not "error".
export async function spendFrom(userId, currency, amount, tx) {
  return wallet.spendFrom(userId, currency, amount, tx);
}

/**
 * The other half of spendFrom: puts an amount back.
 *
 * With transactions available, a purchase that loses a race should roll back
 * rather than call this. It remains for genuine credits.
 */
export async function grantFrom(userId, currency, amount, tx) {
  return wallet.grantFrom(userId, currency, amount, tx);
}
