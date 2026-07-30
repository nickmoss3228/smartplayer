import React from "react";
import { useTranslation } from "react-i18next";
import { IoPlay, IoTimerOutline, IoRefresh } from "react-icons/io5";
import { PlayState } from "./useQuestionAudio";

interface QuestionAudioButtonProps {
  playState: PlayState;
  onPress: () => void;
  hasAudio: boolean;
}

const colors: Record<PlayState, string> = {
  idle:           "bg-indigo-500 hover:bg-indigo-600 text-white",
  "playing-fast": "bg-indigo-300 text-white cursor-not-allowed",
  "played-fast":  "bg-amber-500 hover:bg-amber-600 text-white",
  "playing-slow": "bg-amber-300 text-white cursor-not-allowed",
  "played-slow":  "bg-indigo-500 hover:bg-indigo-600 text-white",
};

const QuestionAudioButton: React.FC<QuestionAudioButtonProps> = ({
  playState,
  onPress,
  hasAudio,
}) => {
  const { t } = useTranslation();
  if (!hasAudio) return null;

  const isPlaying = playState === "playing-fast" || playState === "playing-slow";

  const labels: Record<PlayState, string> = {
    idle:           t("quiz.audio.playQuestion"),
    "playing-fast": t("quiz.audio.playing"),
    "played-fast":  t("quiz.audio.playSlowly"),
    "playing-slow": t("quiz.audio.playingSlowly"),
    "played-slow":  t("quiz.audio.playAgain"),
  };

  const Icon =
    playState === "played-fast" || playState === "playing-slow"
      ? IoTimerOutline
      : playState === "played-slow"
      ? IoRefresh
      : IoPlay;

  return (
    // Stacked, not side-by-side — the hint text can wrap freely on mobile
    // without ever squeezing (and wrapping) the button's own label.
    <div className="flex flex-col items-start gap-1.5 mb-6">
      <button
        onClick={onPress}
        disabled={isPlaying}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
          whitespace-nowrap transition-all duration-200 shadow-sm
          ${colors[playState]}
        `}
      >
        {/* Animated sound waves when playing, otherwise a static icon */}
        {isPlaying ? (
          <span className="flex gap-0.5 items-end h-4 flex-shrink-0">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-white animate-bounce"
                style={{
                  height: `${8 + i * 4}px`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </span>
        ) : (
          <Icon size={16} className="flex-shrink-0" />
        )}
        {labels[playState]}
      </button>

      {/* Helper hint */}
      {playState === "played-fast" && (
        <span className="text-xs text-amber-600 font-medium animate-pulse">
          {t("quiz.audio.slowerHint")}
        </span>
      )}
    </div>
  );
};

export default QuestionAudioButton;
