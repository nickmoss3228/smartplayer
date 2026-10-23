import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { IoArrowForward } from 'react-icons/io5';
import MilkGlass from '../../Levels/MilkGlass';
import {
  ENGLISH_LEVEL_OPTIONS,
  LISTENING_OPTIONS,
  difficultyForLevel,
  type EnglishLevel,
  type ListeningExperience,
} from '../../../modules/onboarding/onboardingOptions';
import { CHARACTER_COVER, type DifficultySlug } from '../../../types/storyGroups';
import { Reveal } from '../Reveal';
import './Finder.css';

/** How full each shelf's glass sits, as on /levels. */
const SHELF_FILL: Record<DifficultySlug, number> = { easy: 0.28, medium: 0.58, hard: 0.92 };

const FAT_KEY: Record<DifficultySlug, string> = {
  easy: 'levels.fatEasy',
  medium: 'levels.fatMedium',
  hard: 'levels.fatHard',
};

type Step = 0 | 1 | 2;

/**
 * The two questions /welcome asks after sign-up, answered here without an
 * account, and the shelf they open (the same mapping as onboarding's
 * difficultyForLevel). Step 0 is the English level, 1 the listening
 * experience, 2 the result.
 *
 * ChoiceStep's questions are not reused: they bring their own h1, eyebrow and
 * hint (this page already has its h1), and their radios cannot be pressed
 * again once checked, so "Back" would leave the first answer a dead end.
 */
function ShelfFinder() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(0);
  const [level, setLevel] = useState<EnglishLevel | null>(null);
  const [listening, setListening] = useState<ListeningExperience | null>(null);
  const questionId = useId();
  const questionEl = useRef<HTMLParagraphElement>(null);
  const resultEl = useRef<HTMLSpanElement>(null);
  // Focus follows the step, so a keyboard or screen-reader user is not left on a
  // button that is gone. Not on the first render: that would scroll the page down to here.
  const moved = useRef(false);

  useEffect(() => {
    if (moved.current) (step === 2 ? resultEl : questionEl).current?.focus({ preventScroll: true });
  }, [step]);

  const go = (to: Step) => {
    moved.current = true;
    setStep(to);
  };
  const chooseLevel = (id: EnglishLevel) => {
    setLevel(id);
    go(1);
  };
  const chooseListening = (id: ListeningExperience) => {
    setListening(id);
    go(2);
  };
  const reset = () => {
    setLevel(null);
    setListening(null);
    go(0);
  };

  /** The rail: the steps behind are full, the one being answered shows a sliver until it has an answer. */
  const railFill = (k: number) => {
    if (k < step) return 1;
    if (k > step) return 0;
    if (k === 0) return level ? 1 : 0.15;
    if (k === 1) return listening ? 1 : 0.15;
    return 1;
  };

  const found = step === 2 && level && listening ? { shelf: difficultyForLevel(level), listening } : null;

  return (
    <div className="fd">
      <div className="fd-rail" aria-hidden="true">
        {[0, 1, 2].map((k) => (
          <span key={k}>
            <i style={{ transform: `scaleX(${railFill(k)})` }} />
          </span>
        ))}
      </div>
      <div>
        {found ? (
          <div className="fd">
            <span className="micro" ref={resultEl} tabIndex={-1}>
              {t('landing.finder.result')}
            </span>
            <div className="fd-res">
              <div className="cov">
                <img src={CHARACTER_COVER[found.shelf]} alt="" />
              </div>
              <div className="fd-info">
                <div className="fd-shelf">
                  <span className="fd-glass" style={{ color: `var(--${found.shelf})` }}>
                    <MilkGlass fill={SHELF_FILL[found.shelf]} selected className="h-auto w-full" />
                  </span>
                  <span className="fat tnum">{t(FAT_KEY[found.shelf])}</span>
                </div>
                <p className="h3">{`${t(`levels.${found.shelf}`)} · ${t(`landing.levels.lead.${found.shelf}`)}`}</p>
                <p className="body">{t(`landing.finder.note.${found.listening}`)}</p>
              </div>
            </div>
            <div className="fd-nav">
              <Link className="btn btn-primary" to={`/levels/${found.shelf}`}>
                {t('landing.levels.start', { story: t(`landing.levels.lead.${found.shelf}`) })}
                <IoArrowForward aria-hidden="true" />
              </Link>
              <button type="button" className="link-quiet" onClick={reset}>
                {t('landing.finder.reset')}
              </button>
            </div>
          </div>
        ) : (
          <div className="fd">
            <span className="micro">{t('landing.finder.step', { n: step === 1 ? 2 : 1 })}</span>
            <p className="fd-q" id={questionId} ref={questionEl} tabIndex={-1}>
              {t(step === 1 ? 'onboarding.listening.title' : 'onboarding.level.title')}
            </p>
            <div className="fd-opts" role="radiogroup" aria-labelledby={questionId}>
              {step === 1
                ? LISTENING_OPTIONS.map(({ id, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      className="fd-opt"
                      aria-checked={listening === id}
                      onClick={() => chooseListening(id)}
                    >
                      <span className="ic">
                        <Icon aria-hidden="true" />
                      </span>
                      <span>
                        <b>{t(`onboarding.listening.options.${id}`)}</b>
                      </span>
                    </button>
                  ))
                : ENGLISH_LEVEL_OPTIONS.map(({ id, fill }) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      className="fd-opt"
                      aria-checked={level === id}
                      onClick={() => chooseLevel(id)}
                    >
                      <span className="gl">
                        <MilkGlass fill={fill} selected={level === id} className="h-auto w-full" />
                      </span>
                      <span>
                        <b>{t(`onboarding.level.options.${id}.label`)}</b>
                        <small>{t(`onboarding.level.options.${id}.hint`)}</small>
                      </span>
                    </button>
                  ))}
            </div>
            <div className="fd-nav">
              {step === 1 && (
                <button type="button" className="link-quiet" onClick={() => go(0)}>
                  {t('landing.finder.back')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** «С чего начать»: two questions, and the shelf of stories to start on. */
export function Finder() {
  const { t } = useTranslation();

  return (
    <section className="reg" id="find">
      <div className="wrap grid2" style={{ marginTop: 0 }}>
        <Reveal className="sec-head">
          <p className="eyebrow">{t('landing.finder.label')}</p>
          <h2 className="h2">{t('landing.finder.title')}</h2>
          <p className="body">{t('landing.finder.text')}</p>
        </Reveal>
        <Reveal delay={120} className="democard">
          <ShelfFinder />
        </Reveal>
      </div>
    </section>
  );
}
