// components/Dashboard/AchievementCard.tsx
import React, { useState } from "react";
import {
  AchievementCategory,
  AchievementTier,
  getEarnedTiers,
  getNextTier,
  getTierProgress,
  formatValue,
} from "../../config/achievementsConfig";

interface Props {
  category: AchievementCategory;
  value: number;
}
 
const AchievementCard: React.FC<Props> = ({ category, value }) => {
  const [hoveredTier, setHoveredTier] = useState<AchievementTier | null>(null);

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
    <div className="flex-1 min-w-[130px] border-2 border-black rounded-lg p-3 sm:p-4 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{category.icon}</span>
        <span className="font-bold capitalize text-sm sm:text-base text-black">
          {category.title}
        </span>
      </div>

      {/* Current value */}
      <p className="text-2xl text-black  font-bold text-black mb-2">
        {formatValue(category.key, value)}
      </p>

      {/* Next goal or max */}
      {allEarned ? (
        <p className="text-xs font-semibold text-black">👑 Maximum achieved!</p>
      ) : (
        <>
          <p className="text-xs text-black opacity-60 mb-2">
            Next: {nextTier!.emoji} {nextTier!.label}
          </p>
          <div className="w-full h-2 text-black border border-black rounded-full overflow-hidden bg-white">
            <div
              className="h-full text-black  bg-black rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-black  mt-2 opacity-60">
            {formatValue(category.key, prevTierThreshold ?? 0)} →{" "}
            {formatValue(category.key, nextTier!.threshold)}
          </p>
        </>
      )}

      {/* Earned medals */}
      {earnedTiers.length > 0 && (
        <div className="flex items-center text-black  gap-1 mt-1 flex-wrap">
          {earnedTiers.map((t) => (
            <div
              key={t.tier}
              className="relative"
              onMouseEnter={() => setHoveredTier(t)}
              onMouseLeave={() => setHoveredTier(null)}
            >
              <span className="text-lg cursor-default select-none">
                {t.emoji}
              </span>
              {hoveredTier?.tier === t.tier && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 pointer-events-none">
                  <div className="bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    {t.emoji} {t.label} {category.unit}
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
