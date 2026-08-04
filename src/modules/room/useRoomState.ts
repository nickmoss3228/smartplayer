import { useCallback, useEffect, useState } from "react";
import {
  fetchRoom,
  purchaseItem as purchaseItemRequest,
  equipItem as equipItemRequest,
} from "../../services/roomServices";
import { RoomState } from "../../types/Room";
import { useWallet } from "../../context/WalletContext";

interface PurchaseResult {
  ok: boolean;
  message?: string;
}

interface UseRoomStateResult {
  room: RoomState | null;
  bitAward: number;
  loading: boolean;
  error: string | null;
  buy: (itemId: string) => Promise<PurchaseResult>;
  equip: (itemId: string) => Promise<PurchaseResult>;
}

export function useRoomState(): UseRoomStateResult {
  const { wallet, setWalletDirect } = useWallet();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [bitAward, setBitAward] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchRoom(token);
      setRoom(data.room);
      setBitAward(data.bitAward);
    } catch (err) {
      console.error("Failed to load room:", err);
      setError("Failed to load room");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buy = useCallback(async (itemId: string): Promise<PurchaseResult> => {
    const token = localStorage.getItem("token");
    if (!token) return { ok: false, message: "Not logged in" };
    try {
      const data = await purchaseItemRequest(token, itemId);
      setRoom(data.room);
      setBitAward(data.bitAward);
      setWalletDirect({ bitWord: 0, bitPhrase: 0, ...wallet, bitAward: data.bitAward });
      return { ok: true };
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Purchase failed";
      return { ok: false, message };
    }
  }, [wallet, setWalletDirect]);

  const equip = useCallback(async (itemId: string): Promise<PurchaseResult> => {
    const token = localStorage.getItem("token");
    if (!token) return { ok: false, message: "Not logged in" };
    try {
      const data = await equipItemRequest(token, itemId);
      setRoom(data.room);
      return { ok: true };
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Equip failed";
      return { ok: false, message };
    }
  }, []);

  return { room, bitAward, loading, error, buy, equip };
}
