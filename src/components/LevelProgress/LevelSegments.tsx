import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  totalLevels: number;
  completedLevels: number[];
  /** The part last opened; marked only while it is still unfinished. */
  lastListenedLevel: number | null;
  /** The level's colour (theme.accent) — the same hue as the card's blinking ring. */
  accent: string;
}

/**
 * Progress as one segment per part. It replaces both the old progress card
 * (96px for a single bar) and the legend under the grid: green is the same
 * "done" green as the ✓ badge, and the current part wears the level's colour
 * like the blinking ring on its card, so the cards need no key.
 */
export const LevelSegments: React.FC<Props> = ({
  totalLevels, completedLevels, lastListenedLevel, accent,
}) => {
  const { t } = useTranslation();
  const done = completedLevels.length;
  const current =
    lastListenedLevel !== null && !completedLevels.includes(lastListenedLevel) && lastListenedLevel <= totalLevels
      ? lastListenedLevel
      : null;
  const doneText = t('levelProgress.doneOf', { done, total: totalLevels });

  return (
    <div className="flex flex-none flex-col gap-1.5 animate-fade-in-delay-2">
      <div className="flex justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
        <span>{doneText}</span>
        {done >= totalLevels ? (
          <span>{t('levelProgress.allDone')}</span>
        ) : current !== null ? (
          <span>{t('levelProgress.currentPart', { part: current })}</span>
        ) : null}
      </div>
      <div className="flex gap-[3px]" role="img" aria-label={doneText}>
        {Array.from({ length: totalLevels }, (_, i) => {
          const level = i + 1;
          const isDone = completedLevels.includes(level);
          const isCurrent = level === current;
          return (
            <span
              key={level}
              className={`h-1.5 flex-1 rounded-full ${isDone ? 'bg-green-500' : isCurrent ? 'animate-blink-ring' : 'bg-line'}`}
              style={isCurrent ? { background: accent } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};
