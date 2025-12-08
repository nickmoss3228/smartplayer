import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Theme } from "../types/LevelProgress";
import { DifficultyType } from "../types/Progress";

interface CongratsModalProps {
  isOpen: boolean;
  onClose: () => void;
  difficulty: DifficultyType;
  theme: Theme;
  onNextDifficulty?: () => void;
  hasNextDifficulty: boolean;
}

export const CongratsModal: React.FC<CongratsModalProps> = ({
  isOpen,
  onClose,
  difficulty,
  theme,
  onNextDifficulty,
  hasNextDifficulty,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div
        className={`relative bg-gradient-to-br ${theme.background} rounded-3xl shadow-2xl max-w-md w-full p-8 transform transition-all duration-500 animate-scale-in`}
      >
        {/* Confetti effect */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            ></div>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors duration-200"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Trophy icon */}
        <div className="text-center mb-6">
          <div className="inline-block animate-bounce-in">
            <div className="text-8xl mb-4 animate-pulse">🏆</div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-white text-center mb-4 animate-slide-down">
          {t("congrats.title")}
        </h2>

        {/* Message */}
        <p className="text-white/90 text-center mb-8 text-lg animate-slide-up">
          {t("congrats.message", { difficulty: t(`levelProgress.${difficulty}Title`) })}
        </p>

        {/* Stats */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6 animate-fade-in-delay-1">
          <div className="flex items-center justify-center space-x-2 text-white">
            <span className="text-3xl">⭐</span>
            <span className="text-xl font-semibold">
              {t("congrats.allLevelsCompleted")}
            </span>
            <span className="text-3xl">⭐</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3 animate-fade-in-delay-2">
          {hasNextDifficulty && onNextDifficulty && (
            <button
              onClick={onNextDifficulty}
              className={`w-full bg-gradient-to-r ${theme.completedGradient} text-white font-semibold py-3 px-6 rounded-xl hover:scale-105 transform transition-all duration-300 shadow-lg hover:shadow-xl`}
            >
              {t("congrats.nextDifficulty")} →
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl transform transition-all duration-300"
          >
            {t("congrats.close")}
          </button>
        </div>
      </div>
    </div>
  );
};