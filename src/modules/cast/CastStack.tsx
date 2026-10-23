import React from 'react';
import { useTranslation } from 'react-i18next';
import { CastAvatar } from './CastAvatar';
import type { CastCard } from './castReveal';

/** Faces shown before the "+N": a phone has room for 3 beside the title, a desktop for 5. */
const PHONE_FACES = 3;
const DESKTOP_FACES = 5;

/**
 * The story's characters as overlapping faces beside the story title — the
 * compact stand-in for the old full-width strip, so the parts grid can have
 * the screen. The whole stack is one button that opens the sheet at the top;
 * picking a character happens inside the sheet.
 */
export const CastStack: React.FC<{
  cards: CastCard[];
  accent: string;
  onOpen: (key: string | null) => void;
}> = ({ cards, accent, onOpen }) => {
  const { t } = useTranslation();
  if (cards.length === 0) return null;

  const revealed = cards.filter((c) => !c.locked).length;
  const count = t('cast.count', { revealed, total: cards.length });
  const morePhone = cards.length - PHONE_FACES;
  const moreDesktop = cards.length - DESKTOP_FACES;

  return (
    <button
      type="button"
      onClick={() => onOpen(null)}
      aria-label={`${t('cast.label')} · ${count}`}
      className="flex flex-none items-center gap-3 rounded-tile py-1 transition-opacity hover:opacity-80
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
    >
      <span className="flex items-center">
        {cards.slice(0, DESKTOP_FACES).map((card, i) => (
          <span
            key={card.key}
            className={`rounded-full ring-2 ring-room ${i > 0 ? '-ml-2.5' : ''} ${
              i >= PHONE_FACES ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* flex, not block: CastAvatar is a <span> sized by inline width/height */}
            <span className="flex md:hidden">
              <CastAvatar card={card} accent={accent} size={32} />
            </span>
            <span className="hidden md:flex">
              <CastAvatar card={card} accent={accent} size={38} />
            </span>
          </span>
        ))}
        {morePhone > 0 && (
          <span className="ml-1.5 text-xs font-semibold text-dim md:hidden">+{morePhone}</span>
        )}
        {moreDesktop > 0 && (
          <span className="ml-1.5 hidden text-xs font-semibold text-dim md:inline">+{moreDesktop}</span>
        )}
      </span>
      <span className="hidden flex-col items-start leading-tight md:flex">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">{t('cast.label')}</span>
        <span className="text-sm font-semibold text-ink">{count}</span>
      </span>
    </button>
  );
};
