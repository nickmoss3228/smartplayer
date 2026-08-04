import axios from "axios";
import { RoomState } from "../types/Room";
import { CharacterState } from "../types/Character";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface RoomResponse {
  room: RoomState;
  bitAward: number;
}

export const fetchRoom = async (token: string): Promise<RoomResponse> => {
  const res = await axios.get(`${API_BASE}/api/progress/room`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export interface PlayerRoomResponse {
  username: string;
  nickname: string;
  room: RoomState;
  character: CharacterState;
}

// Read-only snapshot of another player's room for the "visit" view.
export const fetchPlayerRoom = async (
  token: string,
  userId: string,
): Promise<PlayerRoomResponse> => {
  const res = await axios.get(`${API_BASE}/api/progress/room/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const purchaseItem = async (
  token: string,
  itemId: string,
): Promise<RoomResponse> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/room/purchase`,
    { itemId },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
};

// Re-selects an already-owned item into its slot — no currency spent, unlike
// purchaseItem. This is how a player switches back to something they own.
export const equipItem = async (
  token: string,
  itemId: string,
): Promise<{ room: RoomState }> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/room/equip`,
    { itemId },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
};
