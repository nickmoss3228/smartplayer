import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoSparkles } from "react-icons/io5";
import { CURRENCIES } from "../../config/currencies";
import { RewardBonus } from "../../types/Wallet";

const DISMISS_MS = 3500;

interface BonusToastProps {
  bonus: RewardBonus | null;
}

// Celebratory card for a surprise reward the server rolled. Rendered by
// WalletProvider, which sits above the Router, so no router hooks in here.
// A new bonus object replaces the visible one and restarts the timer.
const BonusToast: React.FC<BonusToastProps> = ({ bonus }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!bonus) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), DISMISS_MS);
    return () => clearTimeout(timer);
  }, [bonus]);

  if (!bonus || !visible) return null;

  const currency = CURRENCIES.find((c) => c.key === bonus.currency);
  const CurrencyIcon = currency?.icon;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[1000] flex justify-center px-4">
      <button
        type="button"
        role="status"
        aria-live="polite"
        onClick={() => setVisible(false)}
        className="bonus-toast-in pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-left shadow-lg motion-reduce:animate-none"
      >
        <IoSparkles size={22} className="shrink-0 text-amber-500" aria-hidden="true" />
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-extrabold text-amber-700">
            {t(`rewards.bonus.${bonus.kind}`)}
          </span>
          <span className="text-xs text-amber-700/80">
            {bonus.kind === "goldenWord" && (bonus.count ?? 1) > 1
              ? t("rewards.bonus.goldenWordsSub", { count: bonus.count })
              : t(`rewards.bonus.${bonus.kind}Sub`, { word: bonus.word ?? "" })}
          </span>
        </span>
        <span
          className={`ml-1 inline-flex shrink-0 items-center gap-1 text-base font-extrabold tabular-nums ${currency?.textClasses ?? "text-amber-600"}`}
        >
          {CurrencyIcon && <CurrencyIcon size={18} />}+{bonus.amount}
        </span>
      </button>
    </div>
  );
};

export default BonusToast;
