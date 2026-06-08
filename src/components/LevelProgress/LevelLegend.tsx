import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Theme } from '../../types/LevelProgress';

interface Props { theme: Theme }

export const LevelLegend: React.FC<Props> = ({ theme }) => {
  const { t } = useTranslation();

  return (
    <div className="text-center mt-22 animate-fade-in-delay-1">
      <div className="flex text-xs items-center justify-center gap-4 text-black/80 flex-wrap gap-y-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-white/90 text-black/80 flex items-center justify-center text-[10px] font-bold shadow-sm ring-1 ring-white/20">
            1
          </div>
          <span>{t('levelProgress.locked')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span>{t('levelProgress.completed')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${theme.progressGradient} ring-2 ring-white/80 shadow-sm`} />
          <span>{t('levelProgress.current')}</span>
        </div>
      </div>
    </div>
  );
};