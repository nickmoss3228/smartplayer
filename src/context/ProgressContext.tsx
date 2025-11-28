import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { 
  ProgressData, 
  ProgressContextValue, 
  ProgressProviderProps,
  DifficultyType,
  ProgressApiResponse,
  DifficultyProgress
} from '../types/Progress';

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

export const useProgress = (): ProgressContextValue => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};

const initialDifficultyState: DifficultyProgress = {
  stats: {
    solved: 0,
    total: 0,
    percentage: 0
  },
  completedLevels: [],
  currentLevel: 1,
  loading: true
};

const initialProgressData: ProgressData = {
  easy: initialDifficultyState,
  medium: initialDifficultyState,
  hard: initialDifficultyState,
  initialLoad: true
};

export const ProgressProvider: React.FC<ProgressProviderProps> = ({ children }) => {
  const [progressData, setProgressData] = useState<ProgressData>(initialProgressData);

  const getAuthHeaders = (): { Authorization: string } | {} => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchAllProgress = async (): Promise<void> => {
    try {
      const headers = getAuthHeaders();
      
      const [easyResponse, mediumResponse, hardResponse]: AxiosResponse<ProgressApiResponse>[] = await Promise.all([
        axios.get<ProgressApiResponse>('http://localhost:5000/api/progress/easy', { headers }),
        axios.get<ProgressApiResponse>('http://localhost:5000/api/progress/medium', { headers }),
        axios.get<ProgressApiResponse>('http://localhost:5000/api/progress/hard', { headers })
      ]);

      setProgressData({
        easy: { ...easyResponse.data, loading: false },
        medium: { ...mediumResponse.data, loading: false },
        hard: { ...hardResponse.data, loading: false },
        initialLoad: false
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Failed to fetch progress:', axiosError.message);
      
      setProgressData(prev => ({
        ...prev,
        easy: { ...prev.easy, loading: false },
        medium: { ...prev.medium, loading: false },
        hard: { ...prev.hard, loading: false },
        initialLoad: false
      }));
    }
  };

  const refreshProgress = async (difficulty: DifficultyType): Promise<void> => {
    try {
      setProgressData(prev => ({
        ...prev,
        [difficulty]: { ...prev[difficulty], loading: true }
      }));

      const headers = getAuthHeaders();
      const response: AxiosResponse<ProgressApiResponse> = await axios.get<ProgressApiResponse>(
        `http://localhost:5000/api/progress/${difficulty}`, 
        { headers }
      );
      
      setProgressData(prev => ({
        ...prev,
        [difficulty]: { ...response.data, loading: false }
      }));
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`Failed to refresh ${difficulty} progress:`, axiosError.message);
      
      setProgressData(prev => ({
        ...prev,
        [difficulty]: { ...prev[difficulty], loading: false }
      }));
    }
  };

 // New function: Check if user can access a specific level
const canAccessLevel = useCallback((difficulty: DifficultyType, level: number): boolean => {
  const difficultyData = progressData[difficulty];
  
  // If data is not loaded yet or doesn't exist, only allow level 1
  if (!difficultyData || !difficultyData.completedLevels) {
    return level === 1;
  }
  
  // Level 1 is always accessible
  if (level === 1) return true;
  
  // Check if previous level is completed
  return difficultyData.completedLevels.includes(level - 1);
}, [progressData]);

// New function: Get highest unlocked level
const getHighestUnlockedLevel = useCallback((difficulty: DifficultyType): number => {
  const difficultyData = progressData[difficulty];
  
  // If data is not loaded yet or doesn't exist, return level 1
  if (!difficultyData || difficultyData.currentLevel === undefined) {
    return 1;
  }
  
  return difficultyData.currentLevel;
}, [progressData]);
  useEffect(() => {
    fetchAllProgress();
  }, []);

  const refreshAllProgress = async (): Promise<void> => {
    await fetchAllProgress();
  };

  const contextValue: ProgressContextValue = {
    progressData,
    refreshProgress,
    refreshAllProgress, 
    isInitialLoad: progressData.initialLoad,
    canAccessLevel,
    getHighestUnlockedLevel
  };

  return (
    <ProgressContext.Provider value={contextValue}>
      {children}
    </ProgressContext.Provider>
  );
};