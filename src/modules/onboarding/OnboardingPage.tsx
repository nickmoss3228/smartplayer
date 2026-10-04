import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { IoArrowForward, IoChevronBack } from 'react-icons/io5';
import BrandMark from '../../components/Brand/BrandMark';
import { useAuth } from '../../context/AuthContext';
import { forwardedState, returnPathFrom } from '../../auth/returnTo';
import { Notice } from '../../auth/authKit';
import { buttonBase, buttonPrimary, buttonTone } from '../../components/ui/buttonStyles';
import { motionEnter } from '../../components/ui/motion';
import { completeOnboarding, saveOnboardingAnswers } from '../../services/onboardingServices';
import { LevelQuestion, ListeningQuestion } from './ChoiceStep';
import { MethodSlide } from './MethodSlide';
import { SLIDES, unlockMsFor } from './slides';
import { useUnlockTimer } from './useUnlockTimer';
import { onboardingDestination } from './destination';
import { clearResume, loadResume, saveResume } from './resume';
import {
  difficultyForLevel,
  isEnglishLevel,
  isListeningExperience,
  type EnglishLevel,
  type ListeningExperience,
} from './onboardingOptions';

/** Two questions, then the slides. */
const QUESTION_STEPS = 2;
const TOTAL_STEPS = QUESTION_STEPS + SLIDES.length;

/**
 * /welcome — what every account goes through before it listens: new sign-ups,
 * and accounts from before the flow existed, on their next visit. A student
 * can take it again from the Dashboard ("restart" clears onboardedAt, and the
 * gate brings them here).
 *
 * Two questions about the student (their own estimate of their English, and
 * how much they already listen), then the method, one picture at a time — the
 * login screen's five scenes, with the why-questions each one answers (two
 * pairs share a picture) and the five-step loop last. The level answer picks
 * the shelf they land on at the end.
 *
 * Unskippable by design. There is no close, no skip and no navbar, and
 * Layout.tsx sends every other page back here until the flow is finished. A
 * slide's "Next" stays locked until its picture has played one full round
 * (slides.ts); only visible time counts. "Back" is always allowed, and a slide
 * once unlocked stays unlocked.
 *
 * The answers are saved as they are given (best effort), and the position in
 * localStorage, so a reload or a closed tab resumes where it stopped. The
 * finish sends both answers again — it does not depend on those saves.
 */
const OnboardingPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const reduce = Boolean(useReducedMotion());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hintId = useId();

  // Read once: the answers the server already has, and the local position.
  const initial = useMemo(() => {
    const level = isEnglishLevel(user?.englishLevel) ? user.englishLevel : null;
    const listening = isListeningExperience(user?.listeningExperience)
      ? user.listeningExperience
      : null;
    const resume = user ? loadResume(user.id) : null;
    // Never resume past a question that has no answer yet.
    const maxStep = level === null ? 0 : listening === null ? 1 : TOTAL_STEPS - 1;
    const fresh = level === null ? 0 : listening === null ? 1 : QUESTION_STEPS;
    return {
      level,
      listening,
      step: Math.max(0, Math.min(resume?.step ?? fresh, maxStep)),
      unlockedThrough: Math.min(resume?.unlockedThrough ?? -1, TOTAL_STEPS - 1),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately once, on arrival
  }, []);

  const [step, setStep] = useState(initial.step);
  const [level, setLevel] = useState<EnglishLevel | null>(initial.level);
  const [listening, setListening] = useState<ListeningExperience | null>(initial.listening);
  const [unlockedThrough, setUnlockedThrough] = useState(initial.unlockedThrough);
  const [nudge, setNudge] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const slide = step >= QUESTION_STEPS ? SLIDES[step - QUESTION_STEPS] : null;
  const { unlocked: slideUnlocked, progress: slideProgress } = useUnlockTimer(
    slide ? unlockMsFor(slide, reduce) : 0,
    step,
    step <= unlockedThrough,
  );

  // Remember how far the locks have opened, so Back-then-Next never re-locks.
  useEffect(() => {
    if (slide && slideUnlocked && step > unlockedThrough) setUnlockedThrough(step);
  }, [slide, slideUnlocked, step, unlockedThrough]);

  // The nudge is about the step it was shown on.
  useEffect(() => {
    setNudge(false);
  }, [step, slideUnlocked, level, listening]);

  const userId = user?.id;
  useEffect(() => {
    if (userId && !finished) saveResume(userId, { step, unlockedThrough });
  }, [userId, step, unlockedThrough, finished]);

  // A new step starts at the top, with focus on its heading, so a screen
  // reader announces where it now is and the keyboard starts from there.
  useEffect(() => {
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  if (!user) return null;

  // Already through it (or a server that predates the flow): nothing to do
  // here. `finished` covers the instant between finishing and navigating.
  if (user.onboardedAt !== null && !finished) {
    return (
      <Navigate
        to={returnPathFrom(location.state)}
        replace
        state={forwardedState(location.state)}
      />
    );
  }

  const canNext =
    step === 0 ? level !== null : step === 1 ? listening !== null : slideUnlocked;
  const isLast = step === TOTAL_STEPS - 1;

  const finish = async () => {
    if (!level || !listening || finishing) return;
    setFinishing(true);
    setSaveError(false);
    try {
      const state = await completeOnboarding({
        englishLevel: level,
        listeningExperience: listening,
      });
      const destination = onboardingDestination(location.state, difficultyForLevel(level));
      setFinished(true);
      clearResume(user.id);
      updateUser({
        onboardedAt: state.onboardedAt,
        englishLevel: state.englishLevel,
        listeningExperience: state.listeningExperience,
      });
      navigate(destination.to, { replace: true, state: destination.state });
    } catch {
      setSaveError(true);
      setFinishing(false);
    }
  };

  const handleNext = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canNext) {
      setNudge(true);
      return;
    }
    if (step === 0 && level) {
      // Best effort: the finish sends both answers again anyway.
      saveOnboardingAnswers({ englishLevel: level }).catch(() => {});
      updateUser({ englishLevel: level });
    }
    if (step === 1 && listening) {
      saveOnboardingAnswers({ listeningExperience: listening }).catch(() => {});
      updateUser({ listeningExperience: listening });
    }
    if (isLast) {
      void finish();
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const handleBack = () => {
    setSaveError(false);
    setStep((s) => Math.max(0, s - 1));
  };

  // The current segment of the rail fills as the slide's lock opens; a
  // question's segment fills once it is answered.
  const currentFill = slide ? slideProgress : canNext ? 1 : 0;

  const hint = !nudge
    ? ''
    : slide
      ? t('onboarding.waitHint')
      : t('onboarding.pickHint');

  return (
    <div className="flex min-h-[100dvh] flex-col bg-room text-ink">
      <header className="mx-auto w-full max-w-xl px-4 pt-5 sm:px-6 sm:pt-8">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <BrandMark className="h-6 w-6" />
            <span className="text-lg font-extrabold lowercase tracking-tight">{t('brand')}</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
            {t('onboarding.stepOf', { n: step + 1, total: TOTAL_STEPS })}
          </span>
        </div>

        <div className="mt-4 flex gap-1" aria-hidden>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const fill = i < step ? 1 : i > step ? 0 : currentFill;
            return (
              <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full origin-left bg-ink transition-transform duration-200 ease-linear"
                  style={{ transform: `scaleX(${fill})` }}
                />
              </span>
            );
          })}
        </div>
      </header>

      <form onSubmit={handleNext} noValidate className="flex flex-1 flex-col">
        <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-8 pb-10 sm:px-6 sm:pt-10">
          {/* Keyed by step: each one enters fresh (and its viz plays from the
              start). Enter-only, so the new heading exists the moment the
              focus effect above runs. */}
          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={motionEnter}
          >
            {step === 0 && (
              <LevelQuestion value={level} onChange={setLevel} headingRef={headingRef} />
            )}
            {step === 1 && (
              <ListeningQuestion
                value={listening}
                onChange={setListening}
                headingRef={headingRef}
              />
            )}
            {slide && <MethodSlide slide={slide} headingRef={headingRef} />}
          </motion.div>

          {saveError && (
            <div className="mt-6">
              <Notice kind="error">{t('onboarding.saveError')}</Notice>
            </div>
          )}
        </main>

        <footer className="sticky bottom-0 border-t border-line bg-room">
          <div className="mx-auto w-full max-w-xl px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            <p
              id={hintId}
              aria-live="polite"
              className="m-0 min-h-[1.25rem] text-center text-xs leading-5 text-dim"
            >
              {hint}
            </p>
            <div className="mt-1 flex gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className={`${buttonBase} h-12 px-4 ${buttonTone.secondary}`}
                >
                  <IoChevronBack className="h-4 w-4" aria-hidden />
                  {t('onboarding.back')}
                </button>
              )}
              {/* aria-disabled, not disabled: a disabled button cannot be
                  focused or pressed, so it could never explain itself. This
                  one can — pressing it early shows the hint above. */}
              {/* Locked gets its own tone rather than primary + opacity: the
                  primary tone's hover rule would win, and a phone keeps :hover
                  after a tap — so pressing early made it look unlocked. */}
              <button
                type="submit"
                aria-disabled={!canNext || finishing}
                aria-describedby={hintId}
                className={`flex-1 ${
                  !canNext || finishing
                    ? `${buttonBase} h-12 px-6 cursor-not-allowed bg-ink text-white opacity-45`
                    : buttonPrimary
                }`}
              >
                {isLast
                  ? finishing
                    ? t('onboarding.starting')
                    : t('onboarding.start')
                  : t('onboarding.next')}
                {!finishing && <IoArrowForward className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </div>
        </footer>
      </form>
    </div>
  );
};

export default OnboardingPage;
