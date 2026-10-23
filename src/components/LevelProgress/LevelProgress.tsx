import React from 'react';
import { useTranslation } from 'react-i18next';
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
import { CastStrip } from '../../modules/cast/CastStrip';
import { CastSheet } from '../../modules/cast/CastSheet';
import { downloadPartHandout } from '../../modules/handout/downloadHandout';
import type { HandoutLabels } from '../../modules/handout/handoutModel';

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
    castCards,
    castFocus,
    handleOpenCast,
    handleCloseCast,
  } = useLevelProgressPage(props);
  const { t, i18n } = useTranslation();
  const storySlug = props.storySlug ?? 'leo';

  // The PDF carries the part's text, so it is offered only where the server
  // will hand it out: an owned story or a free part, never the timed preview.
  const canDownloadPdf = previewLevel !== null && (storyOwned || previewLevel <= freeParts);
  const handleDownloadPdf = async () => {
    if (previewLevel === null) return;
    const label = (key: string) => t(`handout.${key}`);
    const labels: HandoutLabels = {
      site: label('site'),
      level: t(`levelProgress.${difficulty}Title`),
      fat: t(`levels.fat${difficulty.charAt(0).toUpperCase()}${difficulty.slice(1)}`),
      part: label('part'),
      grammar: label('grammar'),
      tip: label('tip'),
      text: label('text'),
      vocabulary: label('vocabulary'),
      phrasal: label('phrasal'),
      english: label('english'),
      russian: label('russian'),
    };
    await downloadPartHandout({
      difficulty,
      storyId: storySlug,
      partNumber: previewLevel,
      locale: i18n.language?.startsWith('ru') ? 'ru' : 'en',
      labels,
    });
  };

  if (isLoading) return <LevelProgressSkeleton />;

  return (
    <div className={`min-h-screen bg-room p-8 transition-all duration-1000 ease-in-out`}>
      <div className="max-w-4xl pt-12 mx-auto">

        <LevelProgressHeader difficulty={difficulty} theme={theme} storyTitle={storyTitle} />

        <CastStrip cards={castCards} accent={theme.accent} onOpen={handleOpenCast} />

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

      {castFocus !== undefined && (
        <CastSheet
          cards={castCards}
          focusKey={castFocus}
          accent={theme.accent}
          onClose={handleCloseCast}
        />
      )}

      <StoryPreviewModal
        isOpen={previewLevel !== null}
        onClose={handleClosePreview}
        onStart={handleStartListening}
        preview={previewData}
        theme={theme}
        onDownloadPdf={canDownloadPdf ? handleDownloadPdf : undefined}
      />

      {/* One gate for everyone. A guest sees the same offer and is asked to
          sign in at the moment they pick one (see PaywallModal). */}
      <PaywallModal
        // Never while the shop is off: there is nothing to offer, and the
        // guest has already been sent to sign up instead (useLevelProgressPage).
        isOpen={SHOP_ENABLED && showPaywall && !storyOwned}
        theme={theme}
        storyTitle={storyTitle}
        requiredSkus={catalog.skusGranting(storyKey(difficulty, storySlug))}
        onClose={() => setShowPaywall(false)}
      />
    </div>
  );
};

export default LevelProgress;
