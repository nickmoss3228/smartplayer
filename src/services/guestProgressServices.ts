// services/guestProgressServices.ts
import axios from "axios";
import type { GuestMigrationPayload } from "./guestProgress";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const migrateGuestProgress = async (
  token: string,
  payload: GuestMigrationPayload,
): Promise<{ migrated: boolean }> => {
  const res = await axios.post(`${API_BASE}/api/progress/migrate-guest`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
