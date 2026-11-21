export interface Wallet {
  bitAward: number;
  bitWord: number;
  bitPhrase: number;
}

/** A surprise reward the server rolled on top of a normal payout. */
export type RewardBonus = {
  kind: "surprise" | "golden" | "goldenWord";
  currency: "bitAward" | "bitWord" | "bitPhrase";
  amount: number;
  /** goldenWord only: the (first) golden word guessed, and how many were. */
  word?: string;
  count?: number;
};
