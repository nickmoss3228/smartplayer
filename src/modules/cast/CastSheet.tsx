import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoClose } from 'react-icons/io5';
import Sheet from '../../components/Sheet/Sheet';
import { CastAvatar } from './CastAvatar';
import { castTimeline, defaultCastFocus, type CastCard } from './castReveal';

const micro = 'font-mono text-[10px] uppercase tracking-[0.16em]';

/**
 * The story's characters laid out along its parts: who arrived where, where
 * the student is now, and who is still to come. Tapping a face shows that
 * character underneath. Opened at the face that was tapped, or at the newest
 * character met when opened from the stack. A character not reached yet shows
 * only which part they arrive in — the cards themselves carry nothing else.
 */
export const CastSheet: React.FC<{
  cards: CastCard[];
  /** The furthest part this student has reached in this story. */
  reachedPart: number;
  focusKey: string | null;
  accent: string;
  onClose: () => void;
}> = ({ cards, reachedPart, focusKey, accent, onClose }) => {
  const { t } = useTranslation();
  const titleId = useId();
  const detailId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const faceRefs = useRef(new Map<string, HTMLButtonElement>());

  const columns = useMemo(() => castTimeline(cards, reachedPart), [cards, reachedPart]);
  const [selectedKey, setSelectedKey] = useState<string | null>(() => focusKey ?? defaultCastFocus(cards));
  const selected = cards.find((card) => card.key === selectedKey) ?? cards[0];
  const revealed = cards.filter((card) => !card.locked).length;

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

  // A long story's timeline scrolls sideways; open it with the chosen face in view.
  useEffect(() => {
    if (selected) faceRefs.current.get(selected.key)?.scrollIntoView({ block: 'nearest', inline: 'center' });
    // Only on open: a tap already has its face in view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Sheet onClose={onClose} labelledBy={titleId} widthClass="max-w-lg">
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-line p-5">
        <div className="min-w-0">
          <h2 id={titleId} className="m-0 text-lg font-bold text-ink">
            {t('cast.sheetTitle')}
          </h2>
          <p className={`${micro} m-0 mt-0.5 text-dim`}>
            {t('cast.count', { revealed, total: cards.length })}
          </p>
        </div>
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

      {/* The timeline. Columns sit edge to edge so their bars read as one line. */}
      <div className="flex-shrink-0 overflow-x-auto px-3 pt-4 pb-3">
        <ol aria-label={t('cast.timelineAria')} className="m-0 flex min-w-full list-none p-0">
          {columns.map((column) => (
            <li key={column.part} className="flex min-w-[84px] flex-1 flex-col items-center">
              {/* "now" on its own line: beside the part it does not fit a column. */}
              <span className={`${micro} h-[14px] whitespace-nowrap font-bold`} style={{ color: accent }}>
                {column.isNow && t('cast.now')}
              </span>
              <span
                className={`${micro} whitespace-nowrap ${
                  column.isNow ? 'font-bold text-ink' : column.reached ? 'text-dim' : 'text-muted'
                }`}
              >
                {t('cast.partShort', { part: column.part })}
              </span>

              {/* The part they are on is filled up to its dot, not past it. */}
              <span aria-hidden className="relative mt-2 mb-3 flex h-3 w-full items-center">
                <span
                  className={`h-[3px] w-1/2 ${column.reached ? '' : 'bg-line-strong'}`}
                  style={column.reached ? { background: accent } : undefined}
                />
                <span
                  className={`h-[3px] w-1/2 ${column.reached && !column.isNow ? '' : 'bg-line-strong'}`}
                  style={column.reached && !column.isNow ? { background: accent } : undefined}
                />
                {column.isNow && (
                  <span
                    className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-full ring-2 ring-white"
                    style={{ background: accent }}
                  />
                )}
              </span>

              <span className="flex flex-col items-center gap-2">
                {column.cards.map((card) => {
                  const isSelected = card.key === selected?.key;
                  return (
                    <button
                      key={card.key}
                      ref={(el) => {
                        if (el) faceRefs.current.set(card.key, el);
                        else faceRefs.current.delete(card.key);
                      }}
                      type="button"
                      onClick={() => setSelectedKey(card.key)}
                      aria-pressed={isSelected}
                      aria-controls={detailId}
                      aria-label={
                        card.locked
                          ? t('cast.lockedAria', { part: card.firstPart })
                          : t('cast.openAria', { name: card.name })
                      }
                      className="flex w-[76px] flex-col items-center gap-1 rounded-tile py-1 transition
                        focus-visible:outline-2 focus-visible:outline-signal"
                    >
                      <span
                        className={`flex rounded-full border-2 p-[2px] transition ${
                          isSelected ? '' : 'border-transparent hover:border-line-strong'
                        }`}
                        style={isSelected ? { borderColor: accent } : undefined}
                      >
                        <CastAvatar card={card} accent={accent} size={44} />
                      </span>
                      <span
                        className={`max-w-full truncate text-[11px] leading-tight ${
                          isSelected ? 'font-semibold text-ink' : 'text-dim'
                        }`}
                      >
                        {card.locked ? '?' : card.name}
                      </span>
                    </button>
                  );
                })}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Whoever is chosen, in full. */}
      {selected && (
        <section
          id={detailId}
          aria-live="polite"
          className="flex min-h-0 flex-1 gap-4 overflow-y-auto border-t border-line p-5"
        >
          {selected.locked ? (
            <>
              <CastAvatar card={selected} accent={accent} size={72} />
              <div className="min-w-0 self-center">
                <p className="m-0 text-[15px] font-semibold text-dim">
                  {t('cast.meetInPart', { part: selected.firstPart })}
                </p>
                <p className="m-0 mt-1 text-sm text-muted">{t('cast.lockedHint')}</p>
              </div>
            </>
          ) : (
            <>
              {selected.imageUrl ? (
                // The portrait at the story covers' own 4:5, not cropped to a circle.
                <span
                  aria-hidden
                  className="h-[120px] w-[96px] flex-none overflow-hidden rounded-[3px] bg-room"
                  style={{ boxShadow: `0 0 0 2px ${accent}` }}
                >
                  <img
                    src={selected.imageUrl}
                    alt=""
                    decoding="async"
                    className="h-full w-full object-cover object-[50%_18%]"
                  />
                </span>
              ) : (
                <CastAvatar card={selected} accent={accent} size={72} />
              )}
              <div className="min-w-0">
                <h3 className="m-0 text-base font-bold text-ink">{selected.name}</h3>
                {selected.role && <p className="m-0 mt-0.5 text-sm text-dim">{selected.role}</p>}
                {selected.bio && (
                  <p className="m-0 mt-2 text-[15px] leading-relaxed text-ink">{selected.bio}</p>
                )}
                <p className={`${micro} m-0 mt-2 text-muted`}>
                  {t('cast.fromPart', { part: selected.firstPart })}
                </p>
              </div>
            </>
          )}
        </section>
      )}
    </Sheet>
  );
};
