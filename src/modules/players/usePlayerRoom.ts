import { useCallback, useEffect, useState } from "react";
import {
  fetchPlayerRoom,
  PlayerRoomResponse,
} from "../../services/roomServices";
import { DEFAULT_PLACEMENT } from "../../config/roomLayout";

interface UsePlayerRoomResult {
  data: PlayerRoomResponse | null;
  loading: boolean;
  error: string | null;
}

// Back-fills any missing placement slots with the shared defaults — guards
// against a backend that hasn't picked up the room.placement schema field
// yet, same as useRoomState's normalizeRoom.
function normalizeRoom(result: PlayerRoomResponse): PlayerRoomResponse {
  return {
    ...result,
    room: { ...result.room, placement: { ...DEFAULT_PLACEMENT, ...(result.room.placement ?? {}) } },
  };
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
      setData(normalizeRoom(result));
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
