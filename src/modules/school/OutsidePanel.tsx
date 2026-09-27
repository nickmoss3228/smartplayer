// modules/school/OutsidePanel.tsx
//
// The "Outside" tab of the look drawer: the school's name on the sign over
// the gate, and the facade, roof and trim it wears.
//
// Unlike the free looks on the "Inside" tab, outside styles are BOUGHT — once
// each, and then worn or swapped back for nothing. A style you do not own yet
// shows its price; tapping it asks once, right there under the swatches, and
// buying puts it straight on. The server decides everything that matters (the
// price, whether you own it, whether a name will fit on the sign); this only
// asks.

import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoLockClosed } from "react-icons/io5";
import {
  DEFAULT_EXTERIOR,
  EXTERIOR_LABELS,
  EXTERIOR_SLOTS,
  EXTERIOR_STYLES,
  ExteriorSlot,
  ExteriorStyle,
  SCHOOL_NAME_MAX,
  cleanSchoolName,
} from "../../config/schoolCatalog";
import { CURRENCIES } from "../../config/currencies";
import { SchoolExterior, WalletBalances } from "../../services/schoolServices";
import { swatchFor } from "./exterior";

const Price = ({ style, wallet }: { style: ExteriorStyle; wallet: WalletBalances }) => {
  const meta = CURRENCIES.find((c) => c.key === style.currency) ?? CURRENCIES[0];
  const Icon = meta.icon;
  const short = wallet[style.currency] < style.price;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums ${
        short ? "text-rose-500" : meta.textClasses
      }`}
    >
      <Icon size={11} />
      {style.price}
    </span>
  );
};

export const OutsidePanel = ({
  exterior,
  name,
  wallet,
  busy,
  onWear,
  onBuy,
  onName,
}: {
  exterior: SchoolExterior | undefined;
  name: string | null | undefined;
  wallet: WalletBalances;
  busy: boolean;
  onWear: (slot: ExteriorSlot, id: string) => void;
  onBuy: (id: string) => void;
  onName: (name: string | null) => void;
}) => {
  const { t } = useTranslation();
  const owned = exterior?.owned ?? [];
  const worn: Record<ExteriorSlot, string> = {
    facade: exterior?.facadeId ?? DEFAULT_EXTERIOR.facade,
    roof: exterior?.roofId ?? DEFAULT_EXTERIOR.roof,
    trim: exterior?.trimId ?? DEFAULT_EXTERIOR.trim,
  };
  // The style being considered for purchase. Cleared by buying it, or by
  // tapping anything else.
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState(name ?? "");
  useEffect(() => setDraft(name ?? ""), [name]);

  const label = (id: string) => t(`school.exterior.styles.${id}`, EXTERIOR_LABELS[id] ?? id);
  const cleaned = cleanSchoolName(draft);
  const nameChanged = (cleaned ?? "") !== (name ?? "");

  const submitName = (e: FormEvent) => {
    e.preventDefault();
    if (cleaned && nameChanged) onName(cleaned);
  };

  return (
    <div>
      <form onSubmit={submitName} className="mb-5">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/40 mb-2">
          {t("school.exterior.name")}
        </h3>
        <div className="flex gap-2">
          <input
            value={draft}
            maxLength={SCHOOL_NAME_MAX}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("school.exterior.namePlaceholder")}
            aria-label={t("school.exterior.name")}
            className="min-w-0 flex-1 rounded-[3px] border-2 border-black/10 px-2.5 py-1.5 text-sm text-black/80 focus:border-gray-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !cleaned || !nameChanged}
            className="shrink-0 rounded-[3px] bg-gray-900 px-3 text-xs font-bold text-white active:scale-95 disabled:opacity-40"
          >
            {t("school.exterior.nameSave")}
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className={`text-[10px] ${draft && !cleaned ? "text-rose-500" : "text-black/35"}`}>
            {t("school.exterior.nameRule", { max: SCHOOL_NAME_MAX })}
          </span>
          {name && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onName(null)}
              className="shrink-0 text-[10px] font-bold text-black/45 underline active:text-black/70"
            >
              {t("school.exterior.nameClear")}
            </button>
          )}
        </div>
      </form>

      {EXTERIOR_SLOTS.map((slot) => {
        const styles = EXTERIOR_STYLES.filter((s) => s.slot === slot);
        const pendingStyle = styles.find((s) => s.id === pending) ?? null;
        return (
          <div key={slot} className="mb-5">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/40 mb-2">
              {t(`school.exterior.slots.${slot}`)}
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {styles.map((style) => {
                const mine = style.price === 0 || owned.includes(style.id);
                const wearing = worn[slot] === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    disabled={busy}
                    title={label(style.id)}
                    aria-label={label(style.id)}
                    onClick={() => {
                      if (mine) {
                        setPending(null);
                        if (!wearing) onWear(slot, style.id);
                      } else {
                        setPending(pending === style.id ? null : style.id);
                      }
                    }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <span
                      className={`relative block w-full aspect-square rounded-[3px] border-2 transition-transform ${
                        wearing
                          ? "border-gray-900 scale-105"
                          : pending === style.id
                            ? "border-amber-400"
                            : "border-black/10 active:scale-95"
                      }`}
                      style={{ background: swatchFor(style.id) }}
                    >
                      {!mine && (
                        // On a dark badge: a white lock vanished on the pale
                        // swatches, which are exactly the ones worth a look.
                        <span className="absolute inset-0 m-auto flex h-5 w-5 items-center justify-center rounded-full bg-black/45">
                          <IoLockClosed size={11} className="text-white" />
                        </span>
                      )}
                    </span>
                    {mine ? (
                      <span className="text-[10px] text-black/45 leading-tight truncate w-full text-center">
                        {label(style.id)}
                      </span>
                    ) : (
                      <Price style={style} wallet={wallet} />
                    )}
                  </button>
                );
              })}
            </div>
            {pendingStyle && (
              <div className="mt-2 flex items-center gap-2 rounded-[3px] bg-gray-100 px-2.5 py-2">
                <span className="min-w-0 flex-1 text-[12px] font-bold text-black/75 truncate">
                  {label(pendingStyle.id)}
                </span>
                <Price style={pendingStyle} wallet={wallet} />
                <button
                  type="button"
                  disabled={busy || wallet[pendingStyle.currency] < pendingStyle.price}
                  onClick={() => {
                    onBuy(pendingStyle.id);
                    setPending(null);
                  }}
                  className="shrink-0 rounded-[3px] bg-gray-900 px-3 py-1 text-xs font-bold text-white active:scale-95 disabled:opacity-40"
                >
                  {t("school.exterior.buy")}
                </button>
              </div>
            )}
          </div>
        );
      })}

      <p className="text-[11px] text-black/35 leading-relaxed">{t("school.exterior.hint")}</p>
    </div>
  );
};
