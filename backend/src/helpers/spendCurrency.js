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

/**
 * Debits several currencies in one shot, all or nothing — what the Dream
 * School's upgrade button needs, since a stage costs BitAward, BitWord and
 * BitPhrase together and a player charged for two of the three would be
 * strictly worse off than one who was declined.
 *
 * Three balance checks and three decrements in a single findOneAndUpdate, so
 * the same race that spendFrom closes is closed here: there is no window
 * between "can they afford it" and "take it".
 *
 * Zero-valued entries are dropped rather than sent as `$inc: -0`, which keeps
 * a free stage (index 0) from failing the "must be positive" guard.
 *
 * @param {ObjectId} userId
 * @param {{bitAward?: number, bitWord?: number, bitPhrase?: number}} costs
 * @returns {Promise<{bitAward: number, bitWord: number, bitPhrase: number} | null>}
 *   Updated wallet on success, null when any one balance is too low.
 */
export async function spendMany(userId, costs) {
  const filter = { _id: userId };
  const dec = {};

  for (const currency of WALLETS) {
    const amount = costs?.[currency] ?? 0;
    if (!Number.isFinite(amount) || amount < 0) return null;
    if (amount === 0) continue;
    filter[`wallet.${currency}`] = { $gte: amount };
    dec[`wallet.${currency}`] = -amount;
  }

  // A free upgrade still has to return the wallet, so read it rather than
  // treating "nothing to charge" as a failure.
  if (Object.keys(dec).length === 0) {
    const user = await User.findById(userId).select("wallet");
    return user?.wallet ?? null;
  }

  const user = await User.findOneAndUpdate(filter, { $inc: dec }, {
    new: true,
    select: "wallet",
  });
  return user?.wallet ?? null;
}
