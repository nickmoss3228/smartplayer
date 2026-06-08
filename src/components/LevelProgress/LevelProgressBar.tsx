import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Theme } from '../../types/LevelProgress';

interface Props {
  completedCount: number;
  totalLevels: number;
  progressPercentage: number;
  theme: Theme;
}

export const LevelProgressBar: React.FC<Props> = ({
  completedCount,
  totalLevels,
  progressPercentage,
  theme,
}) => {
  const { t } = useTranslation();

  return (
    <div className="backdrop-blur-sm rounded-2xl p-6 mb-5 transition-all duration-500 animate-fade-in-delay-2 hover:bg-white/80">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-black/80">
          {t('levelProgress.overallProgress')}
        </h2>
        <span className="text-black/80 text-sm">
          {completedCount}/{totalLevels} {t('levelProgress.completedCount')}
        </span>
      </div>
      <div className="w-full bg-white/20 rounded-full h-3">
        <div
          className={`bg-gradient-to-r ${theme.progressGradient} h-3 rounded-full transition-all duration-700 ease-in-out`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};