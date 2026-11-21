import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchPlayerProgress,
  AdminPlayerProgress,
} from "../../services/adminServices";

interface PlayerProgressModalProps {
  token: string;
  userId: string;
  onClose: () => void;
}

const PlayerProgressModal = ({ token, userId, onClose }: PlayerProgressModalProps) => {
  const { t } = useTranslation("studio");
  const [data, setData] = useState<AdminPlayerProgress | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPlayerProgress(token, userId)
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError(t("players.modal.error"));
      });
  }, [token, userId, t]);

  const diffLabel = (d: string) => t(`common.difficulty.${d}`, { defaultValue: d });

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[3px] shadow-lg p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-black text-lg">
            {data ? t("players.modal.titleNamed", { name: data.nickname }) : t("players.modal.title")}
          </h3>
          <button
            onClick={onClose}
            aria-label={t("players.modal.close")}
            className="text-gray-400 hover:text-black text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!data && !error && <p className="text-gray-500 text-sm">{t("common.loading")}</p>}

        {data && (
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-gray-500">{data.email}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-[3px] p-2 text-center">
                <div className="font-bold text-black">{data.wallet.bitAward}</div>
                <div className="text-xs text-gray-500">BitAward</div>
              </div>
              <div className="bg-gray-50 rounded-[3px] p-2 text-center">
                <div className="font-bold text-black">{data.wallet.bitWord}</div>
                <div className="text-xs text-gray-500">BitWord</div>
              </div>
              <div className="bg-gray-50 rounded-[3px] p-2 text-center">
                <div className="font-bold text-black">{data.wallet.bitPhrase}</div>
                <div className="text-xs text-gray-500">BitPhrase</div>
              </div>
            </div>

            <div>
              <div className="font-semibold text-black mb-1">{t("players.modal.streak")}</div>
              <div className="text-gray-700">
                {t("players.modal.streakValue", { current: data.streak.current, longest: data.streak.longest })}
              </div>
            </div>

            <div>
              <div className="font-semibold text-black mb-1">
                {t("players.modal.listening")}
              </div>
              <div className="text-gray-700">
                {t("players.modal.listeningValue", {
                  minutes: Math.round(data.totalListeningSeconds / 60),
                  words: data.learnedWordsCount,
                })}
              </div>
            </div>

            <div>
              <div className="font-semibold text-black mb-1">{t("players.modal.room")}</div>
              <div className="text-gray-700">{t("players.modal.apartment", { tier: data.apartmentTier })}</div>
            </div>

            <div>
              <div className="font-semibold text-black mb-1">{t("players.modal.levelProgress")}</div>
              {data.levelProgress.length === 0 && (
                <p className="text-gray-400">{t("players.modal.noLevelProgress")}</p>
              )}
              {data.levelProgress.map((p) => (
                <div key={p.difficulty} className="text-gray-700">
                  {t("players.modal.levelRow", {
                    difficulty: diffLabel(p.difficulty),
                    completed: p.completedLevels.length,
                    current: p.currentLevel,
                  })}
                </div>
              ))}
            </div>

            <div>
              <div className="font-semibold text-black mb-1">{t("players.modal.storyProgress")}</div>
              {data.storyProgress.length === 0 && (
                <p className="text-gray-400">{t("players.modal.noStoryProgress")}</p>
              )}
              {data.storyProgress.map((p) => (
                <div key={`${p.difficulty}-${p.storyId}`} className="text-gray-700">
                  {t("players.modal.storyRow", {
                    story: p.storyId,
                    difficulty: diffLabel(p.difficulty),
                    done: p.completedParts.length,
                    current: p.currentPart,
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerProgressModal;
