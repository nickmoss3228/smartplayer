// context/ProgressContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { StoryProgressData, StoryProgressMap } from "../types/Progress";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// All story slugs per difficulty — add new ones here as you create them
const STORY_SLUGS: Record<string, string[]> = {
  easy:   ["leo"],
  medium: ["maya"],
  hard:   ["daniel"],
};

interface ProgressContextValue {
  // Story-level data — the single source of truth
  storyProgress: StoryProgressMap;

  // Convenience helpers used by LevelProgress + Player
  getStoryData: (difficulty: string, storySlug: string) => StoryProgressData;
  canAccessPart: (difficulty: string, storySlug: string, partNumber: number) => boolean;
  refreshStoryProgress: (difficulty: string, storySlug: string) => Promise<void>;

  // Legacy helpers Player/LevelProgress still use
  isInitialLoad: boolean;
}

const defaultStoryData: StoryProgressData = {
  completedParts: [],
  currentPart: 1,
  totalParts: 10,
  loading: true,
  error: null,
};

const ProgressContext = createContext<ProgressContextValue>({
  storyProgress: {},
  getStoryData: () => defaultStoryData,
  canAccessPart: () => false,
  refreshStoryProgress: async () => {},
  isInitialLoad: true,
});

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [storyProgress, setStoryProgress] = useState<StoryProgressMap>({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hasFetched = useRef(false);

  const getToken = (): string | null => localStorage.getItem("token");

  const fetchSingleStory = useCallback(
    async (difficulty: string, storySlug: string): Promise<StoryProgressData> => {
      const token = getToken();
      if (!token) return { ...defaultStoryData, loading: false };

      try {
        const res = await axios.get(
          `${API_BASE}/api/progress/story/${difficulty}/${storySlug}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return {
          completedParts: res.data.completedParts ?? [],
          currentPart: res.data.currentPart ?? 1,
          totalParts: res.data.totalParts ?? 10,
          loading: false,
          error: null,
        };
      } catch (err) {
        console.error(`Failed to fetch progress for ${difficulty}:${storySlug}`, err);
        return {
          ...defaultStoryData,
          loading: false,
          error: "Failed to load progress",
        };
      }
    },
    []
  );

  // Fetch all stories on mount
  const fetchAll = useCallback(async () => {
    if (!user) return;

    const entries = Object.entries(STORY_SLUGS).flatMap(([difficulty, slugs]) =>
      slugs.map((slug) => ({ difficulty, slug }))
    );

    // Set all to loading first
    const loadingState: StoryProgressMap = {};
    entries.forEach(({ difficulty, slug }) => {
      loadingState[`${difficulty}:${slug}`] = { ...defaultStoryData, loading: true };
    });
    setStoryProgress(loadingState);

    // Fetch all in parallel
    const results = await Promise.all(
      entries.map(async ({ difficulty, slug }) => {
        const data = await fetchSingleStory(difficulty, slug);
        return { key: `${difficulty}:${slug}`, data };
      })
    );

    const finalState: StoryProgressMap = {};
    results.forEach(({ key, data }) => {
      finalState[key] = data;
    });

    setStoryProgress(finalState);
    setIsInitialLoad(false);
    hasFetched.current = true;
  }, [user, fetchSingleStory]);

  useEffect(() => {
    if (user && !hasFetched.current) {
      fetchAll();
    }
    if (!user) {
      setStoryProgress({});
      setIsInitialLoad(false);
      hasFetched.current = false;
    }
  }, [user, fetchAll]);

  // Called by Player after a quiz is submitted
  const refreshStoryProgress = useCallback(
    async (difficulty: string, storySlug: string) => {
      const key = `${difficulty}:${storySlug}`;

      // Set loading for just this story
      setStoryProgress((prev) => ({
        ...prev,
        [key]: { ...(prev[key] ?? defaultStoryData), loading: true },
      }));

      const data = await fetchSingleStory(difficulty, storySlug);

      setStoryProgress((prev) => ({
        ...prev,
        [key]: data,
      }));

      // Also invalidate Dashboard cache so it re-fetches
      sessionStorage.removeItem("dashboardData");
    },
    [fetchSingleStory]
  );

  const getStoryData = useCallback(
    (difficulty: string, storySlug: string): StoryProgressData => {
      return storyProgress[`${difficulty}:${storySlug}`] ?? defaultStoryData;
    },
    [storyProgress]
  );

  const canAccessPart = useCallback(
    (difficulty: string, storySlug: string, partNumber: number): boolean => {
      const data = storyProgress[`${difficulty}:${storySlug}`];
      if (!data) return partNumber === 1;
      if (data.completedParts.includes(partNumber)) return true;
      return partNumber <= data.currentPart;
    },
    [storyProgress]
  );

  return (
    <ProgressContext.Provider
      value={{
        storyProgress,
        getStoryData,
        canAccessPart,
        refreshStoryProgress,
        isInitialLoad,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => useContext(ProgressContext);