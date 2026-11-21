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


// All story slugs per difficulty — add new ones here as you create them
const STORY_SLUGS: Record<string, string[]> = {
  easy:   ["leo"],
  medium: ["maya"],
  hard:   ["daniel"],
};
import { API_BASE } from "../services/apiClient";

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
  const userId = user ? user.id : null;
  // Lets an in-flight request notice the account changed under it.
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;

  const getToken = (): string | null => localStorage.getItem("token");

  // Resolves to null when the request failed, so callers can decide whether to
  // keep what they already have instead of overwriting it with defaults.
  const fetchSingleStory = useCallback(
    async (difficulty: string, storySlug: string): Promise<StoryProgressData | null> => {
      const token = getToken();
      if (!token) return null;

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
        return null;
      }
    },
    []
  );

  // Fetch all stories on mount
  const fetchAll = useCallback(async () => {
    if (!userId) return;
    const requestedFor = userId;

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

    // Logged out or switched account while this was in flight: discard it, and
    // leave hasFetched alone so the new account fetches for itself.
    if (userIdRef.current !== requestedFor) return;

    const finalState: StoryProgressMap = {};
    results.forEach(({ key, data }) => {
      finalState[key] = data ?? {
        ...defaultStoryData,
        loading: false,
        error: "Failed to load progress",
      };
    });

    setStoryProgress(finalState);
    setIsInitialLoad(false);
    hasFetched.current = true;
  }, [userId, fetchSingleStory]);

  useEffect(() => {
    if (userId && !hasFetched.current) {
      fetchAll();
    }
    if (!userId) {
      setStoryProgress({});
      setIsInitialLoad(false);
      hasFetched.current = false;
    }
  }, [userId, fetchAll]);

  // AuthContext migrates a guest's local trial progress into the account via
  // a fire-and-forget POST that resolves after the initial fetchAll() above
  // has already run (and cached its now-stale result). Without this, List/
  // LevelProgress would keep showing pre-migration data for the rest of the
  // session even though Dashboard (which refetches on every mount) shows the
  // correct, up-to-date state.
  useEffect(() => {
    const handleMigrated = () => {
      if (!userId) return;
      hasFetched.current = false;
      fetchAll();
    };
    window.addEventListener("guest-progress-migrated", handleMigrated);
    return () => window.removeEventListener("guest-progress-migrated", handleMigrated);
  }, [userId, fetchAll]);

  // Called by Player after a quiz is submitted
  const refreshStoryProgress = useCallback(
    async (difficulty: string, storySlug: string) => {
      const key = `${difficulty}:${storySlug}`;

      // Set loading for just this story
      setStoryProgress((prev) => ({
        ...prev,
        [key]: { ...(prev[key] ?? defaultStoryData), loading: true },
      }));

      const requestedFor = userIdRef.current;
      const data = await fetchSingleStory(difficulty, storySlug);
      if (userIdRef.current !== requestedFor) return;

      setStoryProgress((prev) => ({
        ...prev,
        // A failed refetch must not wipe the ticks we already have.
        [key]: data ?? {
          ...(prev[key] ?? defaultStoryData),
          loading: false,
          error: "Failed to load progress",
        },
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