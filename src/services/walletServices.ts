import { api } from "./apiClient";
import { Wallet } from "../types/Wallet";

// Reference migration for the shared axios client — the other service modules
// still hand-build their own Authorization header and should follow this shape:
//
//   1. `import axios from "axios"` -> `import { api } from "./apiClient"`;
//      delete the local API_BASE const.
//   2. `axios.X(`${API_BASE}/api/...`)` -> `api.X("/api/...")`.
//   3. Delete the `{ headers: { Authorization } }` config object.
//   4. Rename the leading `token` param to `_token`. Do NOT delete it: it must
//      keep its POSITION or every call site breaks, and tsconfig's
//      noUnusedParameters makes the underscore prefix mandatory. Dropping the
//      parameter entirely is a separate, mechanical cleanup pass.

export const fetchWallet = async (_token?: string): Promise<Wallet> => {
  const res = await api.get("/api/progress/wallet");
  return res.data.wallet;
};

export const submitPhraseRepeat = async (
  _token: string | undefined,
  repeatCount: number,
): Promise<Wallet> => {
  const res = await api.post("/api/progress/phrase-repeat", { repeatCount });
  return res.data.wallet;
};
