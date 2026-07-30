// components/Dashboard/AchievementsRow.tsx
import React, { useState, useEffect, useCallback } from "react";
import AchievementCard from "./AchievementCard";
import { ACHIEVEMENT_CATEGORIES } from "../../config/achievementsConfig";
import {
  fetchAchievements,
  AchievementsResponse,
} from "../../services/achievementServices";
import { getTotalListeningSeconds } from "../../hooks/useListeningTimer";
import { useListeningTimeSync } from "../../hooks/useListeningTimeSync";

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

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-3xl bg-white border border-black/5 p-4 sm:p-5 animate-pulse"
          >
            <div className="w-9 h-9 rounded-2xl bg-gray-200 mb-3" />
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-3" />
            <div className="h-2 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
  <div className="mb-6">
    <h2 className="text-xs text-black/40 font-bold mb-3 uppercase tracking-widest">
      Achievements
    </h2>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {ACHIEVEMENT_CATEGORIES.map((category, index) => (
        <AchievementCard
          key={category.key}
          category={category}
          value={valueMap[category.key] ?? 0}
          index={index}
        />
      ))}
    </div>
  </div>
);
};

export default AchievementsRow;