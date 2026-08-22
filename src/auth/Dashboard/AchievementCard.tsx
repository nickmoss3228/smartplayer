// components/Dashboard/AchievementCard.tsx
//
// An achievement is a ladder, not a statistic — five rungs you climb. The card
// is built around that: the rung track is the primary element and shows lifetime
// position, where the previous single progress bar only ever showed distance to
// the next tier (so a crown-tier learner and a bronze-tier one looked alike).
//
// The whole card is one button, matching the difficulty cards on this dashboard.
// That is also why the rungs are presentational: they used to be buttons of their
// own, which cannot legally nest inside this one. Their per-tier detail now lives
// in AchievementDetailModal, which has room to say more than a tooltip could.

import React from "react";
import { useTranslation } from "react-i18next";
import { IoChevronForward, IoLockClosed, IoSparkles } from "react-icons/io5";
import {
  AchievementCategory,
  TIER_COLORS,
  getHighestEarnedTier,
  getNextTier,
  getRungFills,
  getTierLabel,
  formatValue,
} from "../../config/achievementsConfig";

interface Props {
  category: AchievementCategory;
  value: number;
  index: number;
  onOpen: (category: AchievementCategory) => void;
}

const AchievementCard: React.FC<Props> = ({ category, value, index, onOpen }) => {
  const { t } = useTranslation();
  const Icon = category.icon;

  const rungs = getRungFills(category.tiers, value);
  const highest = getHighestEarnedTier(category.tiers, value);
  const nextTier = getNextTier(category.tiers, value);
  const allEarned = !nextTier;
  const earnedCount = rungs.filter((r) => r.state === "earned").length;

  const style = highest ? TIER_COLORS[highest.tier] : null;
  const medallionInk = style?.hex ?? "#898781";
  const categoryTitle = t(`dashboard.achievements.categories.${category.key}.title`);
  const tierName = highest
    ? t(`dashboard.achievements.tiers.${highest.tier}`)
    : t("dashboard.achievements.notStarted");

  return (
    <button
      type="button"
      onClick={() => onOpen(category)}
      aria-label={t("dashboard.achievements.cardSummary", {
        category: categoryTitle,
        tier: tierName,
        value: formatValue(t, category.key, value),
        earned: earnedCount,
        total: category.tiers.length,
      })}
      className="group relative bg-white rounded-3xl p-4 sm:p-5 flex flex-col gap-3.5 text-left
                 shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-black/5
                 overflow-hidden animate-scale-in
                 transition-all duration-200 hover:shadow-md active:scale-[0.98]
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25
                 focus-visible:ring-offset-2"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
    >
      {/* Tier edge — the quiet signal that makes a gold card read differently
          from a bronze one when you scan the whole row. */}
      {style && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ backgroundColor: style.hex }}
        />
      )}

      {/* ── Medallion + category ── */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: style?.tint ?? "rgba(11,11,11,0.05)",
            boxShadow: style ? `inset 0 0 0 1.5px ${style.hex}` : "none",
          }}
        >
          <Icon size={19} style={{ color: medallionInk }} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-black/85 leading-tight truncate">
            {categoryTitle}
          </p>
          {/* Tier is named in words, so it never rests on color alone. */}
          <p
            className="text-[10px] font-bold uppercase tracking-[0.12em] mt-0.5 truncate"
            style={{ color: medallionInk }}
          >
            {tierName}
          </p>
        </div>

        <IoChevronForward
          size={15}
          aria-hidden="true"
          className="text-black/20 flex-shrink-0 transition-transform duration-200
                     group-hover:translate-x-0.5 group-hover:text-black/40"
        />
      </div>

      {/* ── Value ── */}
      <p className="text-[26px] sm:text-[30px] font-extrabold text-black tracking-tight leading-none">
        {formatValue(t, category.key, value)}
      </p>

      {/* ── The ladder ── */}
      <div className="flex flex-col gap-1.5">
        {/* Presentational: the button's own label carries this for assistive tech,
            and the modal carries it in full for everyone. */}
        <div className="flex items-end gap-1" aria-hidden="true">
          {rungs.map((rung, i) => (
            <span
              key={rung.tier.tier}
              className="block flex-1 h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(11,11,11,0.07)" }}
            >
              <span
                className={`block h-full rounded-full origin-left animate-rung-rise ${
                  rung.state === "current" && rung.fill > 0 ? "animate-tier-breathe" : ""
                }`}
                style={{
                  width: `${rung.fill}%`,
                  backgroundColor: TIER_COLORS[rung.tier.tier].hex,
                  // Staggered so the ladder draws itself left to right.
                  ["--rung-delay" as string]: `${index * 60 + i * 70}ms`,
                }}
              />
            </span>
          ))}
        </div>

        {/* ── Footer: what is next, or the finished state ── */}
        {allEarned ? (
          <p
            className="text-[11px] font-bold flex items-center gap-1"
            style={{ color: TIER_COLORS.crown.hex }}
          >
            <IoSparkles size={12} aria-hidden="true" />
            {t("dashboard.achievements.maxAchieved")}
          </p>
        ) : (
          <p className="text-[11px] text-black/45 flex items-center gap-1">
            <IoLockClosed size={10} aria-hidden="true" className="text-black/25 flex-shrink-0" />
            <span className="truncate">
              {t("dashboard.achievements.next", {
                label: getTierLabel(t, category, nextTier.threshold),
              })}
            </span>
          </p>
        )}

        <p className="text-[10px] text-black/30 tabular-nums">
          {t("dashboard.achievements.tierCount", {
            earned: earnedCount,
            total: category.tiers.length,
          })}
        </p>
      </div>
    </button>
  );
};

export default AchievementCard;
