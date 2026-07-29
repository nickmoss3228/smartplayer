// components/Dashboard/DifficultyModal.tsx
import React, { useState } from "react";
import {
  IoClose,
  IoCheckmark,
  IoPlay,
  IoLockClosedOutline,
  IoChevronDown,
} from "react-icons/io5";
import { DifficultyOverview, LevelStatus } from "../../types/Dashboard";
import {
  getDifficultyIcon,
  getDifficultyTheme,
  getLevelStatus,
} from "./dashboardModule";

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
  const [expandedStory, setExpandedStory] = useState<string | null>(
    // Auto-expand if there's only one story
    overview.stories.length === 1 ? overview.stories[0].storyId : null
  );

  const theme = getDifficultyTheme(difficulty);
  const DifficultyIcon = getDifficultyIcon(difficulty);

  const getStatusStyle = (status: LevelStatus): string => {
    switch (status) {
      case "completed":
        return `${theme.bg} text-white`;
      case "current":
        return "bg-white text-black ring-2 ring-black/70 ring-offset-2";
      case "available":
        return "bg-black/[0.04] text-black/70 hover:bg-black/[0.08]";
      case "locked":
      default:
        return "bg-black/[0.03] text-black/25 cursor-not-allowed";
    }
  };

  const renderStatusIcon = (status: LevelStatus) => {
    switch (status) {
      case "completed": return <IoCheckmark size={14} />;
      case "current":   return <IoPlay size={12} />;
      case "locked":    return <IoLockClosedOutline size={12} />;
      default:          return null;
    }
  };

  const overallPct =
    overview.total > 0
      ? Math.round((overview.completed / overview.total) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[88vh] sm:max-h-[85vh] overflow-hidden flex flex-col animate-slide-up sm:animate-scale-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 flex items-center justify-between flex-shrink-0 border-b border-black/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-2xl ${theme.soft} flex items-center justify-center flex-shrink-0`}>
              <DifficultyIcon className={theme.text} size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-black capitalize truncate">
                {difficulty}
              </h2>
              <p className="text-xs text-black/40">
                {overview.completed} / {overview.total} parts · {overallPct}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-black/[0.04] hover:bg-black/10 transition-colors active:scale-90 duration-150"
            aria-label="Close"
          >
            <IoClose size={18} className="text-black/60" />
          </button>
        </div>

        {/* Overall progress bar */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <div className="w-full h-2.5 rounded-full overflow-hidden bg-black/[0.06]">
            <div
              className={`h-full ${theme.bg} transition-all duration-700 ease-out rounded-full`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

        {/* Stories list */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {overview.stories.length === 0 ? (
            <p className="text-center text-black/30 text-sm py-8">
              No stories available yet.
            </p>
          ) : (
            overview.stories.map((story, storyIndex) => {
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
                  className="rounded-2xl overflow-hidden bg-black/[0.02] border border-black/5 animate-fade-in"
                  style={{ animationDelay: `${storyIndex * 60}ms`, animationFillMode: "backwards" }}
                >
                  {/* Story header — click to expand/collapse */}
                  <button
                    className="w-full flex items-center gap-3 p-4 hover:bg-black/[0.03] transition-colors text-left"
                    onClick={() =>
                      setExpandedStory(isExpanded ? null : story.storyId)
                    }
                  >
                    <span className="text-2xl flex-shrink-0 w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                      {story.characterIcon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-black/85 truncate text-sm">
                          {story.storyName}
                        </p>
                        <span className="text-xs font-bold text-black/50 flex-shrink-0">
                          {storyPct}%
                        </span>
                      </div>
                      <p className="text-[11px] text-black/35 mt-0.5">
                        {story.completedParts.length} / {story.totalParts} parts
                      </p>
                      {/* Mini bar */}
                      <div className="w-full h-1.5 rounded-full overflow-hidden bg-black/[0.06] mt-2">
                        <div
                          className={`h-full ${theme.bg} rounded-full transition-all duration-500`}
                          style={{ width: `${storyPct}%` }}
                        />
                      </div>
                    </div>
                    <IoChevronDown
                      size={16}
                      className={`text-black/30 ml-1 flex-shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Parts grid — shown when expanded */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 animate-fade-in">
                      <p className="text-[10px] uppercase tracking-widest text-black/30 font-semibold mb-3">
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

                            return (
                              <div
                                key={partNumber}
                                className={`
                                  aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5
                                  text-sm font-bold transition-all duration-200
                                  ${getStatusStyle(status)}
                                  ${status !== "locked" ? "cursor-pointer active:scale-90 hover:scale-105" : ""}
                                `}
                                title={`Part ${partNumber} — ${status}`}
                              >
                                <span className="text-[10px] opacity-60">
                                  {partNumber}
                                </span>
                                {renderStatusIcon(status)}
                              </div>
                            );
                          }
                        )}
                      </div>

                      {/* Legend */}
                      <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-black/40">
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
                              className={`w-2.5 h-2.5 rounded-full ${
                                status === "completed"
                                  ? theme.bg
                                  : status === "current"
                                  ? "bg-white ring-2 ring-black/60"
                                  : status === "available"
                                  ? "bg-black/15"
                                  : "bg-black/5"
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
