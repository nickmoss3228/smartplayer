// components/Dashboard.jsx
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:5000'

const Dashboard = () => {
  const { user, signOut, loading } = useAuth()

  const [overviewData, setOverviewData] = useState(null)
  const [detailedProgress, setDetailedProgress] = useState({})
  const [progressLoading, setProgressLoading] = useState(true)

  const difficulty = ['easy', 'medium', 'hard']

   useEffect(() => {
    const fetchAllData = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers = {
          'Authorization': `Bearer ${token}`
        }

        // Fetch overview data
        const overviewResponse = await axios.get(`${API_BASE}/api/progress/overview`, { headers })
        if (overviewResponse.status < 200 || overviewResponse.status >= 300) {
          throw new Error(`Overview fetch failed with status: ${overviewResponse.status}`);
        }
        if (!overviewResponse.headers['content-type']?.includes('application/json')) {
          throw new Error('Overview response is not JSON');
        }
        const overview = overviewResponse.data
        setOverviewData(overview)

        // Fetch detailed progress for each difficulty
        const progressPromises = difficulty.map(async (difficulty) => {
          const response = await axios.get(`${API_BASE}/api/progress/${difficulty}`, { headers })
          if (response.status < 200 || response.status >= 300) {
            throw new Error(`Progress fetch for ${difficulty} failed with status: ${response.status}`);
          }
          if (!response.headers['content-type']?.includes('application/json')) {
            throw new Error(`Progress response for ${difficulty} is not JSON`);
          }
          const data = response.data
          return { difficulty, data }
        })

        const progressResults = await Promise.all(progressPromises)
        const progressMap = {}
        progressResults.forEach(({ difficulty, data }) => {
          progressMap[difficulty] = data;
        })
        setDetailedProgress(progressMap)

      } catch (error) {
        console.error('Failed to fetch progress:', error)
      } finally {
        setProgressLoading(false)
      }
    }

    if (user) {
      fetchAllData()
    }
  }, [user])

  // Helper functions
  const getOverallProgress = () => {
    if (!overviewData) return 0
    const totalCompleted = Object.values(overviewData).reduce((sum, diff) => sum + diff.completed, 0)
    const totalLevels = Object.values(overviewData).reduce((sum, diff) => sum + diff.total, 0)
    return totalLevels > 0 ? Math.round((totalCompleted / totalLevels) * 100) : 0
  }

  const getTotalCompleted = () => {
    if (!overviewData) return 0
    return Object.values(overviewData).reduce((sum, diff) => sum + diff.completed, 0)
  }

  const getTotalLevels = () => {
    if (!overviewData) return 0
    return Object.values(overviewData).reduce((sum, diff) => sum + diff.total, 0)
  }

  const getRank = () => {
    const progress = getOverallProgress()
    if (progress >= 90) return { title: 'Advanced', emoji: '👑' }
    if (progress >= 70) return { title: 'Intermediate', emoji: '🏆' }
    if (progress >= 50) return { title: 'Pre-Intermediate', emoji: '🥉' }
    if (progress >= 25) return { title: 'Elementary', emoji: '📚' }
    return { title: 'Beginner', emoji: '🌱' }
  }

  const getProgressPercentage = (completed, total) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const getDifficultyIcon = (difficulty: string) => {
    const icons = { easy: '🟢', medium: '🟡', hard: '🔴' }
    return icons[difficulty] || '⚪'
  }

  const getDifficultyColor = (difficulty) => {
    const colors = { 
      easy: 'bg-green-500', 
      medium: 'bg-yellow-500', 
      hard: 'bg-red-500' 
    }
    return colors[difficulty] || 'bg-gray-500'
  }

  const getDifficultyBgColor = (difficulty) => {
    const colors = { 
      easy: 'border-green-200 bg-green-50', 
      medium: 'border-yellow-200 bg-yellow-50', 
      hard: 'border-red-200 bg-red-50' 
    }
    return colors[difficulty] || 'border-gray-200 bg-gray-50'
  }

  const getLevelStatus = (levelNumber, completedLevels, currentLevel) => {
    if (completedLevels.includes(levelNumber)) return 'completed'
    if (levelNumber === currentLevel) return 'current'
    if (levelNumber < currentLevel) return 'available'
    return 'locked'
  }

  const getLevelStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-500 text-white',
      current: 'bg-blue-500 text-white',
      available: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
      locked: 'bg-gray-100 text-gray-400'
    }
    return colors[status] || 'bg-gray-100 text-gray-400'
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-black-500 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Welcome back, {user.username}!</h1>
                <p className="text-gray-600">Let's continue your learning journey</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {progressLoading ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Overall Progress</p>
                    <p className="text-2xl font-bold text-gray-800">{getOverallProgress()}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Completed Levels</p>
                    <p className="text-2xl font-bold text-gray-800">{getTotalCompleted()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Total Levels</p>
                    <p className="text-2xl font-bold text-gray-800">{getTotalLevels()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <span className="text-2xl">{getRank().emoji}</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Current Rank</p>
                    <p className="text-2xl font-bold text-gray-800">{getRank().title}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress by Difficulty with Level Details */}
            <div className="space-y-6">
              {overviewData && Object.entries(overviewData).map(([difficulty, overviewInfo]) => {
                const progressInfo = detailedProgress[difficulty]
                return (
                  <div key={difficulty} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">{getDifficultyIcon(difficulty)}</span>
                        <div>
                          <h2 className="text-2xl font-bold capitalize text-gray-800">{difficulty}</h2>
                          <p className="text-gray-600">
                            {overviewInfo.completed} / {overviewInfo.total} levels completed
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-700">
                          {getProgressPercentage(overviewInfo.completed, overviewInfo.total)}%
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${getDifficultyColor(difficulty)} transition-all duration-500`}
                            style={{ width: `${getProgressPercentage(overviewInfo.completed, overviewInfo.total)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Individual Levels */}
                    {progressInfo && (
                      <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-2">
                        {Array.from({ length: progressInfo.totalLevels }, (_, index) => {
                          const levelNumber = index + 1
                          const status = getLevelStatus(
                            levelNumber, 
                            progressInfo.completedLevels, 
                            progressInfo.currentLevel
                          )
                          
                          return (
                            <div
                              key={levelNumber}
                              className={`
                                w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold
                                transition-all duration-200 cursor-pointer
                                ${getLevelStatusColor(status)}
                              `}
                              title={`Level ${levelNumber} - ${status}`}
                            >
                              {levelNumber}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Current Level Info */}
                    {/* {progressInfo && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-600">Current Level</p>
                            <p className="text-lg font-semibold text-gray-800">
                              Level {progressInfo.currentLevel}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Next to unlock</p>
                            <p className="text-lg font-semibold text-gray-800">
                              Level {progressInfo.currentLevel + 1}
                            </p>
                          </div>
                        </div>
                      </div>
                    )} */}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Dashboard