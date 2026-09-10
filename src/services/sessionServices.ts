// services/sessionServices.ts — device management for the signed-in account.

import { api } from "./apiClient";
import { SessionDevice } from "../types/Auth";

/**
 * Free a device slot after a login was refused with DEVICE_LIMIT_REACHED.
 *
 * skipAuth: this is the one call in the app made by someone who has proved
 * their password but holds no token — that is the whole situation it exists
 * for. The ticket from the 409 body is the authorisation.
 *
 * skipAuthRedirect: an expired ticket comes back as 401, and that must show as
 * "this took too long, sign in again" on the login form, not tear down the
 * session of whoever is logged in in another tab.
 */
export const evictDevice = async (ticket: string, deviceId: string): Promise<void> => {
  await api.post(
    "/api/sessions/evict",
    { ticket, deviceId },
    { skipAuth: true, skipAuthRedirect: true }
  );
};

/** The devices currently signed in to my account. */
export const fetchMySessions = async (): Promise<SessionDevice[]> => {
  const response = await api.get<{ devices: SessionDevice[] }>("/api/sessions");
  return response.data.devices;
};

/** Sign out one of my own devices. */
export const revokeMyDevice = async (deviceId: string): Promise<void> => {
  await api.delete(`/api/sessions/${encodeURIComponent(deviceId)}`);
};

/** Keep this device, sign out every other one. */
export const revokeMyOtherDevices = async (): Promise<void> => {
  await api.post("/api/sessions/revoke-others");
};
