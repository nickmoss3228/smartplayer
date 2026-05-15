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

// Returns start/stop functions to be called from the player
export const useListeningTimer = () => {
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef   = useRef<number | null>(null);
  const isRunningRef   = useRef(false);

  const startTimer = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    startTimeRef.current = Date.now();

    // Save accumulated seconds every 5s to avoid data loss on tab close
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const previous = getTotalListeningSeconds();
        saveTotalSeconds(previous + elapsed);
        // Reset startTime so we don't double-count on next tick
        startTimeRef.current = Date.now();
      }
    }, 5000);
  }, []);

  const stopTimer = useCallback(() => {
    if (!isRunningRef.current) return;
    isRunningRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Flush remaining seconds
    if (startTimeRef.current !== null) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const previous = getTotalListeningSeconds();
      saveTotalSeconds(previous + elapsed);
      startTimeRef.current = null;
    }
  }, []);

  // Safety flush on unmount
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  return { startTimer, stopTimer };
};