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
  comics: any[];
  theme: Theme;
  getLevelData: (level: number, lastListened: number | null) => { status: string };
  /** Parts that play in full without owning the story. 0 when owned. */
  freeParts: number;
  /** When set, part 1 is a timed preview of this many seconds. */
  previewSeconds: number | null;
  isPartLocked: (level: number) => boolean;
  onLevelClick: (level: number) => void;
}

export const LevelGrid: React.FC<Props> = ({
  totalLevels, completedLevels, lastListenedLevel,
  audioTracks, comics, theme, freeParts, previewSeconds,
  getLevelData, isPartLocked, onLevelClick,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-5 animate-fade-in-delay-3">
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
