import React from "react";
import { PlayState } from "./useQuestionAudio";

interface QuestionAudioButtonProps {
  playState: PlayState;
  onPress: () => void;
  hasAudio: boolean;
}

const labels: Record<PlayState, string> = {
  idle:          "▶ Play Question",
  "playing-fast": "🔊 Playing...",
  "played-fast":  "🐢 Play Slowly",
  "playing-slow": "🔊 Playing slowly...",
  "played-slow":  "↩ Play Again",
};

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
  if (!hasAudio) return null;

  const isPlaying = playState === "playing-fast" || playState === "playing-slow";

  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={onPress}
        disabled={isPlaying}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
          transition-all duration-200 shadow-sm
          ${colors[playState]}
        `}
      >
        {/* Animated sound waves when playing */}
        {isPlaying ? (
          <span className="flex gap-0.5 items-end h-4">
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
          <span className="text-base leading-none">
            {playState === "played-fast" ? "🐢" : "🔊"}
          </span>
        )}
        {labels[playState]}
      </button>

      {/* Helper hint */}
      {playState === "played-fast" && (
        <span className="text-xs text-amber-600 font-medium animate-pulse">
          Click again for a slower version
        </span>
      )}
    </div>
  );
};

export default QuestionAudioButton;