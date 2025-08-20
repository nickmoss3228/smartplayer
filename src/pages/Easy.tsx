import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import LevelProgress from './LevelProgress';

const Easy = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [progressData, setProgressData] = useState({
    completedLevels: [],
    currentLevel: 1,
    totalLevels: 10,
    loading:true
  })

  console.log(progressData)
  useEffect(() => {
    if (user) {
      fetchProgress()
    }
  }, [user])

 // Add effect to refresh when returning from player
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchProgress();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const fetchProgress = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('http://localhost:5000/api/progress/easy', {
        headers: {
          Authorization
            : `Bearer ${token}`
        }
      })
      setProgressData({
        ...response.data,
        loading:false
      })
    } catch (error) {
      console.error('Failed to fetch progress: ', error)
      setProgressData(prev => ({...prev, loading: false}))
    }
  }

   if (progressData.loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  return (
    <LevelProgress 
      difficulty="easy"
      completedLevels={progressData.completedLevels}
      currentLevel={progressData.currentLevel}
      totalLevels={progressData.totalLevels}
      onRefresh={fetchProgress}
    />
  );
};

export default Easy;