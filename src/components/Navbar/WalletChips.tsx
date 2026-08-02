import { useCallback, useEffect, useState } from "react";
import { fetchWallet } from "../../services/walletServices";
import { Wallet } from "../../types/Wallet";
import { CURRENCIES } from "../../config/currencies";

// Compact read-only wallet display for the Navbar, next to the avatar button.
// Mirrors WalletRow.tsx's own-fetch-on-mount pattern — Navbar unmounts on the
// Player route (see Layout.tsx), so remounting here always re-fetches a fresh
// balance once the student navigates back from a session where they earned currency.
const WalletChips = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      setWallet(await fetchWallet(token));
    } catch (err) {
      console.error("Failed to load wallet:", err);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!wallet) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 pr-1">
      {CURRENCIES.map(({ key, label, icon: Icon, textClasses }) => (
        <div
          key={key}
          title={label}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100/80 text-xs font-semibold text-gray-700"
        >
          <Icon size={14} className={textClasses} />
          {wallet[key]}
        </div>
      ))}
    </div>
  );
};

export default WalletChips;
