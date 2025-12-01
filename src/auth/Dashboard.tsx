import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { fetchAllDashboardData } from "../services/dashboardServices";
import {
  getOverallProgress,
  getTotalCompleted,
  getTotalLevels,
  getRank,
  getProgressPercentage,
  getDifficultyIcon,
  getLevelStatus,
} from "../modules/dashboardModule";
import { OverviewData, DetailedProgressMap } from "../types/Dashboard";

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, signOut, loading } = useAuth();

  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [detailedProgress, setDetailedProgress] = useState<DetailedProgressMap>(
    {}
  );
  const [progressLoading, setProgressLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      // console.log("User object:", user);
      // console.log("Username:", user?.username);

      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const { overviewData, detailedProgress } = await fetchAllDashboardData(
          token
        );
        setOverviewData(overviewData);
        setDetailedProgress(detailedProgress);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setProgressLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black text-xl">{t("dashboard.loading")}</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const overallProgress = getOverallProgress(overviewData);
  const rank = getRank(overallProgress);

  return (
    <div className="min-h-screen mt-15 bg-white p-2 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="border-2 border-black rounded-lg p-4 mb-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="w-10 h-10  sm:w-16 sm:h-16 border-2 border-black rounded-full flex items-center justify-center text-black text-xl sm:text-2xl font-bold flex-shrink-0">
                {user.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black break-words">
                  {t("dashboard.welcome", { username: user.email })}
                </h1>
                <p className="text-sm sm:text-base text-black mt-1">
                  {t("dashboard.subtitle")}
                </p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="w-full sm:w-auto sm:self-end px-4 py-2 cursor-pointer bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              {t("dashboard.signOut")}
            </button>
          </div>
        </div>

        {progressLoading ? (
          <div className="border-2 border-black rounded-lg p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-300 rounded"></div>
                <div className="h-3 bg-gray-300 rounded"></div>
                <div className="h-3 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6">
              <div className="border-2 border-black rounded-lg p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="p-2 rounded-lg mb-2 sm:mb-0">
                    <span className="text-xl sm:text-2xl">📊</span>
                  </div>
                  <div className="sm:ml-4">
                    <p className="text-xs sm:text-sm text-black font-medium">
                      {t("dashboard.stats.overallProgress")}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-black">
                      {overallProgress}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-2 border-black rounded-lg p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="p-2 rounded-lg mb-2 sm:mb-0">
                    <span className="text-xl sm:text-2xl">✅</span>
                  </div>
                  <div className="sm:ml-4">
                    <p className="text-xs sm:text-sm text-black font-medium">
                      {t("dashboard.stats.completedLevels")}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-black">
                      {getTotalCompleted(overviewData)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-2 border-black rounded-lg p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="p-2 rounded-lg mb-2 sm:mb-0">
                    <span className="text-xl sm:text-2xl">🎯</span>
                  </div>
                  <div className="sm:ml-4">
                    <p className="text-xs sm:text-sm text-black font-medium">
                      {t("dashboard.stats.totalLevels")}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-black">
                      {getTotalLevels(overviewData)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-2 border-black rounded-lg p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="p-2 rounded-lg mb-2 sm:mb-0">
                    <span className="text-xl sm:text-2xl">{rank.emoji}</span>
                  </div>
                  <div className="sm:ml-4">
                    <p className="text-xs sm:text-sm text-black font-medium">
                      {t("dashboard.stats.currentRank")}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-black break-words">
                      {t(`dashboard.ranks.${rank.title}`)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress by Difficulty with Level Details */}
            <div className="space-y-4 sm:space-y-6">
              {overviewData &&
                Object.entries(overviewData).map(
                  ([difficulty, overviewInfo]) => {
                    const progressInfo = detailedProgress[difficulty];
                    const progressPercentage = getProgressPercentage(
                      overviewInfo.completed,
                      overviewInfo.total
                    );

                    return (
                      <div
                        key={difficulty}
                        className="border-2 border-black rounded-lg p-3 sm:p-4"
                      >
                        <div className="mb-4 sm:mb-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <span className="text-2xl sm:text-3xl">
                                {getDifficultyIcon(difficulty)}
                              </span>
                              <div>
                                <h2 className="text-xl sm:text-2xl font-bold capitalize text-black">
                                  {t(`dashboard.difficulty.${difficulty}`)}
                                </h2>
                                <p className="text-black text-xs sm:text-sm">
                                  {t("dashboard.levelsCompleted", {
                                    completed: overviewInfo.completed,
                                    total: overviewInfo.total,
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <div className="text-2xl sm:text-3xl font-bold text-black">
                                {progressPercentage}%
                              </div>
                            </div>
                          </div>

                          <div className="relative">
                            <div className="w-full h-6 sm:h-8 border-2 border-black rounded-lg overflow-hidden bg-white">
                              <div
                                className="h-full bg-black transition-all duration-500 flex items-center justify-end pr-2"
                                style={{ width: `${progressPercentage}%` }}
                              >
                                {progressPercentage > 10 && (
                                  <span className="text-white text-xs font-bold">
                                    {overviewInfo.completed}/
                                    {overviewInfo.total}
                                  </span>
                                )}
                              </div>
                            </div>
                            {progressPercentage <= 10 &&
                              progressPercentage > 0 && (
                                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-black text-xs font-bold">
                                  {overviewInfo.completed}/{overviewInfo.total}
                                </span>
                              )}
                          </div>
                        </div>

                        {/* Individual Levels */}
                        {progressInfo && (
                          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-1.5 sm:gap-2">
                            {Array.from(
                              { length: progressInfo.totalLevels },
                              (_, index) => {
                                const levelNumber = index + 1;
                                const status = getLevelStatus(
                                  levelNumber,
                                  progressInfo.completedLevels,
                                  progressInfo.currentLevel
                                );

                                const getStatusStyle = (status: string) => {
                                  switch (status) {
                                    case "completed":
                                      return "bg-black text-white border-2 border-black";
                                    case "current":
                                      return "bg-white text-black border-2 border-black ring-2 ring-black ring-offset-1 sm:ring-offset-2";
                                    case "locked":
                                    default:
                                      return "bg-white text-gray-400 border-2 border-gray-300";
                                  }
                                };

                                return (
                                  <div
                                    key={levelNumber}
                                    className={`
                                    w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold
                                    transition-all duration-200 cursor-pointer
                                    ${getStatusStyle(status)}
                                    active:scale-95 sm:hover:scale-110
                                  `}
                                    title={t("dashboard.levelStatus", {
                                      level: levelNumber,
                                      status: t(`dashboard.status.${status}`),
                                    })}
                                  >
                                    {levelNumber}
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
