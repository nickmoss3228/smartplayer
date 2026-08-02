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
