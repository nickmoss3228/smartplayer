import React from 'react';
import { useTranslation } from 'react-i18next';
import { FREE_TRIAL_STORIES } from '../../constants/trial';
import type { Theme } from '../../types/LevelProgress';

interface Props {
  level: number;
  index: number;
  status: string;
  isCompleted: boolean;
  isLocked: boolean;
  isGuest: boolean;
  trackTitle: string;
  comicSrc: string | undefined;
  theme: Theme;
  onClick: (level: number) => void;
}

const getStatusRingClass = (status: string) => {
  switch (status) {
    case 'completed': return 'ring-2 ring-green-400/80';
    case 'current':   return 'ring-2 ring-white/80';
    default:          return 'ring-1 ring-white/20';
  }
};

export const LevelCard: React.FC<Props> = ({
  level, index, status, isCompleted, isLocked,
  isGuest, trackTitle, comicSrc, theme, onClick,
}) => {
  const { t } = useTranslation();

  return (
    <div
      onClick={() => onClick(level)}
      className="group cursor-pointer animate-scale-in flex flex-col gap-2 transition-transform duration-300 hover:-translate-y-1 active:scale-95"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Square cover */}
      <div
        className={`
          relative w-full aspect-square rounded-xl overflow-hidden
          bg-gradient-to-br from-white/30 to-white/10
          shadow-md group-hover:shadow-xl transition-shadow duration-300
          ${getStatusRingClass(status)}
        `}
      >
        {/* Artwork */}
        {comicSrc ? (
          <img
            src={comicSrc}
            alt={trackTitle}
            draggable={false}
            className={`
              w-full h-full object-cover object-center
              scale-[1.65] group-hover:scale-[1.82]
              transition-transform duration-500 ease-out
              ${isLocked ? 'brightness-50' : ''}
            `}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${theme.progressGradient} opacity-70`}
          >
            <span className="text-white/60 text-4xl font-bold select-none">♪</span>
          </div>
        )}

        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl z-10 gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 text-white/95 drop-shadow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-white/90 text-[10px] font-semibold tracking-widest uppercase drop-shadow">
              {t('trial.register')}
            </span>
          </div>
        )}

        {/* Number / checkmark badge */}
        {!isLocked && (
          <div
            className={`
              absolute top-2 left-2 w-7 h-7 rounded-full z-10
              flex items-center justify-center shadow-md text-xs font-bold
              ${isCompleted ? 'bg-green-500 text-white' : 'bg-white/90 text-black/80'}
            `}
          >
            {isCompleted ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              level
            )}
          </div>
        )}

        {/* FREE badge */}
        {isGuest && level <= FREE_TRIAL_STORIES && (
          <div className="absolute top-2 right-2 z-10 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow tracking-wide uppercase">
            {t('trial.free')}
          </div>
        )}
      </div>

      {/* Title */}
      <div
        className={`text-sm font-medium leading-tight line-clamp-2 px-0.5 transition-colors ${
          isLocked ? 'text-black/35' : 'text-black/80'
        }`}
      >
        {trackTitle}
      </div>
    </div>
  );
};