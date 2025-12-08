import React from "react";
import { useTranslation } from "react-i18next";
import { Theme } from "../types/LevelProgress";
import { DifficultyType } from "../types/Progress";
// import { useNavigate } from "react-router";


interface CongratsModalProps {
  isOpen: boolean;
  onClose: () => void;
  difficulty: DifficultyType;
  theme: Theme;
  onNextDifficulty?: () => void;
  hasNextDifficulty: boolean;
}

export const CongratsModal:React.FC<CongratsModalProps> = ({
  isOpen,
  onClose,
  difficulty,
  theme,
  onNextDifficulty,
  hasNextDifficulty,
}) => {
  const { t } = useTranslation();
//   const navigate = useNavigate();

  if (!isOpen) return null;

  const handleNextDifficulty = () => {
    onClose();
    if (onNextDifficulty) {
      onNextDifficulty();
    }
  };

  // Confetti pieces configuration
  const confettiPieces = [
    // Row 1
    { left: "10%", delay: "0s", duration: "3s", color: "bg-yellow-400" },
    { left: "20%", delay: "0.2s", duration: "3.5s", color: "bg-pink-400" },
    { left: "30%", delay: "0.4s", duration: "2.8s", color: "bg-blue-400" },
    { left: "40%", delay: "0.1s", duration: "3.2s", color: "bg-green-400" },
    { left: "50%", delay: "0.3s", duration: "2.9s", color: "bg-purple-400" },
    { left: "60%", delay: "0.5s", duration: "3.1s", color: "bg-red-400" },
    { left: "70%", delay: "0.2s", duration: "3.4s", color: "bg-indigo-400" },
    { left: "80%", delay: "0.4s", duration: "2.7s", color: "bg-yellow-400" },
    { left: "90%", delay: "0.1s", duration: "3.3s", color: "bg-pink-400" },
    
    // Row 2 - different colors and timings
    { left: "15%", delay: "0.6s", duration: "3.6s", color: "bg-cyan-400" },
    { left: "25%", delay: "0.3s", duration: "2.9s", color: "bg-orange-400" },
    { left: "35%", delay: "0.5s", duration: "3.2s", color: "bg-lime-400" },
    { left: "45%", delay: "0.2s", duration: "3.4s", color: "bg-rose-400" },
    { left: "55%", delay: "0.4s", duration: "2.8s", color: "bg-teal-400" },
    { left: "65%", delay: "0.1s", duration: "3.5s", color: "bg-violet-400" },
    { left: "75%", delay: "0.3s", duration: "3.1s", color: "bg-amber-400" },
    { left: "85%", delay: "0.5s", duration: "2.9s", color: "bg-emerald-400" },
    
    // Row 3 - more variety
    { left: "12%", delay: "0.7s", duration: "3.3s", color: "bg-fuchsia-400" },
    { left: "28%", delay: "0.4s", duration: "3.0s", color: "bg-sky-400" },
    { left: "42%", delay: "0.6s", duration: "3.2s", color: "bg-red-400" },
    { left: "58%", delay: "0.3s", duration: "3.4s", color: "bg-green-400" },
    { left: "72%", delay: "0.5s", duration: "2.8s", color: "bg-blue-400" },
    { left: "88%", delay: "0.2s", duration: "3.5s", color: "bg-purple-400" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      ></div>

      {/* Confetti Container */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiPieces.map((piece, index) => (
          <div
            key={index}
            className={`absolute w-3 h-3 ${piece.color} rounded-full animate-confetti`}
            style={{
              left: piece.left,
              top: '-20px',
              animationDelay: piece.delay,
              animationDuration: piece.duration,
            }}
          ></div>
        ))}
      </div>

      {/* Modal Content */}
      <div
        className={`relative bg-gradient-to-br ${theme.gradient} rounded-3xl shadow-2xl max-w-md w-full p-8 transform transition-all duration-300 animate-scale-in`}
      >
        {/* Trophy Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="text-8xl animate-bounce-in">🏆</div>
            <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-xl animate-pulse"></div>
          </div>
        </div>

        {/* Congratulations Text */}
        <h2 className="text-4xl font-bold text-white text-center mb-4 animate-fade-in-delay-1">
          {t("congrats.congratulations")}
        </h2>

        <p className="text-white/90 text-center text-lg mb-8 animate-fade-in-delay-2">
          {t("congrats.completedAllLevels", {
            difficulty: t(`congrats.difficulty.${difficulty}`),
          })}
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3 animate-fade-in-delay-3">
          {hasNextDifficulty && (
            <button
              onClick={handleNextDifficulty}
              className={`w-full bg-white text-gray-800 font-semibold py-4 px-6 rounded-xl
                hover:bg-white/90 transform hover:scale-105 transition-all duration-300
                shadow-lg hover:shadow-xl active:scale-95`}
            >
              {t("congrats.tryNextDifficulty")} →
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full bg-white/20 backdrop-blur-sm text-white font-semibold py-4 px-6 rounded-xl
              hover:bg-white/30 transform hover:scale-105 transition-all duration-300
              border-2 border-white/30 hover:border-white/50 active:scale-95"
          >
            {t("congrats.close")}
          </button>
        </div>

        {/* Decorative stars */}
        <div className="absolute -top-6 -right-6 text-6xl animate-bounce-in" style={{ animationDelay: '0.3s' }}>
          ✨
        </div>
        <div className="absolute -bottom-6 -left-6 text-6xl animate-bounce-in" style={{ animationDelay: '0.5s' }}>
          ✨
        </div>
      </div>
    </div>
  );
};

export default CongratsModal;