import React from "react";
import { useTranslation } from "react-i18next";
import { StoryOverview, LevelStatus } from "../../types/Dashboard";
import { getLevelStatus } from "./dashboardModule";

interface StoryProgressModalProps {
  story: StoryOverview;
  difficulty: string;
  onClose: () => void;
}

const StoryProgressModal: React.FC<StoryProgressModalProps> = ({
  story,
  difficulty,
  onClose,
}) => {
  const { t } = useTranslation();

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

  const completedCount = story.completedParts.length;
  const percentage =
    story.totalParts > 0
      ? Math.round((completedCount / story.totalParts) * 100)
      : 0;

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="bg-white border-2 border-black rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b-2 border-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{story.characterIcon}</span>
            <div>
              <h2 className="text-xl font-bold text-black">{story.storyName}</h2>
              <p className="text-sm text-gray-500 capitalize">
                {t(`dashboard.difficulty.${difficulty}`)} •{" "}
                {completedCount}/{story.totalParts}{" "}
                {t("dashboard.modal.partsCompleted")}
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

        {/* Progress Bar */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{t("dashboard.modal.progress")}</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full h-3 border-2 border-black rounded-full overflow-hidden bg-white">
            <div
              className="h-full bg-black transition-all duration-500 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Parts Grid */}
        <div className="p-5 overflow-y-auto flex-1">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
            {t("dashboard.modal.storyParts")}
          </p>
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: story.totalParts }, (_, index) => {
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
                    {t("dashboard.modal.part")} {partNumber}
                  </span>
                  {icon && <span>{icon}</span>}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 flex flex-wrap gap-3 text-xs text-gray-500">
            {(
              [
                { status: "completed", label: t("dashboard.status.completed") },
                { status: "current",   label: t("dashboard.status.current")   },
                { status: "available", label: t("dashboard.status.available") },
                { status: "locked",    label: t("dashboard.status.locked")    },
              ] as { status: LevelStatus; label: string }[]
            ).map(({ status, label }) => (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className={`w-4 h-4 rounded border-2 ${
                    status === "completed" ? "bg-black border-black" :
                    status === "current"   ? "bg-white border-black ring-1 ring-black ring-offset-1" :
                    status === "available" ? "bg-white border-black" :
                                            "bg-white border-gray-200"
                  }`}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryProgressModal;