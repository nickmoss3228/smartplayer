import { useCallback, useEffect, useState } from "react";
import {
  fetchRoom,
  purchaseItem as purchaseItemRequest,
  equipItem as equipItemRequest,
  toggleLights as toggleLightsRequest,
  updateFloorPlacement,
  updateWallPlacement,
} from "../../services/roomServices";
import { RoomState } from "../../types/Room";
import { DEFAULT_PLACEMENT, FloorSlotKey, WallSlotKey } from "../../config/roomLayout";
import { useWallet } from "../../context/WalletContext";

interface PurchaseResult {
  ok: boolean;
  message?: string;
}

// Back-fills any missing placement slots with the shared defaults — guards
// against a backend that hasn't picked up the room.placement schema field
// yet (e.g. mid-deploy), so the scene falls back to the fixed layout for
// those slots instead of crashing on `placement[slot]` being undefined.
function normalizeRoom(room: RoomState): RoomState {
  return { ...room, placement: { ...DEFAULT_PLACEMENT, ...(room.placement ?? {}) } };
}

interface UseRoomStateResult {
  room: RoomState | null;
  bitAward: number;
  loading: boolean;
  error: string | null;
  buy: (itemId: string) => Promise<PurchaseResult>;
  equip: (itemId: string) => Promise<PurchaseResult>;
  toggleLights: () => Promise<void>;
  moveFloorItem: (slot: FloorSlotKey, x: number, z: number, rotation: number) => Promise<boolean>;
  moveWallItem: (slot: WallSlotKey, along: number, height: number) => Promise<boolean>;
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
      setRoom(normalizeRoom(data.room));
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
      setRoom(normalizeRoom(data.room));
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
      setRoom(normalizeRoom(data.room));
      return { ok: true };
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Equip failed";
      return { ok: false, message };
    }
  }, []);

  const toggleLights = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const data = await toggleLightsRequest(token);
      setRoom(normalizeRoom(data.room));
    } catch (err) {
      console.error("Failed to toggle room lights:", err);
    }
  }, []);

  // Both return whether the save actually stuck — the client already
  // clamps/overlap-checks before calling these (see roomLayout.ts), so a
  // false here should be rare, but the caller (RoomScene's drag handler)
  // uses it to snap the item back to its last saved spot if the server
  // disagreed (e.g. a race with another tab).
  const moveFloorItem = useCallback(
    async (slot: FloorSlotKey, x: number, z: number, rotation: number): Promise<boolean> => {
      const token = localStorage.getItem("token");
      if (!token) return false;
      try {
        const data = await updateFloorPlacement(token, slot, x, z, rotation);
        setRoom(normalizeRoom(data.room));
        return true;
      } catch (err) {
        console.error("Failed to move item:", err);
        return false;
      }
    },
    [],
  );

  const moveWallItem = useCallback(
    async (slot: WallSlotKey, along: number, height: number): Promise<boolean> => {
      const token = localStorage.getItem("token");
      if (!token) return false;
      try {
        const data = await updateWallPlacement(token, slot, along, height);
        setRoom(normalizeRoom(data.room));
        return true;
      } catch (err) {
        console.error("Failed to move item:", err);
        return false;
      }
    },
    [],
  );

  return { room, bitAward, loading, error, buy, equip, toggleLights, moveFloorItem, moveWallItem };
}
