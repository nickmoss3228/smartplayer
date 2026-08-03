// context/WalletContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { fetchWallet } from "../services/walletServices";
import { Wallet } from "../types/Wallet";

interface WalletContextValue {
  wallet: Wallet | null;
  walletLoading: boolean;
  refreshWallet: () => Promise<void>;
  /** Push a wallet we already have (e.g. from an award-endpoint response)
   *  straight into the cache, without a round-trip back to the server. */
  setWalletDirect: (w: Wallet) => void;
}

const WalletContext = createContext<WalletContextValue>({
  wallet: null,
  walletLoading: true,
  refreshWallet: async () => {},
  setWalletDirect: () => {},
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

  const loadWallet = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) {
      setWallet(null);
      setWalletLoading(false);
      return;
    }
    try {
      setWallet(await fetchWallet(token));
    } catch (err) {
      console.error("[WalletContext] Failed to load wallet:", err);
    } finally {
      setWalletLoading(false);
    }
  }, [user]);

  // Re-fetch whenever the logged-in user changes (login/logout/switch)
  useEffect(() => {
    setWalletLoading(true);
    loadWallet();
  }, [loadWallet]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        walletLoading,
        refreshWallet: loadWallet,
        setWalletDirect: setWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
