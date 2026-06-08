import React from 'react';
import { useLevelProgressPage } from './useLevelProgressPage';
import { LevelProgressHeader } from './LevelProgressHeader';
import { LevelProgressBar } from './LevelProgressBar';
import { LevelGrid } from './LevelGrid';
import { LevelLegend } from './LevelLegend';
import { TrialGateModal } from './TrialGateModal';
import { CongratsModal } from '../../modules/levelprogress/congratsModule';
import { LevelProgressSkeleton } from '../../modules/levelprogress/LevelProgressSkeleton';
import { StoryPreviewModal } from '../../modules/storypreview/StoryPreviewModal';
import type { LevelProgressProps } from '../../types/LevelProgress';

const LevelProgress: React.FC<LevelProgressProps> = (props) => {
  const {
    user, difficulty, theme,
    audioTracks, comics, completedLevels, totalLevels,
    lastListenedLevel, progressPercentage, navigationState,
    isLoading, getLevelData, isTrialLocked,
    showCongrats, previewLevel, previewData, showRegisterPrompt,
    handleLevelCardClick, handleStartListening,
    handleClosePreview, handleCloseCongrats,
    handleNextDifficulty, handleCloseRegisterPrompt,
  } = useLevelProgressPage(props);

  if (isLoading) return <LevelProgressSkeleton />;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.background} p-8 transition-all duration-1000 ease-in-out`}>
      <div className="max-w-4xl pt-12 mx-auto">

        <LevelProgressHeader difficulty={difficulty} theme={theme} />

        <LevelProgressBar
          completedCount={completedLevels.length}
          totalLevels={totalLevels}
          progressPercentage={progressPercentage}
          theme={theme}
        />

        <LevelGrid
          totalLevels={totalLevels}
          completedLevels={completedLevels}
          lastListenedLevel={lastListenedLevel}
          audioTracks={audioTracks}
          comics={comics}
          theme={theme}
          isGuest={!user}
          getLevelData={getLevelData}
          isTrialLocked={isTrialLocked}
          onLevelClick={handleLevelCardClick}
        />
      </div>

      <LevelLegend theme={theme} />

      <CongratsModal
        isOpen={showCongrats}
        onClose={handleCloseCongrats}
        difficulty={difficulty}
        theme={theme}
        onNextDifficulty={handleNextDifficulty}
        hasNextDifficulty={!!navigationState.nextDifficulty}
      />

      <StoryPreviewModal
        isOpen={previewLevel !== null}
        onClose={handleClosePreview}
        onStart={handleStartListening}
        preview={previewData}
        theme={theme}
      />

      <TrialGateModal
        isOpen={showRegisterPrompt}
        theme={theme}
        onClose={handleCloseRegisterPrompt}
      />
    </div>
  );
};

export default LevelProgress;