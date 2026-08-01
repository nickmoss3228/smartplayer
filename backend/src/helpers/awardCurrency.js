// helpers/awardCurrency.js
import { User } from "../models/User.js";

/**
 * Increments a user's wallet balances and returns the updated wallet.
 * Server-authoritative — callers must compute amounts themselves and never
 * forward a client-supplied reward amount directly.
 *
 * @param {ObjectId} userId
 * @param {{ bitAward?: number, bitWord?: number, bitPhrase?: number }} amounts
 * @returns {Promise<{bitAward: number, bitWord: number, bitPhrase: number} | null>}
 */
export async function awardCurrency(userId, { bitAward = 0, bitWord = 0, bitPhrase = 0 } = {}) {
  if (!bitAward && !bitWord && !bitPhrase) return null;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $inc: {
        "wallet.bitAward": bitAward,
        "wallet.bitWord": bitWord,
        "wallet.bitPhrase": bitPhrase,
      },
    },
    { new: true, select: "wallet" },
  );
  return user?.wallet ?? null;
}
