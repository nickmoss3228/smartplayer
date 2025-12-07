// ProgressContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios, { AxiosResponse, AxiosError } from "axios";
import {
  ProgressData,
  ProgressContextValue,
  ProgressProviderProps,
  DifficultyType,
  ProgressApiResponse,
  DifficultyProgress,
} from "../types/Progress";

const ProgressContext = createContext<ProgressContextValue | undefined>(
  undefined
);

export const useProgress = (): ProgressContextValue => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  return context;
};

const initialDifficultyState: DifficultyProgress = {
  stats: {
    solved: 0,
    total: 0,
    percentage: 0,
  },
  completedLevels: [],
  currentLevel: 1,
  loading: true,
};

const initialProgressData: ProgressData = {
  easy: initialDifficultyState,
  medium: initialDifficultyState,
  hard: initialDifficultyState,
  initialLoad: true,
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Helper function to load from cache
const loadFromCache = (): ProgressData | null => {
  try {
    const cached = localStorage.getItem('progressData');
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if cache is fresh (less than 5 minutes old)
      const cacheTime = localStorage.getItem('progressCacheTime');
      if (cacheTime && Date.now() - parseInt(cacheTime) < 5 * 60 * 1000) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load cached progress:', error);
  }
  return null;
};

const saveToCache = (data: ProgressData): void => {
  try {
    localStorage.setItem('progressData', JSON.stringify(data));
    localStorage.setItem('progressCacheTime', Date.now().toString());
  } catch (error) {
    console.error('Failed to cache progress:', error);
  }
};

export const ProgressProvider: React.FC<ProgressProviderProps> = ({
  children,
}) => {
  const [progressData, setProgressData] = useState<ProgressData>(() => {
    // Load from cache immediately on mount
    const cached = loadFromCache();
    return cached || initialProgressData;
  });

  const getAuthHeaders = (): { Authorization: string } | {} => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchAllProgress = async (): Promise<ProgressData | null> => {
    try {
      const headers = getAuthHeaders();

      console.log("🔍 Fetching progress from:", API_BASE_URL);

      const [
        easyResponse,
        mediumResponse,
        hardResponse,
      ]: AxiosResponse<ProgressApiResponse>[] = await Promise.all([
        axios.get<ProgressApiResponse>(`${API_BASE_URL}/progress/easy`, {
          headers,
        }),
        axios.get<ProgressApiResponse>(`${API_BASE_URL}/progress/medium`, {
          headers,
        }),
        axios.get<ProgressApiResponse>(`${API_BASE_URL}/progress/hard`, {
          headers,
        }),
      ]);

      const newData: ProgressData = {
        easy: { ...easyResponse.data, loading: false },
        medium: { ...mediumResponse.data, loading: false },
        hard: { ...hardResponse.data, loading: false },
        initialLoad: false,
      };

      setProgressData(newData);
      saveToCache(newData); // Save to cache
      
      return newData;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Failed to fetch progress:", axiosError.message);

      setProgressData((prev) => ({
        ...prev,
        easy: { ...prev.easy, loading: false },
        medium: { ...prev.medium, loading: false },
        hard: { ...prev.hard, loading: false },
        initialLoad: false,
      }));
      
      return null;
    }
  };

  const refreshProgress = async (difficulty: DifficultyType): Promise<void> => {
    try {
      setProgressData((prev) => ({
        ...prev,
        [difficulty]: { ...prev[difficulty], loading: true },
      }));

      const headers = getAuthHeaders();
      const response: AxiosResponse<ProgressApiResponse> =
        await axios.get<ProgressApiResponse>(
          `${API_BASE_URL}/progress/${difficulty}`,
          { headers }
        );

      setProgressData((prev) => {
        const newData = {
          ...prev,
          [difficulty]: { ...response.data, loading: false },
        };
        saveToCache(newData);
        return newData;
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `Failed to refresh ${difficulty} progress:`,
        axiosError.message
      );

      setProgressData((prev) => ({
        ...prev,
        [difficulty]: { ...prev[difficulty], loading: false },
      }));
    }
  };

  const canAccessLevel = useCallback(
    (difficulty: DifficultyType, level: number): boolean => {
      const difficultyData = progressData[difficulty];

      if (!difficultyData || !difficultyData.completedLevels) {
        return level === 1;
      }

      if (level === 1) return true;

      return difficultyData.completedLevels.includes(level - 1);
    },
    [progressData]
  );

  const getHighestUnlockedLevel = useCallback(
    (difficulty: DifficultyType): number => {
      const difficultyData = progressData[difficulty];

      if (!difficultyData || difficultyData.currentLevel === undefined) {
        return 1;
      }

      return difficultyData.currentLevel;
    },
    [progressData]
  );

  useEffect(() => {
    // Only fetch if we don't have cached data or token exists
    const token = localStorage.getItem("token");
    if (token && progressData.initialLoad) {
      fetchAllProgress();
    }
  }, []);

  const refreshAllProgress = async (): Promise<void> => {
    await fetchAllProgress();
  };

  const contextValue: ProgressContextValue = {
    progressData,
    refreshProgress,
    refreshAllProgress,
    fetchAllProgress,  
    isInitialLoad: progressData.initialLoad,
    canAccessLevel,
    getHighestUnlockedLevel,
  };

  return (
    <ProgressContext.Provider value={contextValue}>
      {children}
    </ProgressContext.Provider>
  );
};