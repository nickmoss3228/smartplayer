import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { Theme } from '../../types/LevelProgress';

interface Props {
  difficulty: string;
  theme: Theme;
}

export const LevelProgressHeader: React.FC<Props> = ({ difficulty, theme }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="relative flex items-center mb-10 animate-fade-in">
      <button
        onClick={() => navigate(`/levels/${difficulty}`)}
        className="absolute left-0 flex items-center gap-1.5 text-black/60 cursor-pointer hover:text-black transition-colors text-sm z-10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Вернуться</span>
      </button>

      <div className="w-full text-center px-14 sm:px-20 transform transition-all duration-700 ease-in-out">
        <div className="text-sm sm:text-2xl font-bold text-black/80 mb-1 sm:mb-2 tracking-wider transition-all duration-700 animate-slide-down">
          {t(`levelProgress.${difficulty}Title`)}
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-black/80 transition-all duration-700 animate-slide-up break-words">
          {theme.subtitle}
        </h1>
      </div>
    </div>
  );
};