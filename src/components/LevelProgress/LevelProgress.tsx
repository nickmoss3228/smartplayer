import React from 'react';
import { useTranslation } from 'react-i18next';
import { SHOP_ENABLED } from '../../config/features';
import { useLevelProgressPage } from './useLevelProgressPage';
import { LevelProgressHeader } from './LevelProgressHeader';
import { LevelSegments } from './LevelSegments';
import { LevelGrid } from './LevelGrid';
import { CongratsModal } from '../../modules/levelprogress/congratsModule';
import { LevelProgressSkeleton } from '../../modules/levelprogress/LevelProgressSkeleton';
import { StoryPreviewModal } from '../../modules/storypreview/StoryPreviewModal';
import type { LevelProgressProps } from '../../types/LevelProgress';
import { PaywallModal } from '../Paywall/PaywallModal';
import { storyKey } from '../../config/priceCatalog';
import { useCatalog } from '../../context/CatalogContext';
import { CastStack } from '../../modules/cast/CastStack';
import { CastSheet } from '../../modules/cast/CastSheet';
import { downloadPartHandout } from '../../modules/handout/downloadHandout';
import type { HandoutLabels } from '../../modules/handout/handoutModel';

const LevelProgress: React.FC<LevelProgressProps> = (props) => {
  const catalog = useCatalog();
  const {
    difficulty, storyTitle, theme,
    audioTracks, comics, completedLevels, totalLevels,
    lastListenedLevel, navigationState,
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

  // One screen, no scroll: the page is exactly the viewport under the fixed
  // 52px navbar and the grid takes whatever height the header and the
  // progress bar leave (LevelGrid). It scrolls only if the grid's minimum row
  // height cannot fit — a phone held sideways.
  return (
    <div className="flex h-[100dvh] flex-col overflow-y-auto bg-room pt-13">
      <div className="@container mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col gap-3 px-4 pt-3 pb-4 md:gap-5 md:px-8 md:pt-7 md:pb-8">

        <LevelProgressHeader
          difficulty={difficulty}
          theme={theme}
          storyTitle={storyTitle}
          aside={<CastStack cards={castCards} accent={theme.accent} onOpen={handleOpenCast} />}
        />

        <LevelSegments
          totalLevels={totalLevels}
          completedLevels={completedLevels}
          lastListenedLevel={lastListenedLevel}
          accent={theme.accent}
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
