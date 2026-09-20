// helpers/awardCurrency.js
import { wallet } from "../db/index.js";

/**
 * Increments a user's wallet balances and returns the updated wallet.
 * Server-authoritative — callers must compute amounts themselves and never
 * forward a client-supplied reward amount directly.
 *
 * One UPDATE for all three balances (db/repos/wallet.repo.ts award), so a
 * payout touching two currencies cannot half-land.
 *
 * @param {string} userId
 * @param {{ bitAward?: number, bitWord?: number, bitPhrase?: number }} amounts
 * @param {object} [tx] an open transaction, when this is one step of several
 * @returns {Promise<{bitAward: number, bitWord: number, bitPhrase: number} | null>}
 */
export async function awardCurrency(userId, { bitAward = 0, bitWord = 0, bitPhrase = 0 } = {}, tx) {
  if (!bitAward && !bitWord && !bitPhrase) return null;
  return wallet.award(userId, { bitAward, bitWord, bitPhrase }, tx);
}
