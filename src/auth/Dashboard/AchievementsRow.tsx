// components/Dashboard/AchievementsRow.tsx
import React, { useState, useEffect, useCallback } from "react";
import AchievementCard from "./AchievementCard";
import { ACHIEVEMENT_CATEGORIES } from "../../config/achievementsConfig";
import {
  fetchAchievements,
  syncListeningTime,
  AchievementsResponse,
} from "../../services/achievementServices";
import { getTotalListeningSeconds } from "../../hooks/useListeningTimer";

const AchievementsRow: React.FC = () => {
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);

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
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    syncListeningTime(token, localListeningSeconds).catch(() => {});

    const id = setInterval(() => {
      const seconds = getTotalListeningSeconds();
      syncListeningTime(token, seconds).catch(() => {});
    }, 5 * 60 * 1000);

    return () => clearInterval(id);
  }, []);

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
  };

  if (loading) {
    return (
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 min-w-[140px] border-2 border-black rounded-lg p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-3" />
            <div className="h-6 bg-gray-300 rounded w-1/2 mb-2" />
            <div className="h-2 bg-gray-300 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
  <div className="mb-6">
    <h2 className="text-sm text-black font-bold text-black mb-3 uppercase tracking-wide">
      Achievements
    </h2>
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
      {ACHIEVEMENT_CATEGORIES.map((category) => (
        <AchievementCard
          key={category.key}
          category={category}
          value={valueMap[category.key] ?? 0}
        />
      ))}
    </div>
  </div>
);
};

export default AchievementsRow;