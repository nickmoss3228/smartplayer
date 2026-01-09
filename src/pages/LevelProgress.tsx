import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { themes } from "../modules/themes.levelprogress";
import { LevelProgressProps, Theme } from "../types/LevelProgress";
import { useLevelProgress } from "../hooks/useLevelProgress";
import { NavigationArrow } from "../modules/NavigationArrow";
import { getLevelStyles } from "../modules/levelprogress.module";
import { useLocation } from "react-router";
import { CongratsModal } from "../modules/congratsModule";
import { LevelProgressSkeleton } from "../components/LevelProgressSkeleton";
import { useProgress } from "../context/ProgressContext"

const LevelProgress: React.FC<LevelProgressProps> = (props) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [showCongrats, setShowCongrats] = useState(false);
  const { progressData } = useProgress();

  // Show skeleton if this difficulty is still loading
 const isLoading = props.difficulty 
  ? progressData[props.difficulty]?.loading && progressData.initialLoad : true

  const {
    difficulty,
    completedLevels,
    currentLevel,
    totalLevels,
    handleLevelClick,
    goToDifficulty,
    getLevelData,
    progressPercentage,
    navigationState,
  } = useLevelProgress(props);

  const theme: Theme = themes[difficulty] || themes.easy;

  // Check if all levels are completed
  const isAllCompleted =
    completedLevels.length === totalLevels ||
    (completedLevels.length === totalLevels - 1 && currentLevel > totalLevels);

  // Get localStorage key for this difficulty
  const getCongratsKey = (diff: string) => `congrats_shown_${diff}`;

  // Check if congrats was already shown for this difficulty
  const hasShownCongrats = (diff: string): boolean => {
    return localStorage.getItem(getCongratsKey(diff)) === "true";
  };

  // Mark congrats as shown for this difficulty
  const markCongratsShown = (diff: string) => {
    localStorage.setItem(getCongratsKey(diff), "true");
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Show congrats modal when all levels completed (only once per difficulty)
  useEffect(() => {
    if (isAllCompleted && !hasShownCongrats(difficulty)) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setShowCongrats(true);
        markCongratsShown(difficulty);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAllCompleted, difficulty]);

  const handleCloseCongrats = () => {
    setShowCongrats(false);
  };

  const handleNextDifficulty = () => {
    setShowCongrats(false);
    if (navigationState.nextDifficulty) {
      goToDifficulty(navigationState.nextDifficulty);
    }
  };

  // Early return with skeleton
  if (isLoading) {
    return <LevelProgressSkeleton />;
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${theme.background} p-8 transition-all duration-1000 ease-in-out`}
    >
      <div className="max-w-4xl pt-16 mx-auto">
        {/* Header with arrows */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-12 animate-fade-in">
          <NavigationArrow
            direction="left"
            difficulty={navigationState.prevDifficulty}
            onClick={() => goToDifficulty(navigationState.prevDifficulty)}
            disabled={!navigationState.prevDifficulty}
          />

          {/* Title and subtitle */}
          <div className="text-center transform transition-all duration-700 ease-in-out flex-1 min-w-0 px-2">
            <div className="text-sm sm:text-2xl md:text-2xl font-bold text-white/80 mb-1 sm:mb-2 tracking-wider transition-all duration-700 animate-slide-down">
              {t(`levelProgress.${difficulty}Title`)}
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-4xl font-bold text-white transition-all duration-700 animate-slide-up break-words">
              {theme.subtitle}
            </h1>
          </div>

          <NavigationArrow
            direction="right"
            difficulty={navigationState.nextDifficulty}
            onClick={() => goToDifficulty(navigationState.nextDifficulty)}
            disabled={!navigationState.nextDifficulty}
          />
        </div>

        {/* Legend */}
        <div className="text-center mb-12 animate-fade-in-delay-1">
          <div className="flex items-center justify-center space-x-4 text-white/80">
            <div className="flex items-center space-x-2 transition-all duration-500">
              <div
                className={`w-4 h-4 bg-gradient-to-r ${theme.completedGradient} rounded transition-all duration-500`}
              ></div>
              <span>{t("levelProgress.completed")}</span>
            </div>
            <div className="flex items-center space-x-2 transition-all duration-500">
              <div
                className={`w-4 h-4 bg-gradient-to-r ${theme.currentGradient} rounded animate-pulse transition-all duration-500`}
              ></div>
              <span>{t("levelProgress.current")}</span>
            </div>
            <div className="flex items-center space-x-2 transition-all duration-500">
              <div className="w-4 h-4 bg-gray-400 rounded transition-all duration-500"></div>
              <span>{t("levelProgress.locked")}</span>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 transition-all duration-500 animate-fade-in-delay-2 hover:bg-white/15">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white transition-all duration-300">
              {t("levelProgress.overallProgress")}
            </h2>
            <span className="text-white/80 transition-all duration-300">
              {completedLevels.length}/{totalLevels}{" "}
              {t("levelProgress.completedCount")}
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 transition-all duration-300">
            <div
              className={`bg-gradient-to-r ${theme.progressGradient} h-3 rounded-full transition-all duration-700 ease-in-out`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Level Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 animate-fade-in-delay-3">
          {Array.from({ length: totalLevels }, (_, index) => {
            const level = index + 1;
            const levelData = getLevelData(level);

            return (
              <div
                key={level}
                onClick={() => handleLevelClick(level)}
                className={`
                  relative aspect-square rounded-2xl flex flex-col items-center justify-center
                  ${getLevelStyles(levelData.status, theme)} animate-scale-in
                `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Level icon/number */}
                <div className="text-3xl font-bold mb-2 transition-all duration-300">
                  {levelData.icon}
                </div>

                {/* Level label */}
                <div className="text-sm font-medium transition-all duration-300">
                  {t("levelProgress.levelLabel")} {level}
                </div>

                {/* Completion badge */}
                {completedLevels.includes(level) && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center transition-all duration-300 animate-bounce-in">
                    <span className="text-yellow-900 text-2xl">★</span>
                  </div>
                )}

                {/* Current level indicator */}
                {level === currentLevel && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                    <div
                      className={`w-3 h-3 bg-gradient-to-r ${theme.currentGradient} rounded-full animate-bounce transition-all duration-500`}
                    ></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Congratulations Modal */}
      <CongratsModal
        isOpen={showCongrats}
        onClose={handleCloseCongrats}
        difficulty={difficulty}
        theme={theme}
        onNextDifficulty={handleNextDifficulty}
        hasNextDifficulty={!!navigationState.nextDifficulty}
      />
    </div>
  );
};

export default LevelProgress;
