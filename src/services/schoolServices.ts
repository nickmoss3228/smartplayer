import axios from "axios";
import { API_BASE } from "./apiClient";

// Wire format for the Dream School. `placed` is a flat "<roomId>:<slot>" ->
// itemId record rather than a nested object — see placementKey() in
// config/schoolCatalog.ts, and the Map on the server that produces it.
export interface SchoolState {
  unlockedRoomIds: string[];
  ownedItemIds: string[];
  ownedActionIds: string[];
  placed: Record<string, string>;
  focusedRoomId: string;
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

// Purchases echo back the wallet so the UI never has to guess what a price
// left behind — the server has just decremented it atomically.
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

// Read-only snapshot of someone else's school. No wallet: what another player
// can afford is not shown, matching the old room-visit endpoint.
export const fetchPlayerSchool = async (
  token: string,
  userId: string,
): Promise<PlayerSchoolResponse> => {
  const res = await axios.get(`${API_BASE}/api/progress/school/${userId}`, auth(token));
  return res.data;
};

export const unlockRoom = async (
  token: string,
  roomId: string,
): Promise<SchoolMutationResponse> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/school/unlock-room`,
    { roomId },
    auth(token),
  );
  return res.data;
};

export const buyItem = async (
  token: string,
  itemId: string,
): Promise<SchoolMutationResponse> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/school/buy-item`,
    { itemId },
    auth(token),
  );
  return res.data;
};

export const placeItem = async (
  token: string,
  itemId: string,
): Promise<SchoolMutationResponse> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/school/place-item`,
    { itemId },
    auth(token),
  );
  return res.data;
};

export const buyAction = async (
  token: string,
  actionId: string,
): Promise<SchoolMutationResponse> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/school/buy-action`,
    { actionId },
    auth(token),
  );
  return res.data;
};

export const focusRoom = async (
  token: string,
  roomId: string,
): Promise<SchoolMutationResponse> => {
  const res = await axios.patch(
    `${API_BASE}/api/progress/school/focus`,
    { roomId },
    auth(token),
  );
  return res.data;
};
