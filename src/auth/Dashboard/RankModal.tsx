// components/Dashboard/RankModal.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { IoClose, IoCheckmark, IoLockClosedOutline } from "react-icons/io5";
import { RANKS, getRank } from "./dashboardModule";

interface RankModalProps {
  progress: number;
  onClose: () => void;
}

// The full rank ladder, lowest first, with the player's place on it. Same
// shell as DifficultyModal (bottom sheet on phones, centred dialog on desktop).
const RankModal: React.FC<RankModalProps> = ({ progress, onClose }) => {
  const { t } = useTranslation();
  const current = getRank(progress);
  const currentIndex = RANKS.findIndex((r) => r.title === current.title);
  const next = RANKS[currentIndex + 1];

  // Share of the way from the current rank's threshold to the next one's.
  const stepPct = next
    ? Math.round(
        ((progress - current.minProgress) /
          (next.minProgress - current.minProgress)) *
          100
      )
    : 100;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4 dialog-backdrop-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rank-modal-title"
        className="bg-white rounded-t-[3px] sm:rounded-[3px] w-full max-w-md max-h-[88vh] sm:max-h-[85vh] overflow-hidden flex flex-col dialog-panel-in shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 flex items-center justify-between flex-shrink-0 border-b border-line">
          <div className="min-w-0">
            <h2 id="rank-modal-title" className="text-lg font-bold text-black">
              {t("dashboard.rankModal.title")}
            </h2>
            <p className="text-xs text-black/40">
              {t("dashboard.rankModal.subtitle", { progress })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-black/[0.04] hover:bg-black/10 transition-colors active:scale-90 duration-150"
            aria-label={t("dashboard.rankModal.close")}
          >
            <IoClose size={18} className="text-black/60" />
          </button>
        </div>

        {/* Progress to the next rank */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <div className="w-full h-2.5 rounded-full overflow-hidden bg-black/[0.06]">
            <div
              className="h-full bg-ink transition-all duration-700 ease-out rounded-full"
              style={{ width: `${stepPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-medium text-black/60">
            {next
              ? t("dashboard.rankModal.toNext", {
                  points: next.minProgress - progress,
                  rank: t(`dashboard.ranks.${next.title}`),
                })
              : t("dashboard.rankModal.maxRank")}
          </p>
        </div>

        {/* Ladder */}
        <ol className="px-5 pb-5 pt-1 overflow-y-auto flex flex-col gap-2">
          {RANKS.map((rank, index) => {
            const Icon = rank.icon;
            const isCurrent = index === currentIndex;
            const isReached = index < currentIndex;

            return (
              <li
                key={rank.title}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex items-center gap-3 rounded-card p-3 border ${
                  isCurrent ? "bg-ink border-ink" : "bg-white border-line"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-tile flex items-center justify-center flex-shrink-0 ${
                    isCurrent
                      ? "bg-white/10 text-white"
                      : isReached
                        ? "bg-black/[0.06] text-black/80"
                        : "bg-black/[0.03] text-black/25"
                  }`}
                >
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-bold truncate ${
                      isCurrent
                        ? "text-white"
                        : isReached
                          ? "text-black/85"
                          : "text-black/40"
                    }`}
                  >
                    {t(`dashboard.ranks.${rank.title}`)}
                  </p>
                  <p
                    className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
                      isCurrent ? "text-white/75" : "text-black/40"
                    }`}
                  >
                    {isCurrent
                      ? t("dashboard.rankModal.current")
                      : isReached
                        ? t("dashboard.rankModal.reached")
                        : t("dashboard.rankModal.unlockAt", {
                            progress: rank.minProgress,
                          })}
                  </p>
                </div>
                {isReached && (
                  <IoCheckmark size={18} className="text-black/60 flex-shrink-0" />
                )}
                {!isReached && !isCurrent && (
                  <IoLockClosedOutline size={16} className="text-black/25 flex-shrink-0" />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default RankModal;
