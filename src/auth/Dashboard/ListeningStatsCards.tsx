// components/Dashboard/ListeningStatsCard.tsx
import React, { useState, useEffect } from "react";
import {
  getTotalListeningSeconds,
  formatListeningTime,
} from "../../hooks/useListeningTimer";

const MILESTONES = [
  { seconds: 3600,   label: "1 hour",    emoji: "🥉" },
  { seconds: 18000,  label: "5 hours",   emoji: "🥈" },
  { seconds: 36000,  label: "10 hours",  emoji: "🥇" },
  { seconds: 108000, label: "30 hours",  emoji: "🏆" },
  { seconds: 360000, label: "100 hours", emoji: "👑" },
];

const getNextMilestone = (totalSeconds: number) => {
  return MILESTONES.find((m) => totalSeconds < m.seconds) ?? null;
};

const ListeningStatsCard: React.FC = () => {
  const [totalSeconds, setTotalSeconds] = useState(getTotalListeningSeconds);

  // Poll localStorage every 10s so the dashboard refreshes while user listens
  useEffect(() => {
    const id = setInterval(() => {
      setTotalSeconds(getTotalListeningSeconds());
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  const nextMilestone = getNextMilestone(totalSeconds);
  const milestoneProgress = nextMilestone
    ? Math.round((totalSeconds / nextMilestone.seconds) * 100)
    : 100;

  const prevMilestone = [...MILESTONES]
    .reverse()
    .find((m) => totalSeconds >= m.seconds);

  return (
    <div className="border-2 border-black rounded-lg p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🎧</span>
        <div>
          <h2 className="text-lg font-bold text-black">
            Listening Time
          </h2>
          <p className="text-xs text-gray-500">
            Track your total listening progress
          </p>
        </div>
      </div>

      {/* Big time display */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl sm:text-5xl font-bold text-black">
          {formatListeningTime(totalSeconds)}
        </span>
        {prevMilestone && (
          <span className="text-2xl" title={prevMilestone.label}>
            {prevMilestone.emoji}
          </span>
        )}
      </div>

      {/* Milestone progress */}
      {nextMilestone && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>
              Next milestone: {nextMilestone.label} {nextMilestone.emoji}
            </span>
            <span>{milestoneProgress}%</span>
          </div>
          <div className="w-full h-3 border-2 border-black rounded-full overflow-hidden bg-white">
            <div
              className="h-full bg-black rounded-full transition-all duration-500"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
        </div>
      )}

      {!nextMilestone && (
        <p className="text-sm font-semibold text-black">
          You've reached the maximum milestone! 👑
        </p>
      )}
    </div>
  );
};

export default ListeningStatsCard;