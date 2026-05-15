// components/Dashboard/Dashboard.tsx
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchAllDashboardData } from "../../services/dashboardServices";
import { fetchProfile } from "../../services/profileServices";
import {
  getOverallProgress,
  // getTotalCompleted,
  getRank,
  getProgressPercentage,
  getDifficultyIcon,
} from "./dashboardModule";
import {
  OverviewData,
  DetailedProgressMap,
  // StoryOverview,
  UserProfile,
} from "../../types/Dashboard";
// import StoryProgressModal from "./StoryProgressModal";
// import ListeningStatsCard from "../Dashboard/ListeningStatsCards";
import ProfileEditor from "./ProfileEditor";
import DifficultyModal from "./DifficultyModal";
import AchievementsRow from "./AchievementsRow";

const Dashboard: React.FC = () => {
  const { user, signOut, loading } = useAuth();

  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [detailedProgress, setDetailedProgress] =
    useState<DetailedProgressMap>({});
  const [progressLoading, setProgressLoading] = useState<boolean>(true);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);

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

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const data = await fetchProfile(token);
        setProfile(data);
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setProfileLoading(false);
      }
    };
    if (user) loadProfile();
  }, [user]);

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

  // The stories for the currently selected difficulty (for the modal)
  // const selectedDifficultyStories: StoryOverview[] =
  //   selectedDifficulty && overviewData
  //     ? (overviewData[selectedDifficulty as keyof typeof overviewData]
  //         ?.stories ?? [])
  //     : [];

  return (
  <div className="min-h-screen mt-15 bg-white p-2 sm:p-6">
    <div className="max-w-6xl mx-auto">

      {/* ── Header ── */}
<div className="border-2 border-black rounded-lg p-4 mb-6">
  <div className="flex flex-col sm:flex-row gap-4">

    {/* ── Left: Profile + Sign Out ── */}
    <div className="flex-1 rounded-lg p-4 flex flex-col justify-between gap-4">
      {profileLoading ? (
        <div className="animate-pulse flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-300" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded w-32" />
            <div className="h-3 bg-gray-300 rounded w-48" />
          </div>
        </div>
      ) : profile ? (
        <ProfileEditor profile={profile} onProfileUpdate={setProfile} />
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 border-2 border-black rounded-full flex items-center justify-center text-xl font-bold">
            {user.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-black">{user.email}</p>
            <p className="text-xs text-gray-500">
              Here's an overview of your learning progress.
            </p>
          </div>
        </div>
      )}

      <div>
        <button
          onClick={signOut}
          className="px-4 py-2 cursor-pointer bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>

    {/* ── Right: Rank ── */}
    <div className="sm:w-48 rounded-lg p-4 flex flex-col items-center justify-center gap-2">
      <span className="text-4xl">{rank.emoji}</span>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Current Rank</p>
      <p className="text-xl font-bold text-black capitalize">{rank.title}</p>
      <p className="text-xs text-gray-400">{overallProgress}% overall</p>
    </div>

  </div>
</div>

      {/* ── Stats + Difficulty row ── */}
      {progressLoading ? (
        <div className="border-2 border-black rounded-lg p-4 mb-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-300 rounded w-1/4" />
            <div className="h-3 bg-gray-300 rounded" />
            <div className="h-3 bg-gray-300 rounded" />
          </div>
        </div>
      ) : (
        <>
          
          {/* ── Listening stats + difficulty cards ── */}
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 mb-6">
            {/* <div className="flex-1 min-w-0">
              <ListeningStatsCard />
            </div> */}

            {overviewData &&
              (["easy", "medium", "hard"] as const).map((difficulty) => {
                const info = overviewData[difficulty];
                const pct = getProgressPercentage(info.completed, info.total);
                return (
                  <button
                    key={difficulty}
                    onClick={() => setSelectedDifficulty(difficulty)}
                    className="
                      flex-1 min-w-[130px] border-2 border-black rounded-lg p-3 sm:p-4
                      text-left text-black cursor-pointer hover:bg-black hover:text-white
                      active:scale-95 transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2
                      group
                    "
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getDifficultyIcon(difficulty)}</span>
                      <span className="font-bold capitalize text-sm sm:text-base">
                        {difficulty}
                      </span>
                    </div>
                    <p className="text-2xl font-bold mb-2">{pct}%</p>
                    <p className="text-xs opacity-60 mb-2">
                      {info.completed} / {info.total} parts
                    </p>
                    <div className="w-full h-2 border border-black group-hover:border-white rounded-full overflow-hidden bg-white group-hover:bg-white/20 transition-colors">
                      <div
                        className="h-full bg-black group-hover:bg-white rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs mt-2 opacity-60 font-semibold">
                      Click for details
                    </p>
                  </button>
                );
              })}
          </div>

          {/* ── Achievements ── */}
          <AchievementsRow />
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


{/* ── Two stat cards (completed + rank) ── */}
          {/* <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
            <div className="border-2 border-black rounded-lg p-3 sm:p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="p-2 rounded-lg mb-2 sm:mb-0">
                  <span className="text-xl sm:text-2xl">✅</span>
                </div>
                <div className="sm:ml-4">
                  <p className="text-xs sm:text-sm text-black font-medium">
                    Completed Parts
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
                  <span className="text-xl sm:text-2xl">{rank.emoji}</span>
                </div>
                <div className="sm:ml-4">
                  <p className="text-xs sm:text-sm text-black font-medium">
                    Current Rank
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-black capitalize">
                    {rank.title}
                  </p>
                </div>
              </div>
            </div>
          </div> */}
