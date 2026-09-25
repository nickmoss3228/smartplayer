import { IoMusicalNotesOutline } from 'react-icons/io5';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Theme } from '../../types/LevelProgress';

interface Props {
  level: number;
  index: number;
  status: string;
  isCompleted: boolean;
  isLocked: boolean;
  /**
   * How many parts play in full without owning the story. Drives the FREE
   * badge, for guests and signed-in non-owners alike — both get the same
   * allowance. 0 when the story is owned, so an owner sees no badges.
   */
  freeParts: number;
  /** When set, part 1 is a timed preview and wears a seconds badge instead. */
  previewSeconds: number | null;
  trackTitle: string;
  comicSrc: string | undefined;
  theme: Theme;
  onClick: (level: number) => void;
}

const getStatusRingClass = (status: string) => {
  switch (status) {
    case 'completed':    return 'ring-2 ring-green-400/80';
    case 'lastListened': return 'ring-2 ring-white/50';
    default:             return 'ring-1 ring-white/20';
  }
};

export const LevelCard: React.FC<Props> = ({
  level, index, status, isCompleted, isLocked,
  freeParts, previewSeconds, trackTitle, comicSrc, theme, onClick,
}) => {
  const { t } = useTranslation();

  const isFree = level <= freeParts;
  const isPreview = !isFree && previewSeconds !== null && level === 1;

  return (
    <div
      onClick={() => onClick(level)}
      className="group cursor-pointer animate-scale-in flex flex-col gap-2 transition-transform duration-300 hover:-translate-y-1 active:scale-95"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Square cover */}
      <div
        className={`
          relative w-full aspect-square rounded-card overflow-hidden
          bg-gradient-to-br from-white/30 to-white/10 transition-shadow duration-300
          ${getStatusRingClass(status)}
        `}
      >
        {/* Blinking highlight for the last story listened to but not yet finished — colored to the difficulty, not a fixed color */}
        {status === 'lastListened' && (
          <div
            aria-hidden
            className={`absolute inset-0 rounded-card z-20 pointer-events-none border-4 ${theme.lastListenedBorder} animate-blink-ring`}
          />
        )}

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
            <IoMusicalNotesOutline size={36} className="text-white/60" aria-hidden />
          </div>
        )}

        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-card z-10 gap-1.5">
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
            <span className="font-mono text-white/90 text-[10px] tracking-[0.16em] uppercase drop-shadow">
              {t('paywall.locked')}
            </span>
          </div>
        )}

        {/* Number / checkmark badge */}
        {!isLocked && (
          <div
            className={`
              absolute top-2 left-2 w-7 h-7 rounded-full z-10
              flex items-center justify-center text-xs font-bold
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

        {/* FREE / preview badge */}
        {(isFree || isPreview) && (
          <div className="font-mono absolute top-2 right-2 z-10 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded-chip tracking-[0.16em] uppercase">
            {isFree ? t('trial.free') : t('shelf.previewBadge', { seconds: previewSeconds })}
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
