import React, { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IoClose } from 'react-icons/io5';
import Sheet from '../../components/Sheet/Sheet';
import { CastAvatar } from './CastAvatar';
import type { CastCard } from './castReveal';

const micro = 'font-mono text-[10px] uppercase tracking-[0.16em]';

/**
 * Everyone in the story, one after another, opened at the character that was
 * tapped. A character not reached yet shows only which part they arrive in.
 */
export const CastSheet: React.FC<{
  cards: CastCard[];
  focusKey: string | null;
  accent: string;
  onClose: () => void;
}> = ({ cards, focusKey, accent, onClose }) => {
  const { t } = useTranslation();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  // Escape to close, focus the close button on open, hand focus back to the
  // avatar that opened it — the same contract as the Dashboard's sheets.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [onClose]);

  // Open at the character that was tapped.
  useEffect(() => {
    if (focusKey) rowRefs.current.get(focusKey)?.scrollIntoView({ block: 'start' });
  }, [focusKey]);

  return (
    <Sheet onClose={onClose} labelledBy={titleId}>
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-line p-5">
        <h2 id={titleId} className="m-0 text-lg font-bold text-ink">
          {t('cast.sheetTitle')}
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t('cast.close')}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-dim transition
            hover:bg-black/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
        >
          <IoClose size={20} />
        </button>
      </div>

      <ul className="m-0 flex-1 list-none overflow-y-auto p-0">
        {cards.map((card) => (
          <li
            key={card.key}
            ref={(el) => {
              if (el) rowRefs.current.set(card.key, el);
              else rowRefs.current.delete(card.key);
            }}
            className={`flex scroll-mt-2 gap-4 border-b border-line px-5 py-4 last:border-b-0 ${
              card.key === focusKey ? 'bg-room' : ''
            }`}
          >
            <CastAvatar card={card} accent={accent} size={64} />
            {card.locked ? (
              <div className="min-w-0 self-center">
                <p className="m-0 text-[15px] font-semibold text-dim">
                  {t('cast.meetInPart', { part: card.firstPart })}
                </p>
                <p className="m-0 mt-1 text-sm text-muted">{t('cast.lockedHint')}</p>
              </div>
            ) : (
              <div className="min-w-0">
                <h3 className="m-0 text-base font-bold text-ink">{card.name}</h3>
                {card.role && <p className="m-0 mt-0.5 text-sm text-dim">{card.role}</p>}
                {card.bio && <p className="m-0 mt-2 text-[15px] leading-relaxed text-ink">{card.bio}</p>}
                <p className={`${micro} m-0 mt-2 text-muted`}>
                  {t('cast.fromPart', { part: card.firstPart })}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Sheet>
  );
};
