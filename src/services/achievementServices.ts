// services/achievementService.ts
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface AchievementsResponse {
  achievements: Record<string, string | null>;
  stats: {
    listeningSeconds: number;
    questionsAnswered: number;
    currentStreak: number;
    longestStreak: number;
    uniqueStoriesCount: number;
  };
}

export const fetchAchievements = async (
  token: string
): Promise<AchievementsResponse> => {
  const res = await axios.get(`${API_BASE}/api/progress/achievements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const syncListeningTime = async (
  token: string,
  totalSeconds: number
): Promise<void> => {
  await axios.patch(
    `${API_BASE}/api/progress/listening-time`,
    { totalSeconds },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};