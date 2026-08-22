// components/Dashboard/AchievementDetailModal.tsx
//
// The card shows where you are on the ladder; this shows the whole ladder —
// every tier, its threshold, whether it is earned, and exactly how much is left
// on the one in progress. Laid out vertically with a connecting spine, so the
// rungs read as a climb rather than a list.

import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { IoCheckmark, IoClose, IoLockClosed, IoSparkles } from "react-icons/io5";
import {
  AchievementCategory,
  TIER_COLORS,
  formatAmount,
  formatValue,
  getHighestEarnedTier,
  getNextTier,
  getRungFills,
  getTierLabel,
} from "../../config/achievementsConfig";

interface Props {
  category: AchievementCategory;
  value: number;
  onClose: () => void;
}

const AchievementDetailModal: React.FC<Props> = ({ category, value, onClose }) => {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const Icon = category.icon;

  const rungs = getRungFills(category.tiers, value);
  const highest = getHighestEarnedTier(category.tiers, value);
  const nextTier = getNextTier(category.tiers, value);
  const earnedCount = rungs.filter((r) => r.state === "earned").length;
  const style = highest ? TIER_COLORS[highest.tier] : null;
  const headerInk = style?.hex ?? "#898781";

  const titleId = `achievement-${category.key}-title`;

  // Escape to close, focus the close button on open, and hand focus back to
  // whatever opened the sheet so the keyboard does not restart at the top.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center
                 justify-center z-50 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[88vh] sm:max-h-[85vh]
                   overflow-hidden flex flex-col shadow-2xl animate-slide-up sm:animate-scale-in"
      >
        {/* ── Header ── */}
        <div className="p-5 flex items-start justify-between gap-3 flex-shrink-0 border-b border-black/5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: style?.tint ?? "rgba(11,11,11,0.05)",
                boxShadow: style ? `inset 0 0 0 1.5px ${style.hex}` : "none",
              }}
            >
              <Icon size={22} style={{ color: headerInk }} />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-bold text-black truncate">
                {t(`dashboard.achievements.categories.${category.key}.title`)}
              </h2>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.12em] mt-0.5"
                style={{ color: headerInk }}
              >
                {highest
                  ? t(`dashboard.achievements.tiers.${highest.tier}`)
                  : t("dashboard.achievements.notStarted")}
              </p>
            </div>
          </div>

          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={t("dashboard.achievements.close")}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full
                       bg-black/[0.04] hover:bg-black/10 transition-colors active:scale-90
                       duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
          >
            <IoClose size={18} className="text-black/60" />
          </button>
        </div>

        {/* ── Headline value ── */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <p className="text-[38px] font-extrabold text-black tracking-tight leading-none">
            {formatValue(t, category.key, value)}
          </p>
          <p className="text-xs text-black/40 mt-1">
            {t(`dashboard.achievements.categories.${category.key}.unit`)}
          </p>

          {nextTier ? (
            <p className="text-[13px] text-black/60 mt-3">
              {/* The one genuinely new number here: the gap, stated outright. */}
              <span className="font-bold text-black">
                {formatAmount(t, category, Math.max(0, nextTier.threshold - value))}
              </span>{" "}
              {t("dashboard.achievements.toGo", {
                tier: t(`dashboard.achievements.tiers.${nextTier.tier}`),
              })}
            </p>
          ) : (
            <p
              className="text-[13px] font-bold mt-3 flex items-center gap-1.5"
              style={{ color: TIER_COLORS.crown.hex }}
            >
              <IoSparkles size={14} aria-hidden="true" />
              {t("dashboard.achievements.maxAchieved")}
            </p>
          )}
        </div>

        {/* ── The ladder, rung by rung ── */}
        <div className="overflow-y-auto flex-1 px-5 pb-5">
          <p className="text-[10px] uppercase tracking-widest text-black/30 font-semibold mb-3">
            {t("dashboard.achievements.allTiers", {
              earned: earnedCount,
              total: category.tiers.length,
            })}
          </p>

          <ol className="flex flex-col">
            {rungs.map((rung, i) => {
              const tierStyle = TIER_COLORS[rung.tier.tier];
              const isLast = i === rungs.length - 1;
              const earned = rung.state === "earned";
              const current = rung.state === "current";

              return (
                <li
                  key={rung.tier.tier}
                  className="relative flex gap-3 animate-fade-in"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
                >
                  {/* Spine + medal. The connector is coloured only where the
                      climb has actually reached, so the ladder fills upward. */}
                  <div className="flex flex-col items-center flex-shrink-0 w-7">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: earned ? tierStyle.hex : tierStyle.tint,
                        boxShadow: earned ? "none" : `inset 0 0 0 1.5px ${tierStyle.hex}40`,
                      }}
                    >
                      {earned ? (
                        <IoCheckmark size={15} className="text-white" aria-hidden="true" />
                      ) : current ? (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tierStyle.hex }}
                        />
                      ) : (
                        <IoLockClosed
                          size={11}
                          aria-hidden="true"
                          style={{ color: `${tierStyle.hex}80` }}
                        />
                      )}
                    </span>
                    {!isLast && (
                      <span
                        className="w-[2px] flex-1 min-h-[26px] my-1 rounded-full"
                        style={{
                          backgroundColor: earned ? tierStyle.hex : "rgba(11,11,11,0.08)",
                        }}
                      />
                    )}
                  </div>

                  {/* Tier row */}
                  <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-4"}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className="text-sm font-bold truncate"
                        style={{ color: earned || current ? tierStyle.hex : "rgba(11,11,11,0.35)" }}
                      >
                        {t(`dashboard.achievements.tiers.${rung.tier.tier}`)}
                      </p>
                      {/* State in words — the medal colour never carries it alone. */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                          earned
                            ? "text-black/45"
                            : current
                            ? "text-black/60"
                            : "text-black/25"
                        }`}
                      >
                        {t(`dashboard.achievements.rungState.${rung.state}`)}
                      </span>
                    </div>

                    <p className="text-xs text-black/45 tabular-nums mt-0.5">
                      {getTierLabel(t, category, rung.tier.threshold)}
                    </p>

                    {current && (
                      <div className="mt-2">
                        <div className="w-full h-1.5 rounded-full overflow-hidden bg-black/[0.06]">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${rung.fill}%`,
                              backgroundColor: tierStyle.hex,
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-black/40 mt-1 tabular-nums">
                          {rung.fill}%
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default AchievementDetailModal;
