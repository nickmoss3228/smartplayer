import { useEffect } from "react";
import { sendHeartbeat } from "../services/profileServices";

const HEARTBEAT_INTERVAL_MS = 45 * 1000;

// Bumps lastActiveAt on the backend on mount and every 45s while logged in,
// so other players see this user's "online" dot in the player list
// (see /api/user/players). Mirrors useListeningTimeSync's mount+interval shape.
export const useHeartbeat = (enabled: boolean): void => {
  useEffect(() => {
    if (!enabled) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const beat = () => sendHeartbeat(token).catch(() => {});

    beat();
    const id = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled]);
};
