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