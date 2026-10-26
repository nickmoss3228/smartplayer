import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './landing.css';
import Slogan from '../Brand/Slogan';
import { useAuth } from '../../context/AuthContext';
import { useVocabProgress } from '../Player/hooks/useVocabProgress';
import { useVocabAudio } from '../Player/hooks/useVocabAudio';
import { SPEED_SEQUENCES } from '../Player/hooks/constants';
import { DANCE_PHRASE, LandingDataContext, useLeoPart1Loader, type LandingContextValue } from './leoPart1';
import { landingStore, useLanding } from './landingStore';
import type { LandingScene } from './scene/landingScene';
import { HeroCard } from './sections/HeroCard';
import { RepeatCard } from './sections/RepeatCard';
import { SpeedCard } from './sections/SpeedCard';
import { SubtitlesCard } from './sections/SubtitlesCard';
import { SpellingCard } from './sections/SpellingCard';
import { Solutions } from './sections/Solutions';
import { ComicCard } from './sections/ComicCard';
import { LevelCard } from './sections/LevelCard';
import { Practice } from './sections/Practice';
import { PathFan } from './sections/PathFan';
import { LoopSection } from './sections/LoopSection';
import { Finder } from './sections/Finder';
import { FinalCta, LandingFooter } from './sections/FinalCta';

/**
 * The landing (/): how malako works, as a guide.
 *
 * Two pinned 3D tracks carry the argument — first listen and repeat, then the three problems (speed,
 * subtitles, spelling), later the comic and the milk glasses — with cards that
 * scroll beneath them on a phone and beside them from 960px. Between and after
 * them, the answers: the player, no subtitles, the word window, practice, the
 * path through the app, and where to start.
 *
 * Every demo uses Leo's real part 1 from the story API, and what a visitor does
 * in it counts as in the app (words go to the копилка, a passed quiz opens part 2).
 * The 3D (three.js) is loaded only here, after first paint; reduced motion or a
 * failed WebGL start shows still versions of the same cards instead.
 */

/** The canvas labels are drawn in Manrope; wait for the weights they use (Latin and Cyrillic), but not forever. */
const fontsReady = (): Promise<unknown> => {
  const fonts = document.fonts;
  if (!fonts?.load) return Promise.resolve();
  const loads = ['500 34px Manrope', '600 54px Manrope', '700 60px Manrope', '800 70px Manrope'].map((f) => fonts.load(f, 'Aa Яя').catch(() => []));
  return Promise.race([Promise.all(loads), new Promise((resolve) => setTimeout(resolve, 2500))]);
};

export default function Landing() {
  const { t, i18n } = useTranslation();
  const data = useLeoPart1Loader();
  const { user } = useAuth();
  const { learnedWords, markLearned } = useVocabProgress(!!user);
  const { playVocabWord, stop: stopWord } = useVocabAudio('landing');
  const wordOwner = useMemo(() => ({ stop: stopWord }), [stopWord]);
  const { audio } = data;
  const playWord = useCallback(
    (_key: string, url: string) => {
      audio?.claim(wordOwner);
      return playVocabWord(url);
    },
    [audio, playVocabWord, wordOwner],
  );
  const ctx = useMemo<LandingContextValue>(() => ({ ...data, learnedWords, markLearned, playWord }), [data, learnedWords, markLearned, playWord]);

  const is3d = useLanding((s) => s.is3d);
  const [booting, setBooting] = useState(true);
  const [failed3d, setFailed3d] = useState(false);
  const [scene, setScene] = useState<LandingScene | null>(null);
  const trackA = useRef<HTMLDivElement>(null);
  const trackB = useRef<HTMLDivElement>(null);
  const stageA = useRef<HTMLDivElement>(null);
  const stageB = useRef<HTMLDivElement>(null);

  // The store outlives the page; a later visit starts from the beginning.
  useEffect(() => () => landingStore.reset(), []);

  // The 3D, rebuilt when the language changes (its labels are drawn into textures).
  useEffect(() => {
    if (!is3d) return;
    let cancelled = false;
    let created: LandingScene | null = null;
    const fail = (reason: string) => {
      console.warn('[landing] 3D off:', reason);
      setFailed3d(true);
      landingStore.set({ is3d: false });
    };
    (async () => {
      const [{ createLandingScene }] = await Promise.all([import('./scene/landingScene'), fontsReady()]);
      if (cancelled || !stageA.current || !stageB.current || !trackA.current || !trackB.current) return;
      const list = (key: string) => t(key, { returnObjects: true }) as string[];
      created = createLandingScene({
        stages: [stageA.current, stageB.current],
        tracks: [trackA.current, trackB.current],
        copy: {
          scenes: list('landing.hero.scenes'),
          hear: t('landing.subtitles.hear'),
          see: t('landing.subtitles.see'),
          eye: t('landing.spelling.eye'),
          ear: t('landing.spelling.ear'),
          ipa: t('landing.spelling.ipa'),
          silent: t('landing.spelling.silent'),
          appNote: t('landing.spelling.appNote'),
          chip: t('landing.spelling.chip'),
        },
        speeds: SPEED_SEQUENCES[3],
        onReady: () => {
          if (!cancelled) setBooting(false);
        },
        onFail: fail,
      });
      if (created && !cancelled) setScene(created);
    })().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
    return () => {
      cancelled = true;
      created?.dispose();
      setScene(null);
      setBooting(true);
    };
  }, [is3d, i18n.language, t]);

  // Leo's part 1 times the dancer and cuts the comic, whichever arrives first.
  const { leo } = data;
  useEffect(() => {
    if (!scene || !leo) return;
    scene.setLeo({ markers: leo.markers, dancePhrase: DANCE_PHRASE, comicUrl: leo.comicUrl, panels: leo.panelQuiz?.panels ?? null });
  }, [scene, leo]);

  return (
    <LandingDataContext.Provider value={ctx}>
      <div className={is3d ? 'landing' : 'landing no3d'}>
        {failed3d && <p className="fallback-note">{t('landing.fallback3d')}</p>}
        <div className="slogan-bar">
          <Slogan />
        </div>

        {/* ═══ Track A · the three problems ═══ */}
        <div className="track" data-first="0" ref={trackA}>
          <div className="stage" aria-hidden="true" ref={stageA}>
            {is3d && booting && <span className="boot">{t('landing.loading3d')}</span>}
          </div>
          <HeroCard />
          <RepeatCard />
          <SpeedCard />
          <SubtitlesCard />
          <SpellingCard />
        </div>

        <Solutions />

        {/* ═══ Track B · what we give back, then the glasses ═══ */}
        <div className="track" data-first="4" ref={trackB}>
          <div className="stage" aria-hidden="true" ref={stageB} />
          <ComicCard />
          <LevelCard />
        </div>

        <main>
          <Practice />
          <PathFan />
          <LoopSection />
          <Finder />
          <FinalCta />
        </main>
        <LandingFooter />
      </div>
    </LandingDataContext.Provider>
  );
}
