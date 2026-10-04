import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { CastAvatar } from './CastAvatar';
import type { CastCard } from './castReveal';

/**
 * The story's characters as a row of faces under the story title. Tapping one
 * opens the sheet at that character; "All" opens it at the top. The row
 * scrolls sideways rather than wrapping — a cast of ten would otherwise push
 * the parts grid, the thing the page is for, off a phone screen.
 */
export const CastStrip: React.FC<{
  cards: CastCard[];
  accent: string;
  onOpen: (key: string | null) => void;
}> = ({ cards, accent, onOpen }) => {
  const { t } = useTranslation();
  const headingId = useId();
  if (cards.length === 0) return null;

  const revealed = cards.filter((c) => !c.locked).length;

  return (
    <section aria-labelledby={headingId} className="mb-8 animate-fade-in">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id={headingId} className="m-0 font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
          {t('cast.label')} · {t('cast.count', { revealed, total: cards.length })}
        </h2>
        <button
          type="button"
          onClick={() => onOpen(null)}
          className="-my-2 flex h-11 items-center px-1 text-sm font-semibold text-ink underline-offset-2 hover:underline"
        >
          {t('cast.seeAll')}
        </button>
      </div>

      {/* Bleeds through the page's p-8 so the row scrolls edge to edge; scroll-px
          matches px so snapping does not tuck the first face under the edge. */}
      <ul className="-mx-8 my-0 flex list-none snap-x scroll-px-8 gap-3 overflow-x-auto px-8 pt-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((card) => (
          <li key={card.key} className="flex-none snap-start">
            <button
              type="button"
              onClick={() => onOpen(card.key)}
              aria-label={
                card.locked
                  ? t('cast.lockedAria', { part: card.firstPart })
                  : t('cast.openAria', { name: card.name })
              }
              className="flex w-[68px] flex-col items-center gap-1.5 rounded-tile py-1 transition
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              <CastAvatar card={card} accent={accent} size={56} />
              <span
                className={`block w-full truncate text-center text-xs ${
                  card.locked ? 'font-mono text-[10px] uppercase tracking-[0.08em] text-muted' : 'font-semibold text-ink'
                }`}
              >
                {card.locked ? t('cast.partShort', { part: card.firstPart }) : card.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
