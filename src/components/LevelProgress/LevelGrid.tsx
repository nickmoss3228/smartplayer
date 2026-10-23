import React from 'react';
import { useTranslation } from 'react-i18next';
import { LevelCard } from './LevelCard';
import type { Theme } from '../../types/LevelProgress';

interface AudioTrack { id: string; title: string }

interface Props {
  totalLevels: number;
  completedLevels: number[];
  lastListenedLevel: number | null;
  audioTracks: AudioTrack[];
  comics: string[];
  theme: Theme;
  getLevelData: (level: number, lastListened: number | null) => { status: string };
  /** Parts that play in full without owning the story. 0 when owned. */
  freeParts: number;
  /** When set, part 1 is a timed preview of this many seconds. */
  previewSeconds: number | null;
  isPartLocked: (level: number) => boolean;
  onLevelClick: (level: number) => void;
}

/**
 * The grid is sized by the height left on screen, not by its width, so the
 * page fits without scrolling. Stories have 2, 5 or 10 parts:
 *
 *   phone    10 → 2×5 landscape tiles; 5 or fewer → one column of wide strips
 *   desktop  up to 5 across, as many rows as needed
 *
 * The max-h caps keep a short story from stretching two cards over a whole
 * screen: a phone tile is never taller than 0.8× its width, a desktop card
 * never taller than 1.5× its width or 420px. `@container` on the page column
 * is what `cqw` measures. Rows have a floor, so on a very short screen (a
 * phone held sideways) the page scrolls rather than squashing the art.
 */
export const LevelGrid: React.FC<Props> = ({
  totalLevels, completedLevels, lastListenedLevel,
  audioTracks, comics, theme, freeParts, previewSeconds,
  getLevelData, isPartLocked, onLevelClick,
}) => {
  const { t } = useTranslation();

  const phoneCols = totalLevels > 5 ? 2 : 1;
  const desktopCols = Math.min(totalLevels, 5);
  const shape = {
    '--pc': phoneCols,
    '--pr': Math.ceil(totalLevels / phoneCols),
    '--dc': desktopCols,
    '--dr': Math.ceil(totalLevels / desktopCols),
  } as React.CSSProperties;

  return (
    <div
      style={shape}
      className="grid w-full flex-1 min-h-0 gap-2 md:gap-5 animate-fade-in-delay-3
        grid-cols-[repeat(var(--pc),minmax(0,1fr))] grid-rows-[repeat(var(--pr),minmax(88px,1fr))]
        max-h-[calc(var(--pr)*100cqw/var(--pc)*0.8)]
        md:grid-cols-[repeat(var(--dc),minmax(0,1fr))] md:grid-rows-[repeat(var(--dr),minmax(170px,1fr))]
        md:max-h-[min(calc(var(--dr)*100cqw/var(--dc)*1.5),calc(var(--dr)*420px))]
        md:max-w-[calc(var(--dc)*300px)]"
    >
      {Array.from({ length: totalLevels }, (_, index) => {
        const level = index + 1;
        const levelData = getLevelData(level, lastListenedLevel);
        const trackTitle =
          audioTracks.find((tr) => tr.id === level.toString())?.title ||
          `${t('levelProgress.levelLabel')} ${level}`;

        return (
          <LevelCard
            key={level}
            level={level}
            index={index}
            status={levelData.status}
            isCompleted={completedLevels.includes(level)}
            isLocked={isPartLocked(level)}
            freeParts={freeParts}
            previewSeconds={previewSeconds}
            trackTitle={trackTitle}
            comicSrc={comics[level - 1]}
            theme={theme}
            onClick={onLevelClick}
          />
        );
      })}
    </div>
  );
};
