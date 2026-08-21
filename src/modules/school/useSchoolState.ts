import { useCallback, useEffect, useState } from "react";
import {
  SchoolState,
  WalletBalances,
  fetchSchool,
  unlockRoom as apiUnlockRoom,
  buyItem as apiBuyItem,
  placeItem as apiPlaceItem,
  buyAction as apiBuyAction,
  focusRoom as apiFocusRoom,
} from "../../services/schoolServices";

export interface SchoolActionResult {
  ok: boolean;
  message?: string;
}

interface UseSchoolStateResult {
  school: SchoolState | null;
  wallet: WalletBalances;
  loading: boolean;
  error: string | null;
  unlockRoom: (roomId: string) => Promise<SchoolActionResult>;
  buyItem: (itemId: string) => Promise<SchoolActionResult>;
  placeItem: (itemId: string) => Promise<SchoolActionResult>;
  buyAction: (actionId: string) => Promise<SchoolActionResult>;
  focusRoom: (roomId: string) => Promise<SchoolActionResult>;
}

const EMPTY_WALLET: WalletBalances = { bitAward: 0, bitWord: 0, bitPhrase: 0 };

// Every mutation returns the authoritative school (and, for purchases, the
// wallet) so there is exactly one source of truth for balances: the server.
// Nothing is optimistically decremented locally — a failed purchase that had
// already subtracted coins on screen is far more confusing than a brief wait.
function extractMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  return fallback;
}

export function useSchoolState(): UseSchoolStateResult {
  const [school, setSchool] = useState<SchoolState | null>(null);
  const [wallet, setWallet] = useState<WalletBalances>(EMPTY_WALLET);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not logged in");
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchSchool(token)
      .then((data) => {
        if (cancelled) return;
        setSchool(data.school);
        setWallet(data.wallet ?? EMPTY_WALLET);
      })
      .catch((err) => {
        if (!cancelled) setError(extractMessage(err, "Could not load your school"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // All five mutations differ only in which endpoint they call, so they share
  // one wrapper rather than repeating the token/error/state dance five times.
  const run = useCallback(
    async (
      call: (token: string) => Promise<{ school: SchoolState; wallet?: WalletBalances }>,
      fallbackMessage: string,
    ): Promise<SchoolActionResult> => {
      const token = localStorage.getItem("token");
      if (!token) return { ok: false, message: "Not logged in" };
      try {
        const data = await call(token);
        setSchool(data.school);
        if (data.wallet) setWallet(data.wallet);
        return { ok: true };
      } catch (err) {
        return { ok: false, message: extractMessage(err, fallbackMessage) };
      }
    },
    [],
  );

  const unlockRoom = useCallback(
    (roomId: string) => run((t) => apiUnlockRoom(t, roomId), "Could not unlock that room"),
    [run],
  );
  const buyItem = useCallback(
    (itemId: string) => run((t) => apiBuyItem(t, itemId), "Could not buy that"),
    [run],
  );
  const placeItem = useCallback(
    (itemId: string) => run((t) => apiPlaceItem(t, itemId), "Could not place that"),
    [run],
  );
  const buyAction = useCallback(
    (actionId: string) => run((t) => apiBuyAction(t, actionId), "Could not buy that action"),
    [run],
  );
  const focusRoom = useCallback(
    (roomId: string) => run((t) => apiFocusRoom(t, roomId), "Could not open that room"),
    [run],
  );

  return { school, wallet, loading, error, unlockRoom, buyItem, placeItem, buyAction, focusRoom };
}
