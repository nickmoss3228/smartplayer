// components/Dashboard/WalletRow.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { fetchWallet } from "../../services/walletServices";
import { Wallet } from "../../types/Wallet";
import { CURRENCIES } from "../../config/currencies";

const WalletRow: React.FC = () => {
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

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[3px] bg-white border border-line p-4 sm:p-5 animate-pulse"
          >
            <div className="w-9 h-9 rounded-[3px] bg-gray-200 mb-3" />
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
            className="bg-white rounded-[3px] p-4 sm:p-5 flex flex-col gap-2
                       border border-line"
          >
            <div className={`w-9 h-9 rounded-[3px] flex items-center justify-center ${chipClasses}`}>
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
