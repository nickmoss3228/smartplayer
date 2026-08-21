// helpers/spendCurrency.js
import { User } from "../models/User.js";

/**
 * Atomically decrements a user's bitAward balance, refusing if funds are
 * insufficient. The balance check and the decrement happen in a single
 * findOneAndUpdate filter so two rapid purchase requests can't both read a
 * stale balance and both succeed (a read-then-write check would allow that).
 *
 * @param {ObjectId} userId
 * @param {number} amount
 * @returns {Promise<{bitAward: number, bitWord: number, bitPhrase: number} | null>}
 *   Updated wallet on success, null if the user doesn't have enough bitAward.
 */
export async function spendCurrency(userId, amount) {
  if (!amount || amount <= 0) return null;

  const user = await User.findOneAndUpdate(
    { _id: userId, "wallet.bitAward": { $gte: amount } },
    { $inc: { "wallet.bitAward": -amount } },
    { new: true, select: "wallet" },
  );
  return user?.wallet ?? null;
}

// Generalized form used by the Dream School, where each currency buys a
// different class of thing (rooms / furniture / actions — see
// schoolCatalog.js). spendCurrency above stays as the bitAward-only shorthand
// its existing callers expect.
//
// Same conditional-update trick: the balance check and the decrement are a
// single atomic operation, so two purchases racing each other cannot both pass
// a read-then-write check and overdraw the wallet. Returns null when the
// balance is too low, which callers must treat as "declined", not "error".
const WALLETS = ["bitAward", "bitWord", "bitPhrase"];

export async function spendFrom(userId, currency, amount) {
  if (!WALLETS.includes(currency)) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const field = `wallet.${currency}`;
  const user = await User.findOneAndUpdate(
    { _id: userId, [field]: { $gte: amount } },
    { $inc: { [field]: -amount } },
    { new: true, select: "wallet" },
  );
  return user?.wallet ?? null;
}
