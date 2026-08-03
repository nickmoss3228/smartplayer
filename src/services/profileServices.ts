// services/profileService.ts
import axios from "axios";
import { UserProfile } from "../types/Dashboard";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const fetchProfile = async (token: string): Promise<UserProfile> => {
  const res = await axios.get(`${API_BASE}/api/user/profile`, {
    headers: authHeaders(token),
  });
  return res.data;
};

export const updateProfile = async (
  token: string,
  updates: { nickname?: string; avatar?: string }
): Promise<UserProfile> => {
  const res = await axios.patch(`${API_BASE}/api/user/profile`, updates, {
    headers: authHeaders(token),
  });
  return res.data;
};

export const sendHeartbeat = async (token: string): Promise<void> => {
  await axios.patch(`${API_BASE}/api/user/heartbeat`, null, {
    headers: authHeaders(token),
  });
};

export interface PlayerListItem {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  online: boolean;
}

interface SearchPlayersResponse {
  players: PlayerListItem[];
}

// Looks up a specific player by username/nickname (partial match) or exact
// email — there's no endpoint to browse the full user roster.
export const searchPlayers = async (
  token: string,
  query: string
): Promise<SearchPlayersResponse> => {
  const res = await axios.get(`${API_BASE}/api/user/search`, {
    headers: authHeaders(token),
    params: { q: query },
  });
  return res.data;
};