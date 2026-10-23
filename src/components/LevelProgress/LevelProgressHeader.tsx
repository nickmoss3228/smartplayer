import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { Theme } from '../../types/LevelProgress';

interface Props {
  difficulty: string;
  theme: Theme;
  storyTitle?: string;
  /** Sits at the right end of the row — the story's characters. */
  aside?: React.ReactNode;
}

/**
 * One left-aligned row: back, level + story title, characters. It used to be
 * a centred two-line block with 40px under it; on a phone that alone pushed
 * the first part card past the middle of the screen.
 */
export const LevelProgressHeader: React.FC<Props> = ({ difficulty, theme, storyTitle, aside }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-none items-center gap-1 md:gap-4 animate-fade-in">
      <button
        onClick={() => navigate(`/levels/${difficulty}`)}
        aria-label={t('levelProgress.back')}
        className="-ml-2 flex h-11 flex-none items-center gap-1.5 px-2 text-sm text-black/60 cursor-pointer hover:text-black transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 md:h-4 md:w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden md:inline">{t('levelProgress.back')}</span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
          {t(`levelProgress.${difficulty}Title`)}
        </div>
        <h1 className="m-0 text-[22px] md:text-[32px] font-extrabold tracking-[-0.03em] leading-tight text-ink line-clamp-2 break-words animate-slide-up">
          {storyTitle ?? theme.subtitle}
        </h1>
      </div>

      {aside}
    </div>
  );
};
