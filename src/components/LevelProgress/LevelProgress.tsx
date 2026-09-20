import React from 'react';
import { SHOP_ENABLED } from '../../config/features';
import { useLevelProgressPage } from './useLevelProgressPage';
import { LevelProgressHeader } from './LevelProgressHeader';
import { LevelProgressBar } from './LevelProgressBar';
import { LevelGrid } from './LevelGrid';
import { LevelLegend } from './LevelLegend';
import { CongratsModal } from '../../modules/levelprogress/congratsModule';
import { LevelProgressSkeleton } from '../../modules/levelprogress/LevelProgressSkeleton';
import { StoryPreviewModal } from '../../modules/storypreview/StoryPreviewModal';
import type { LevelProgressProps } from '../../types/LevelProgress';
import { PaywallModal } from '../Paywall/PaywallModal';
import { storyKey } from '../../config/priceCatalog';
import { useCatalog } from '../../context/CatalogContext';

const LevelProgress: React.FC<LevelProgressProps> = (props) => {
  const catalog = useCatalog();
  const {
    difficulty, storyTitle, theme,
    audioTracks, comics, completedLevels, totalLevels,
    lastListenedLevel, progressPercentage, navigationState,
    isLoading, getLevelData, isPartLocked,
    showCongrats, previewLevel, previewData,
    handleLevelCardClick, handleStartListening,
    handleClosePreview, handleCloseCongrats,
    handleNextDifficulty,
    showPaywall,
    setShowPaywall,
    storyOwned,
    freeParts,
    previewSeconds,
  } = useLevelProgressPage(props);

  if (isLoading) return <LevelProgressSkeleton />;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.background} p-8 transition-all duration-1000 ease-in-out`}>
      <div className="max-w-4xl pt-12 mx-auto">

        <LevelProgressHeader difficulty={difficulty} theme={theme} storyTitle={storyTitle} />

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
          freeParts={storyOwned ? 0 : freeParts}
          previewSeconds={storyOwned ? null : previewSeconds}
          getLevelData={getLevelData}
          isPartLocked={isPartLocked}
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

      {/* One gate for everyone. A guest sees the same offer and is asked to
          sign in at the moment they pick one (see PaywallModal). */}
      <PaywallModal
        // Never while the shop is off: there is nothing to offer, and the
        // guest has already been sent to sign up instead (useLevelProgressPage).
        isOpen={SHOP_ENABLED && showPaywall && !storyOwned}
        theme={theme}
        storyTitle={storyTitle}
        requiredSkus={catalog.skusGranting(storyKey(difficulty, props.storySlug ?? 'leo'))}
        onClose={() => setShowPaywall(false)}
      />
    </div>
  );
};

export default LevelProgress;
