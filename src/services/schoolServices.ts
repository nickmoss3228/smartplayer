import axios from "axios";
import { API_BASE } from "./apiClient";

// Wire format for the Dream School. Four fields, and that really is the whole
// save — the stage index implies every room, prop and person on screen, so
// there is nothing per-item to send. See docs/room-game-concept.md.
export interface SchoolState {
  stage: number;
  layoutId: string;
  wallpaperId: string;
  floorId: string;
  /** Which of the three campus shapes this player was assigned. Not a
   *  preference — it is fixed per player, so visiting someone shows a
   *  different building rather than a recolour of your own. */
  variantId: string;
}

export interface WalletBalances {
  bitAward: number;
  bitWord: number;
  bitPhrase: number;
}

export interface SchoolResponse {
  school: SchoolState;
  wallet: WalletBalances;
}

// The upgrade echoes the wallet back so the UI never has to guess what the
// price left behind — the server has just debited all three currencies
// atomically. Look changes are free and so return no wallet.
export interface SchoolMutationResponse {
  school: SchoolState;
  wallet?: WalletBalances;
}

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchSchool = async (token: string): Promise<SchoolResponse> => {
  const res = await axios.get(`${API_BASE}/api/progress/school`, auth(token));
  return res.data;
};

export interface PlayerSchoolResponse {
  school: SchoolState;
  nickname: string | null;
}

// Read-only snapshot of someone else's campus. No wallet: what another player
// can afford is not shown, matching the old room-visit endpoint.
export const fetchPlayerSchool = async (
  token: string,
  userId: string,
): Promise<PlayerSchoolResponse> => {
  const res = await axios.get(`${API_BASE}/api/progress/school/${userId}`, auth(token));
  return res.data;
};

// The one button. Deliberately sends no body: the server charges whatever the
// catalog says the next stage costs when the request lands, so there is no
// price, stage or discount for a client to name.
export const upgradeSchool = async (token: string): Promise<SchoolMutationResponse> => {
  const res = await axios.post(`${API_BASE}/api/progress/school/upgrade`, {}, auth(token));
  return res.data;
};

export interface SchoolLookPatch {
  layoutId?: string;
  wallpaperId?: string;
  floorId?: string;
}

// Free preferences — wallpaper, floor, desk arrangement. Still validated
// server-side against the stage that unlocks them.
export const setSchoolLook = async (
  token: string,
  patch: SchoolLookPatch,
): Promise<SchoolMutationResponse> => {
  const res = await axios.patch(`${API_BASE}/api/progress/school/look`, patch, auth(token));
  return res.data;
};
