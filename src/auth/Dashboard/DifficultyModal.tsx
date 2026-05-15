// components/Dashboard/DifficultyModal.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DifficultyOverview, StoryOverview, LevelStatus } from "../../types/Dashboard";
import { getDifficultyIcon, getLevelStatus } from "./dashboardModule";

interface DifficultyModalProps {
  difficulty: string;
  overview: DifficultyOverview;
  onClose: () => void;
}

const DifficultyModal: React.FC<DifficultyModalProps> = ({
  difficulty,
  overview,
  onClose,
}) => {
  const { t } = useTranslation();
  const [expandedStory, setExpandedStory] = useState<string | null>(
    // Auto-expand if there's only one story
    overview.stories.length === 1 ? overview.stories[0].storyId : null
  );

  const getStatusStyle = (status: LevelStatus): string => {
    switch (status) {
      case "completed":
        return "bg-black text-white border-2 border-black";
      case "current":
        return "bg-white text-black border-2 border-black ring-2 ring-black ring-offset-2";
      case "available":
        return "bg-white text-black border-2 border-black hover:bg-gray-100";
      case "locked":
      default:
        return "bg-white text-gray-300 border-2 border-gray-200 cursor-not-allowed";
    }
  };

  const getStatusIcon = (status: LevelStatus): string => {
    switch (status) {
      case "completed": return "✓";
      case "current":   return "▶";
      case "available": return "";
      case "locked":    return "🔒";
    }
  };

  const overallPct =
    overview.total > 0
      ? Math.round((overview.completed / overview.total) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-black rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b-2 border-black flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getDifficultyIcon(difficulty)}</span>
            <div>
              <h2 className="text-xl font-bold text-black capitalize">
                {difficulty}
              </h2>
              <p className="text-sm text-gray-500">
                {overview.completed} / {overview.total} parts completed •{" "}
                {overallPct}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-black hover:bg-black hover:text-white transition-colors font-bold text-lg"
          >
            ×
          </button>
        </div>

        {/* Overall progress bar */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <div className="w-full h-3 border-2 border-black rounded-full overflow-hidden bg-white">
            <div
              className="h-full bg-black transition-all duration-500 rounded-full"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

        {/* Stories list */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {overview.stories.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">
              No stories available yet.
            </p>
          ) : (
            overview.stories.map((story) => {
              const storyPct =
                story.totalParts > 0
                  ? Math.round(
                      (story.completedParts.length / story.totalParts) * 100
                    )
                  : 0;
              const isExpanded = expandedStory === story.storyId;

              return (
                <div
                  key={story.storyId}
                  className="border-2 border-black rounded-xl overflow-hidden"
                >
                  {/* Story header — click to expand/collapse */}
                  <button
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                    onClick={() =>
                      setExpandedStory(isExpanded ? null : story.storyId)
                    }
                  >
                    <span className="text-3xl flex-shrink-0">
                      {story.characterIcon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-black truncate">
                          {story.storyName}
                        </p>
                        <span className="text-sm font-bold text-black flex-shrink-0">
                          {storyPct}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {story.completedParts.length} / {story.totalParts} parts
                      </p>
                      {/* Mini bar */}
                      <div className="w-full h-2 border border-black rounded-full overflow-hidden bg-white mt-2">
                        <div
                          className="h-full bg-black rounded-full transition-all duration-500"
                          style={{ width: `${storyPct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-black font-bold text-lg ml-2 flex-shrink-0">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Parts grid — shown when expanded */}
                  {isExpanded && (
                    <div className="border-t-2 border-black p-4 bg-gray-50">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                        Story Parts
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from(
                          { length: story.totalParts },
                          (_, index) => {
                            const partNumber = index + 1;
                            const status = getLevelStatus(
                              partNumber,
                              story.completedParts,
                              story.currentPart
                            );
                            const icon = getStatusIcon(status);

                            return (
                              <div
                                key={partNumber}
                                className={`
                                  aspect-square rounded-xl flex flex-col items-center justify-center gap-1
                                  text-sm font-bold transition-all duration-200
                                  ${getStatusStyle(status)}
                                  ${status !== "locked" ? "cursor-pointer active:scale-95 hover:scale-105" : ""}
                                `}
                                title={`Part ${partNumber} — ${status}`}
                              >
                                <span className="text-xs opacity-60">
                                  {partNumber}
                                </span>
                                {icon && <span>{icon}</span>}
                              </div>
                            );
                          }
                        )}
                      </div>

                      {/* Legend */}
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
                        {(
                          [
                            { status: "completed" as LevelStatus, label: "Completed" },
                            { status: "current"   as LevelStatus, label: "Current"   },
                            { status: "available" as LevelStatus, label: "Available" },
                            { status: "locked"    as LevelStatus, label: "Locked"    },
                          ]
                        ).map(({ status, label }) => (
                          <div key={status} className="flex items-center gap-1.5">
                            <div
                              className={`w-3 h-3 rounded border-2 ${
                                status === "completed"
                                  ? "bg-black border-black"
                                  : status === "current"
                                  ? "bg-white border-black ring-1 ring-black ring-offset-1"
                                  : status === "available"
                                  ? "bg-white border-black"
                                  : "bg-white border-gray-200"
                              }`}
                            />
                            <span>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DifficultyModal;