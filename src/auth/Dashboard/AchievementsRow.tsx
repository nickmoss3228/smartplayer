// components/Dashboard/AchievementsRow.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import AchievementCard from "./AchievementCard";
import AchievementDetailModal from "./AchievementDetailModal";
import {
  ACHIEVEMENT_CATEGORIES,
  getEarnedTiers,
  type AchievementCategory,
} from "../../config/achievementsConfig";
import {
  fetchAchievements,
  AchievementsResponse,
} from "../../services/achievementServices";
import { getTotalListeningSeconds } from "../../hooks/useListeningTimer";
import { useListeningTimeSync } from "../../hooks/useListeningTimeSync";

const AchievementsRow: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCategory, setOpenCategory] = useState<AchievementCategory | null>(
    null
  );

  const localListeningSeconds = getTotalListeningSeconds();

  const load = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const result = await fetchAchievements(token);
      setData(result);
    } catch (err) {
      console.error("Failed to load achievements:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync listening time to backend on mount, then every 5 minutes
  useListeningTimeSync(true);

  useEffect(() => {
    load();
  }, [load]);

  // Build the value map — listening time comes from localStorage
  // (most up-to-date), everything else from the backend stats.
  const valueMap: Record<string, number> = {
    listeningTime:     localListeningSeconds,
    questionsAnswered: data?.stats.questionsAnswered ?? 0,
    studyStreak:       data?.stats.currentStreak ?? 0,
    storiesListened:   data?.stats.uniqueStoriesCount ?? 0,
    wordsLearned:      data?.stats.wordsLearned ?? 0,
  };

  // One headline for the whole section, so the row leads with a total rather
  // than making the reader add up five cards.
  const tally = useMemo(() => {
    let earned = 0;
    let total = 0;
    for (const category of ACHIEVEMENT_CATEGORIES) {
      total += category.tiers.length;
      earned += getEarnedTiers(category.tiers, valueMap[category.key] ?? 0).length;
    }
    return { earned, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, localListeningSeconds]);

  if (loading) {
    return (
      <div className="mb-6">
        <div className="h-3 w-28 bg-gray-200 rounded mb-3 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-3xl bg-white border border-black/5 p-4 sm:p-5 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-7 bg-gray-200 rounded w-1/2 mb-3.5" />
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((r) => (
                  <div key={r} className="h-2 flex-1 bg-gray-200 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-xs text-black/40 font-bold uppercase tracking-widest">
          {t("dashboard.achievements.title")}
        </h2>
        <p className="text-xs text-black/35 font-semibold tabular-nums flex-shrink-0">
          {t("dashboard.achievements.tallyEarned", {
            earned: tally.earned,
            total: tally.total,
          })}
        </p>
      </div>

      {/* Five cards into a two-column grid leaves the last one orphaned, so it
          takes the full row at that breakpoint. */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4
                   sm:[&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1"
      >
        {ACHIEVEMENT_CATEGORIES.map((category, index) => (
          <AchievementCard
            key={category.key}
            category={category}
            value={valueMap[category.key] ?? 0}
            index={index}
            onOpen={setOpenCategory}
          />
        ))}
      </div>

      {openCategory && (
        <AchievementDetailModal
          category={openCategory}
          value={valueMap[openCategory.key] ?? 0}
          onClose={() => setOpenCategory(null)}
        />
      )}
    </div>
  );
};

export default AchievementsRow;
