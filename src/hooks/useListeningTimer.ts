// hooks/useListeningTimer.ts
import { useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "listeningTimeSconds";

export const getTotalListeningSeconds = (): number => {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
};

const saveTotalSeconds = (seconds: number): void => {
  try {
    localStorage.setItem(STORAGE_KEY, seconds.toString());
  } catch {
    console.error("Failed to save listening time");
  }
};

// Exposed so the auth flow can (re)seed the counter with the server's
// authoritative total on login, and wipe it on logout — otherwise this key
// is global and would bleed a previous account's time into the next one
// signed in on the same browser.
export const setTotalListeningSeconds = saveTotalSeconds;

export const clearListeningTime = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.error("Failed to clear listening time");
  }
};

export const formatListeningTime = (totalSeconds: number): string => {
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs    = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

// Two tabs playing at once would each add their own elapsed time to the same
// shared total and count it twice. A lease in localStorage lets only one tab
// count at a time: the tab that most recently pressed play owns it, and the
// others drop their elapsed time until it is released or expires (a crashed
// tab never releases it, hence the expiry).
const LEASE_KEY = "listeningTimerLease";
const LEASE_MS = 12_000; // more than two 5 s ticks, so a live owner never lapses

const newId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const writeLease = (owner: string): void => {
  try {
    localStorage.setItem(LEASE_KEY, JSON.stringify({ owner, until: Date.now() + LEASE_MS }));
  } catch {
    // storage unavailable (private mode): carry on without a lease
  }
};

// True when another live tab holds the lease. Any storage or parse problem
// means "no one else", so counting behaves as it did before the lease.
const isLeasedByOther = (me: string): boolean => {
  try {
    const raw = localStorage.getItem(LEASE_KEY);
    if (!raw) return false;
    const lease = JSON.parse(raw) as { owner?: unknown; until?: unknown };
    return (
      typeof lease.owner === "string" &&
      lease.owner !== me &&
      typeof lease.until === "number" &&
      lease.until > Date.now()
    );
  } catch {
    return false;
  }
};

// Returns start/stop functions to be called from the player
export const useListeningTimer = () => {
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef   = useRef<number | null>(null);
  const isRunningRef   = useRef(false);
  const idRef          = useRef<string>("");
  if (!idRef.current) idRef.current = newId();

  // Adds the time since the last flush, unless another tab owns the lease.
  const flush = useCallback(() => {
    if (startTimeRef.current === null) return;
    const now = Date.now();
    const elapsed = Math.floor((now - startTimeRef.current) / 1000);
    if (!isLeasedByOther(idRef.current)) {
      writeLease(idRef.current);
      saveTotalSeconds(getTotalListeningSeconds() + elapsed);
    }
    // Reset startTime so we don't double-count on next tick
    startTimeRef.current = now;
  }, []);

  const startTimer = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    startTimeRef.current = Date.now();
    // The most recent tab to start playing takes the lease.
    writeLease(idRef.current);

    // Save accumulated seconds every 5s to avoid data loss on tab close
    intervalRef.current = setInterval(flush, 5000);
  }, [flush]);

  const stopTimer = useCallback(() => {
    if (!isRunningRef.current) return;
    isRunningRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Flush remaining seconds
    flush();
    startTimeRef.current = null;

    try {
      const raw = localStorage.getItem(LEASE_KEY);
      if (raw && JSON.parse(raw)?.owner === idRef.current) {
        localStorage.removeItem(LEASE_KEY);
      }
    } catch {
      // ignore
    }
  }, [flush]);

  // Safety flush on unmount
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  return { startTimer, stopTimer };
};
