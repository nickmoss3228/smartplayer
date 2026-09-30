// modules/school/WalletBadge.tsx
//
// What the school has to spend, on screen the whole time — under the clock, in
// every mode. Rooms and the outside cost coins, and a price means nothing if
// the balance it is measured against is two taps away in the navbar.
//
// Each figure gives a short pop when it changes, so a purchase or a reward is
// seen landing rather than only being different next time you look.

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CURRENCIES } from "../../config/currencies";
import { WalletBalances } from "../../services/schoolServices";

const Figure = ({ value, className }: { value: number; className: string }) => {
  const last = useRef(value);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (last.current === value) return;
    last.current = value;
    setPop(true);
    const id = window.setTimeout(() => setPop(false), 380);
    return () => window.clearTimeout(id);
  }, [value]);
  return (
    <span
      className={`text-[13px] font-bold tabular-nums leading-none transition-transform duration-300 ${className} ${
        pop ? "scale-125" : "scale-100"
      }`}
    >
      {value.toLocaleString()}
    </span>
  );
};

export const WalletBadge = ({ wallet }: { wallet: WalletBalances }) => {
  const { t } = useTranslation();
  return (
    <div
      aria-label={t("school.wallet.label")}
      className="inline-flex items-center gap-2.5 rounded-full bg-white/90 py-1.5 pl-2.5 pr-3 shadow-sm"
    >
      {CURRENCIES.map(({ key, icon: Icon, textClasses, label }) => (
        <span key={key} className="inline-flex items-center gap-1" title={label}>
          <Icon size={14} className={textClasses} />
          <Figure value={wallet[key] ?? 0} className={textClasses} />
        </span>
      ))}
    </div>
  );
};
