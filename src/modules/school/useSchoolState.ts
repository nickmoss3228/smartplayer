import { useCallback, useEffect, useState } from "react";
import {
  SchoolState,
  SchoolLookPatch,
  WalletBalances,
  fetchSchool,
  upgradeSchool as apiUpgrade,
  setSchoolLook as apiSetLook,
} from "../../services/schoolServices";
import { fetchLearnedWords } from "../../services/vocabProgressServices";
import { useWallet } from "../../context/WalletContext";

export interface SchoolActionResult {
  ok: boolean;
  message?: string;
}

interface UseSchoolStateResult {
  school: SchoolState | null;
  wallet: WalletBalances;
  /** Feeds the speech bubbles and the chalkboard. Empty is a fine state. */
  learnedWords: string[];
  loading: boolean;
  error: string | null;
  upgrade: () => Promise<SchoolActionResult>;
  setLook: (patch: SchoolLookPatch) => Promise<SchoolActionResult>;
}

const EMPTY_WALLET: WalletBalances = { bitAward: 0, bitWord: 0, bitPhrase: 0 };

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
  const [learnedWords, setLearnedWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setWalletDirect } = useWallet();

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

    // Vocabulary is decoration, not data the school needs to render — a failure
    // here means generic chatter instead of your own words, which is exactly
    // what a brand-new player sees anyway. So it never blocks or errors out.
    fetchLearnedWords(token)
      .then((words) => {
        if (!cancelled) setLearnedWords(words ?? []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // The server returns the authoritative school and wallet on every mutation,
  // so nothing is optimistically applied here. A stage that appeared and then
  // vanished because the purchase was declined would be far worse than the
  // half-second the round-trip costs.
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
        if (data.wallet) {
          setWallet(data.wallet);
          // The navbar's chips read from WalletContext, which has no idea an
          // upgrade just happened — push the balance it charged us straight in
          // rather than leaving a stale number two pixels from the button.
          setWalletDirect(data.wallet);
        }
        return { ok: true };
      } catch (err) {
        return { ok: false, message: extractMessage(err, fallbackMessage) };
      }
    },
    [setWalletDirect],
  );

  const upgrade = useCallback(
    () => run((t) => apiUpgrade(t), "Could not upgrade the school"),
    [run],
  );

  const setLook = useCallback(
    (patch: SchoolLookPatch) => run((t) => apiSetLook(t, patch), "Could not change that"),
    [run],
  );

  return { school, wallet, learnedWords, loading, error, upgrade, setLook };
}
