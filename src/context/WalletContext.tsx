// context/WalletContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { fetchWallet } from "../services/walletServices";
import { RewardBonus, Wallet } from "../types/Wallet";
import BonusToast from "../components/Rewards/BonusToast";

interface WalletContextValue {
  wallet: Wallet | null;
  walletLoading: boolean;
  refreshWallet: () => Promise<void>;
  /** Push a wallet we already have (e.g. from an award-endpoint response)
   *  straight into the cache, without a round-trip back to the server. */
  setWalletDirect: (w: Wallet) => void;
  /** Show the celebratory toast for a server-rolled bonus; null is a no-op. */
  announceBonus: (bonus: RewardBonus | null | undefined) => void;
}

const WalletContext = createContext<WalletContextValue>({
  wallet: null,
  walletLoading: true,
  refreshWallet: async () => {},
  setWalletDirect: () => {},
  announceBonus: () => {},
});

// Mounted once above the Router (see App.tsx), so it survives navigating in
// and out of the Player route instead of re-fetching every time — that's
// what let WalletChips show its cached value instantly instead of flashing
// a loading state each time the navbar/dropdown remounts. Because it no
// longer naturally remounts-and-refetches on navigation, every place that
// awards currency (quiz pass, vocab quiz, phrase repeats) must push its
// award-response wallet into setWalletDirect so the display doesn't go stale.
export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const userId = user ? user.id : null;
  // Lets an in-flight request notice the account changed under it.
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;

  const loadWallet = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !userId) {
      setWallet(null);
      setWalletLoading(false);
      return;
    }
    try {
      const fetched = await fetchWallet(token);
      // Another account is signed in by now; this wallet is not theirs.
      if (userIdRef.current !== userId) return;
      setWallet(fetched);
    } catch (err) {
      console.error("[WalletContext] Failed to load wallet:", err);
    } finally {
      if (userIdRef.current === userId) setWalletLoading(false);
    }
  }, [userId]);

  // Re-fetch whenever the logged-in user changes (login/logout/switch)
  useEffect(() => {
    setWalletLoading(true);
    loadWallet();
  }, [loadWallet]);

  // The latest surprise bonus; `id` re-keys the toast so a new one replaces
  // the visible one (and replays its pop-in) instead of just updating it.
  const [bonusShown, setBonusShown] = useState<{ id: number; bonus: RewardBonus } | null>(null);
  const announceBonus = useCallback((bonus: RewardBonus | null | undefined) => {
    if (!bonus) return;
    setBonusShown((prev) => ({ id: (prev?.id ?? 0) + 1, bonus }));
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        walletLoading,
        refreshWallet: loadWallet,
        setWalletDirect: setWallet,
        announceBonus,
      }}
    >
      {children}
      <BonusToast key={bonusShown?.id ?? 0} bonus={bonusShown?.bonus ?? null} />
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
