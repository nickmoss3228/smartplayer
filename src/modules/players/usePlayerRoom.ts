import { useCallback, useEffect, useState } from "react";
import {
  fetchPlayerRoom,
  PlayerRoomResponse,
} from "../../services/roomServices";

interface UsePlayerRoomResult {
  data: PlayerRoomResponse | null;
  loading: boolean;
  error: string | null;
}

export function usePlayerRoom(userId: string | undefined): UsePlayerRoomResult {
  const [data, setData] = useState<PlayerRoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPlayerRoom(token, userId);
      setData(result);
    } catch (err) {
      console.error("Failed to load player room:", err);
      setError("Failed to load player room");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error };
}
