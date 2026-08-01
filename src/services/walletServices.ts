import axios from "axios";
import { Wallet } from "../types/Wallet";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const fetchWallet = async (token: string): Promise<Wallet> => {
  const res = await axios.get(`${API_BASE}/api/progress/wallet`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.wallet;
};

export const submitPhraseRepeat = async (
  token: string,
  repeatCount: number,
): Promise<Wallet> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/phrase-repeat`,
    { repeatCount },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data.wallet;
};
