import axios from 'axios';
import { OverviewData, DetailedProgressMap, ApiHeaders, Difficulty } from '../types/Dashboard';

const API_BASE = 'http://localhost:5000';

const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

export const fetchOverviewData = async (token: string): Promise<OverviewData> => {
  const headers: ApiHeaders = {
    Authorization: `Bearer ${token}`
  };

  const response = await axios.get(`${API_BASE}/api/progress/overview`, { headers });
  
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Overview fetch failed with status: ${response.status}`);
  }
  
  if (!response.headers['content-type']?.includes('application/json')) {
    throw new Error('Overview response is not JSON');
  }
  
  return response.data;
};

export const fetchDetailedProgress = async (token: string): Promise<DetailedProgressMap> => {
  const headers: ApiHeaders = {
    Authorization: `Bearer ${token}`
  };

  const progressPromises = difficulties.map(async (difficulty) => {
    const response = await axios.get(`${API_BASE}/api/progress/${difficulty}`, { headers });
    
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Progress fetch for ${difficulty} failed with status: ${response.status}`);
    }
    
    if (!response.headers['content-type']?.includes('application/json')) {
      throw new Error(`Progress response for ${difficulty} is not JSON`);
    }
    
    return { difficulty, data: response.data };
  });

  const progressResults = await Promise.all(progressPromises);
  const progressMap: DetailedProgressMap = {};
  
  progressResults.forEach(({ difficulty, data }) => {
    progressMap[difficulty] = data;
  });
  
  return progressMap;
};

export const fetchAllDashboardData = async (token: string) => {
  try {
    const [overviewData, detailedProgress] = await Promise.all([
      fetchOverviewData(token),
      fetchDetailedProgress(token)
    ]);
    
    return { overviewData, detailedProgress };
  } catch (error) {
    console.error('Failed to fetch progress:', error);
    throw error;
  }
};