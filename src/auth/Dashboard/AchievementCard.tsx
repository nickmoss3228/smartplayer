// components/Dashboard/AchievementCard.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoTrophyOutline } from "react-icons/io5";
import {
  AchievementCategory,
  AchievementTier,
  TIER_COLORS,
  getEarnedTiers,
  getNextTier,
  getTierProgress,
  getTierLabel,
  formatValue,
} from "../../config/achievementsConfig";

interface Props {
  category: AchievementCategory;
  value: number;
  index: number;
}

const AchievementCard: React.FC<Props> = ({ category, value, index }) => {
  const { t } = useTranslation();
  const [hoveredTier, setHoveredTier] = useState<AchievementTier | null>(null);
  const Icon = category.icon;

  const earnedTiers = getEarnedTiers(category.tiers, value);
  const nextTier = getNextTier(category.tiers, value);
  const progress = getTierProgress(category.tiers, value);
  const allEarned = !nextTier;

  const prevTierThreshold = nextTier
    ? category.tiers.indexOf(nextTier) === 0
      ? 0
      : category.tiers[category.tiers.indexOf(nextTier) - 1].threshold
    : null;

  return (
    <div
      className="bg-white rounded-3xl p-4 sm:p-5 flex flex-col gap-3
                 shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-black/5
                 animate-scale-in"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-black/5 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4.5 h-4.5 text-black/70" size={18} />
        </div>
        <span className="font-bold text-sm sm:text-base text-black/85 leading-tight">
          {t(`dashboard.achievements.categories.${category.key}.title`)}
        </span>
      </div>

      {/* Current value */}
      <p className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">
        {formatValue(t, category.key, value)}
      </p>

      {/* Next goal or max */}
      {allEarned ? (
        <p className="text-xs font-semibold text-purple-600 flex items-center gap-1">
          <IoTrophyOutline size={14} />
          {t("dashboard.achievements.maxAchieved")}
        </p>
      ) : (
        <>
          <p className="text-xs text-black/45">
            {t("dashboard.achievements.next", {
              label: getTierLabel(t, category, nextTier!.threshold),
            })}
          </p>
          <div className="w-full h-2 rounded-full overflow-hidden bg-black/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${TIER_COLORS[nextTier!.tier]}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-black/35">
            {formatValue(t, category.key, prevTierThreshold ?? 0)} →{" "}
            {formatValue(t, category.key, nextTier!.threshold)}
          </p>
        </>
      )}

      {/* Earned medals */}
      {earnedTiers.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {earnedTiers.map((tier) => (
            <div
              key={tier.tier}
              className="relative"
              onMouseEnter={() => setHoveredTier(tier)}
              onMouseLeave={() => setHoveredTier(null)}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full ${TIER_COLORS[tier.tier]} ring-2 ring-white shadow-sm`}
              />
              {hoveredTier?.tier === tier.tier && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 pointer-events-none animate-fade-in">
                  <div className="bg-black text-white text-[11px] rounded-lg px-2 py-1 whitespace-nowrap font-medium">
                    {getTierLabel(t, category, tier.threshold)}{" "}
                    {t(`dashboard.achievements.categories.${category.key}.unit`)}
                  </div>
                  <div className="w-2 h-2 bg-black rotate-45 mx-auto -mt-1" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AchievementCard;
