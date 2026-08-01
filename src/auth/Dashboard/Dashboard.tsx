// components/Dashboard/Dashboard.tsx
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { IoLogOutOutline, IoChevronForward } from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
import { fetchAllDashboardData } from "../../services/dashboardServices";
import {
  getOverallProgress,
  getRank,
  getProgressPercentage,
  getDifficultyIcon,
  getDifficultyTheme,
} from "./dashboardModule";
import { OverviewData, DetailedProgressMap } from "../../types/Dashboard";
import ProfileEditor from "./ProfileEditor";
import DifficultyModal from "./DifficultyModal";
import AchievementsRow from "./AchievementsRow";
import WalletRow from "./WalletRow";
import { useProfile } from "../../context/ProfileContext";

const Dashboard: React.FC = () => {
  const { user, signOut, loading } = useAuth();

  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [_detailedProgress, setDetailedProgress] =
    useState<DetailedProgressMap>({});
  const [progressLoading, setProgressLoading] = useState<boolean>(true);

  // Modal state — clicking a difficulty card opens the modal for that difficulty
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null
  );

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      const cachedData = sessionStorage.getItem("dashboardData");
      if (cachedData) {
        const { overviewData, detailedProgress } = JSON.parse(cachedData);
        setOverviewData(overviewData);
        setDetailedProgress(detailedProgress);
        setProgressLoading(false);
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const { overviewData, detailedProgress } =
          await fetchAllDashboardData(token);
        setOverviewData(overviewData);
        setDetailedProgress(detailedProgress);
        sessionStorage.setItem(
          "dashboardData",
          JSON.stringify({ overviewData, detailedProgress })
        );
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setProgressLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const { profile, profileLoading, setProfileDirect } = useProfile();

  // Close modal on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDifficulty(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const overallProgress = getOverallProgress(overviewData);
  const rank = getRank(overallProgress);
  const RankIcon = rank.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-10 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-black/5 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-center">

            {/* ── Profile ── */}
            <div className="flex-1 min-w-0">
              {profileLoading ? (
                <div className="animate-pulse flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-48" />
                  </div>
                </div>
              ) : profile ? (
                <ProfileEditor profile={profile} onProfileUpdate={setProfileDirect} />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-black/5 ring-1 ring-black/10 flex items-center justify-center text-xl font-bold text-black/70">
                    {user.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-black truncate">{user.email}</p>
                    <p className="text-xs text-black/40">
                      Here's an overview of your learning progress.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Rank badge ── */}
            <div
              className={`flex items-center gap-3 sm:flex-col sm:gap-1.5 rounded-2xl p-3.5 sm:p-4 sm:w-40 bg-gradient-to-br ${rank.gradient} shadow-lg flex-shrink-0`}
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <RankIcon size={20} className="text-white" />
              </div>
              <div className="flex-1 sm:text-center min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-white/75 font-semibold">
                  Current Rank
                </p>
                <p className="text-base sm:text-lg font-bold capitalize text-white truncate">
                  {rank.title}
                </p>
              </div>
              <p className="text-xs text-white/75 font-medium flex-shrink-0">
                {overallProgress}%
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-black/5 flex justify-end">
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black/[0.04] hover:bg-black/10 text-black/70 text-sm font-semibold transition-all active:scale-95"
            >
              <IoLogOutOutline size={16} />
              Sign Out
            </button>
          </div>
        </div>

        {/* ── Difficulty progress + Achievements ── */}
        {progressLoading ? (
          <div className="flex flex-col gap-3 mb-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-4 sm:p-5 border border-black/5 animate-pulse">
                <div className="h-11 w-11 bg-gray-200 rounded-2xl mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-2 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* ── Difficulty cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 animate-fade-in-delay-1">
              {overviewData &&
                (["easy", "medium", "hard"] as const).map((difficulty, index) => {
                  const info = overviewData[difficulty];
                  const pct = getProgressPercentage(info.completed, info.total);
                  const theme = getDifficultyTheme(difficulty);
                  const Icon = getDifficultyIcon(difficulty);
                  return (
                    <button
                      key={difficulty}
                      onClick={() => setSelectedDifficulty(difficulty)}
                      className="
                        bg-white rounded-3xl p-4 sm:p-5 text-left
                        border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.05)]
                        hover:shadow-md active:scale-[0.98]
                        transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2
                        animate-scale-in
                      "
                      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-11 h-11 rounded-2xl ${theme.soft} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={theme.text} size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold capitalize text-black/85 text-sm sm:text-base block">
                            {difficulty}
                          </span>
                          <span className="text-[11px] text-black/40">
                            {info.completed} / {info.total} parts
                          </span>
                        </div>
                        <span className="text-xl sm:text-2xl font-extrabold text-black/85 flex-shrink-0">
                          {pct}%
                        </span>
                        <IoChevronForward size={16} className="text-black/20 flex-shrink-0" />
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden bg-black/[0.06]">
                        <div
                          className={`h-full ${theme.bg} rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* ── Wallet ── */}
            <div className="animate-fade-in-delay-2">
              <WalletRow />
            </div>

            {/* ── Achievements ── */}
            <div className="animate-fade-in-delay-2">
              <AchievementsRow />
            </div>
          </>
        )}
      </div>

      {selectedDifficulty && overviewData && (
        <DifficultyModal
          difficulty={selectedDifficulty}
          overview={overviewData[selectedDifficulty as keyof OverviewData]}
          onClose={() => setSelectedDifficulty(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
