// components/Dashboard/StoryCard.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { StoryOverview } from "../../types/Dashboard";

interface StoryCardProps {
  story: StoryOverview;
  difficulty: string;
  onClick: (story: StoryOverview) => void;
}

const StoryCard: React.FC<StoryCardProps> = ({ story, difficulty, onClick }) => {
  const { t } = useTranslation();

  const completedCount = story.completedParts.length;
  const percentage =
    story.totalParts > 0
      ? Math.round((completedCount / story.totalParts) * 100)
      : 0;

  const isFinished = completedCount === story.totalParts;
  const isStarted  = completedCount > 0;

  return (
    <button
      onClick={() => onClick(story)}
      className="
        group relative w-full text-left
        border-2 border-black rounded-xl p-4
        hover:bg-black hover:text-white
        active:scale-95 transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2
      "
    >
      {/* Finished badge */}
      {isFinished && (
        <span className="absolute top-2 right-2 text-xs bg-black text-white group-hover:bg-white group-hover:text-black px-2 py-0.5 rounded-full font-semibold border border-black transition-colors">
          {t("dashboard.story.finished")}
        </span>
      )}

      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{story.characterIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{story.storyName}</p>
          <p className="text-xs opacity-60">
            {isStarted
              ? t("dashboard.story.partsProgress", {
                  completed: completedCount,
                  total: story.totalParts,
                })
              : t("dashboard.story.notStarted")}
          </p>
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="w-full h-2 border border-black group-hover:border-white rounded-full overflow-hidden bg-white group-hover:bg-white/20 transition-colors">
        <div
          className="h-full bg-black group-hover:bg-white rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs opacity-60 mt-1.5 text-right font-semibold">
        {percentage}%
      </p>
    </button>
  );
};

export default StoryCard;