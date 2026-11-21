// components/Dashboard/RankModal.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { IoClose, IoCheckmark, IoLockClosedOutline } from "react-icons/io5";
import { RANKS, getRank, getProgressPercentage, partsForRank } from "./dashboardModule";
import Sheet from "../../components/Sheet/Sheet";

interface RankModalProps {
  /** Parts done, and parts there are, across every level */
  completed: number;
  total: number;
  onClose: () => void;
}

// The full rank ladder, lowest first, with the player's place on it. Same
// shell as DifficultyModal (bottom sheet on phones, centred dialog on desktop).
// Everything on it is counted in parts, never in percent: the ranks are still
// thresholds on the share of parts done, turned into parts by partsForRank.
const RankModal: React.FC<RankModalProps> = ({ completed, total, onClose }) => {
  const { t } = useTranslation();
  const current = getRank(getProgressPercentage(completed, total));
  const currentIndex = RANKS.findIndex((r) => r.title === current.title);
  const next = RANKS[currentIndex + 1];
  const currentAt = partsForRank(current.minProgress, total);
  const nextAt = next ? partsForRank(next.minProgress, total) : total;

  // How far along the bar is from this rank's first part to the next rank's.
  const stepFill =
    next && nextAt > currentAt
      ? Math.round(((completed - currentAt) / (nextAt - currentAt)) * 100)
      : 100;

  return (
    <Sheet onClose={onClose} labelledBy="rank-modal-title">
      {/* Header */}
      <div className="p-5 flex items-center justify-between flex-shrink-0 border-b border-line">
        <div className="min-w-0">
          <h2 id="rank-modal-title" className="text-lg font-bold text-black">
            {t("dashboard.rankModal.title")}
          </h2>
          <p className="text-xs text-black/40">
            {t("dashboard.home.ranksSubtitle", { completed, count: total })}
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
            style={{ width: `${stepFill}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-medium text-black/60">
          {next
            ? t("dashboard.home.toNext", {
                count: Math.max(1, nextAt - completed),
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
                      : rank.minProgress === 0
                        ? t("dashboard.home.fromStart")
                        : t("dashboard.home.unlockAt", {
                            count: partsForRank(rank.minProgress, total),
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
    </Sheet>
  );
};

export default RankModal;
