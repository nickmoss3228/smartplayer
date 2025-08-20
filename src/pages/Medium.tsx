import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import LevelProgress from './LevelProgress';

const Medium = () => {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState({
    completedLevels: [],
    currentLevel: 1,
    totalLevels: 10,
    loading:true
  })

  useEffect(() => {
    if (user) {
      fetchProgress()
    }
  }, [user])

   const fetchProgress = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('http://localhost:5000/api/progress/medium', {
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
      difficulty="medium"
      completedLevels={progressData.completedLevels}
      currentLevel={progressData.currentLevel}
      totalLevels={progressData.totalLevels}
      onRefresh={fetchProgress}
    />
  );
};

export default Medium;