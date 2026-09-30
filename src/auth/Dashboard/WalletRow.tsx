// components/Dashboard/WalletRow.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { fetchWallet } from "../../services/walletServices";
import { Wallet } from "../../types/Wallet";
import { CURRENCIES } from "../../config/currencies";

interface WalletRowProps {
  /** Inline chips for the Dashboard header instead of the full card grid */
  compact?: boolean;
}

const WalletRow: React.FC<WalletRowProps> = ({ compact = false }) => {
  const { t } = useTranslation();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const result = await fetchWallet(token);
      setWallet(result);
    } catch (err) {
      console.error("Failed to load wallet:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (compact) {
    return (
      <ul
        className="flex flex-wrap items-center gap-2"
        aria-label={t("dashboard.wallet.title")}
      >
        {CURRENCIES.map(({ key, label, icon: Icon, chipClasses }) => (
          <li
            key={key}
            title={label}
            className={`flex items-center gap-1.5 h-9 pl-2 pr-3 rounded-[3px] ${chipClasses}`}
          >
            <Icon size={16} />
            {loading ? (
              <span className="w-6 h-3.5 rounded-[3px] bg-current opacity-20 animate-pulse" />
            ) : (
              <span className="text-sm font-extrabold tabular-nums">
                {wallet?.[key] ?? 0}
              </span>
            )}
            <span className="sr-only">{label}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-card bg-white border border-line p-4 sm:p-5 animate-pulse"
          >
            <div className="w-9 h-9 rounded-tile bg-gray-200 mb-3" />
            <div className="h-6 bg-gray-200 rounded-[3px] w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="font-mono text-[10px] text-black/40 mb-3 uppercase tracking-[0.16em]">
        {t("dashboard.wallet.title")}
      </h2>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {CURRENCIES.map(({ key, label, icon: Icon, chipClasses }) => (
          <div
            key={key}
            className="bg-white rounded-card p-4 sm:p-5 flex flex-col gap-2
                       border border-line"
          >
            <div className={`w-9 h-9 rounded-tile flex items-center justify-center ${chipClasses}`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">
              {wallet?.[key] ?? 0}
            </p>
            <span className="text-xs font-semibold text-black/50">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WalletRow;
