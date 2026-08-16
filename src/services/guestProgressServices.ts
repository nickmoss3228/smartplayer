// services/guestProgressServices.ts
import axios from "axios";
import type { GuestMigrationPayload } from "./guestProgress";
import { API_BASE } from "./apiClient";


export const migrateGuestProgress = async (
  token: string,
  payload: GuestMigrationPayload,
): Promise<{ migrated: boolean }> => {
  const res = await axios.post(`${API_BASE}/api/progress/migrate-guest`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
