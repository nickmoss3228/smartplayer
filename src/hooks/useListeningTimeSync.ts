import { useEffect } from "react";
import { syncListeningTime } from "../services/achievementServices";
import { getTotalListeningSeconds } from "./useListeningTimer";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

// Pushes the local listening-time counter to the backend on mount and every 5
// minutes. Safe to mount from multiple places (Dashboard, Player) at once —
// each just re-sends the current running total, and the backend only ever
// keeps the highest value it's seen.
export const useListeningTimeSync = (enabled: boolean): void => {
  useEffect(() => {
    if (!enabled) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const sync = () =>
      syncListeningTime(token, getTotalListeningSeconds()).catch(() => {});

    sync();
    const id = setInterval(sync, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled]);
};
