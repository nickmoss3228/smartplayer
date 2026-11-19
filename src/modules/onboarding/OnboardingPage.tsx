import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { IoArrowForward, IoChevronBack } from 'react-icons/io5';
import BrandMark from '../../components/Brand/BrandMark';
import { useAuth } from '../../context/AuthContext';
import { forwardedState, returnPathFrom } from '../../auth/returnTo';
import { Notice } from '../../auth/authKit';
import { buttonBase, buttonTone } from '../../components/ui/buttonStyles';
import { motionEnter } from '../../components/ui/motion';
import { GREEN, guideCta } from '../../components/Guide/guideKit';
import { saveLastLevel } from '../../services/lastLevel';
import {
  completeOnboarding,
  saveOnboardingAnswers,
  skipOnboarding,
  type OnboardingState,
} from '../../services/onboardingServices';
import { LevelQuestion, ListeningQuestion } from './ChoiceStep';
import { FeatureTour } from './FeatureTour';
import { onboardingDestination, skipDestination } from './destination';
import { clearResume, loadResume, saveResume } from './resume';
import {
  difficultyForLevel,
  isEnglishLevel,
  isListeningExperience,
  type EnglishLevel,
  type ListeningExperience,
} from './onboardingOptions';

/** Two questions, then one screen of what is in the app. */
const TOUR_STEP = 2;
const TOTAL_STEPS = 3;

/**
 * /welcome — what a new account sees before it listens (and accounts from
 * before the flow, on their next visit). A student can take it again from the
 * Dashboard ("restart" clears onboardedAt, and the gate brings them here).
 *
 * Two questions about the student (their own estimate of their English, and
 * how much they already listen), then the tour: the player, the audio
 * vocabulary, the quizzes, the points, the school and the dashboard, on one
 * screen, with a link to the full guide. Nothing waits on a timer.
 *
 * «Пропустить» is on every question: it ends the flow with whatever was
 * answered so far (POST /complete with `skipped: true`) and goes on to where
 * the student was headed, or the hub. Until the flow is ended one way or the
 * other, Layout.tsx sends every other page here.
 *
 * The level answer picks the shelf the finish lands on, and is remembered as
 * the last level, so the «Уровни» tab opens that shelf too.
 *
 * The answers are saved as they are given (best effort), and the position in
 * localStorage, so a reload resumes where it stopped.
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
    const maxStep = level === null ? 0 : listening === null ? 1 : TOUR_STEP;
    return {
      level,
      listening,
      step: Math.max(0, Math.min(resume?.step ?? maxStep, maxStep)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately once, on arrival
  }, []);

  const [step, setStep] = useState(initial.step);
  const [level, setLevel] = useState<EnglishLevel | null>(initial.level);
  const [listening, setListening] = useState<ListeningExperience | null>(initial.listening);
  const [nudge, setNudge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // The nudge is about the step it was shown on.
  useEffect(() => {
    setNudge(false);
  }, [step, level, listening]);

  const userId = user?.id;
  useEffect(() => {
    if (userId && !finished) saveResume(userId, { step });
  }, [userId, step, finished]);

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

  const isTour = step === TOUR_STEP;
  const canNext = step === 0 ? level !== null : step === 1 ? listening !== null : true;

  /** Ends the flow on the server, then leaves for `to`. */
  const leave = async (
    send: () => Promise<OnboardingState>,
    destination: { to: string; state: unknown },
  ) => {
    if (busy) return;
    setBusy(true);
    setSaveError(false);
    try {
      const state = await send();
      if (state.englishLevel) saveLastLevel(difficultyForLevel(state.englishLevel));
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
      setBusy(false);
    }
  };

  const finish = (to?: string) => {
    if (!level || !listening) return;
    const suggested = onboardingDestination(location.state, difficultyForLevel(level));
    void leave(
      () => completeOnboarding({ englishLevel: level, listeningExperience: listening }),
      to ? { to, state: undefined } : suggested,
    );
  };

  const skip = () => {
    void leave(
      () =>
        skipOnboarding({
          ...(level ? { englishLevel: level } : {}),
          ...(listening ? { listeningExperience: listening } : {}),
        }),
      skipDestination(location.state),
    );
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
    if (isTour) {
      finish();
      return;
    }
    setStep((s) => Math.min(s + 1, TOUR_STEP));
  };

  const handleBack = () => {
    setSaveError(false);
    setStep((s) => Math.max(0, s - 1));
  };

  const width = isTour ? 'max-w-3xl' : 'max-w-xl';
  // The guide's CTA, kept to one line beside «Назад» on a 375px phone.
  const cta = `${guideCta.replace('px-7', 'px-5')} whitespace-nowrap`;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-room text-ink">
      <header className={`mx-auto w-full ${width} px-4 pt-5 sm:px-6 sm:pt-8`}>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <BrandMark className="h-6 w-6" />
            <span className="text-lg font-extrabold lowercase tracking-tight">{t('brand')}</span>
          </span>
          <span className="flex items-center gap-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-dim">
              {t('onboarding.stepOf', { n: step + 1, total: TOTAL_STEPS })}
            </span>
            {!isTour && (
              <button
                type="button"
                onClick={skip}
                disabled={busy}
                className="flex h-9 cursor-pointer items-center rounded-chip border-0 bg-transparent px-2 text-sm font-semibold text-dim
                  transition-colors hover:text-ink disabled:cursor-default disabled:opacity-60
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              >
                {t('onboarding.skip')}
              </button>
            )}
          </span>
        </div>

        <div className="mt-4 flex gap-1.5" aria-hidden>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full bg-line transition-colors duration-200"
              style={i <= step ? { background: GREEN } : undefined}
            />
          ))}
        </div>
      </header>

      <form onSubmit={handleNext} noValidate className="flex flex-1 flex-col">
        <main className={`mx-auto w-full ${width} flex-1 px-4 pt-8 pb-10 sm:px-6 sm:pt-10`}>
          {/* Keyed by step: each one enters fresh. Enter-only, so the new
              heading exists the moment the focus effect above runs. */}
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
            {isTour && (
              <FeatureTour
                headingRef={headingRef}
                busy={busy}
                onOpenGuide={() => finish('/how-to-use')}
              />
            )}
          </motion.div>

          {saveError && (
            <div className="mt-6">
              <Notice kind="error">{t('onboarding.saveError')}</Notice>
            </div>
          )}
        </main>

        <footer className="sticky bottom-0 border-t border-line bg-room">
          <div className={`mx-auto w-full ${width} px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6`}>
            <p
              id={hintId}
              aria-live="polite"
              className="m-0 min-h-[1.25rem] text-center text-xs leading-5 text-dim"
            >
              {nudge ? t('onboarding.pickHint') : ''}
            </p>
            <div className="mt-1 flex gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className={`${buttonBase} h-14 rounded-[14px] px-4 ${buttonTone.secondary}`}
                >
                  <IoChevronBack className="h-4 w-4" aria-hidden />
                  {t('onboarding.back')}
                </button>
              )}
              {/* aria-disabled, not disabled: a disabled button cannot be
                  focused or pressed, so it could never explain itself. This
                  one can — pressing it before choosing shows the hint above. */}
              <button
                type="submit"
                aria-disabled={!canNext || busy}
                aria-describedby={hintId}
                // Locked drops the hover shade rather than fighting it: a phone
                // keeps :hover after a tap, so it would look unlocked.
                className={`flex-1 ${
                  !canNext || busy
                    ? `${cta.replace('hover:bg-gray-800', '')} cursor-not-allowed opacity-45`
                    : `${cta} cursor-pointer`
                }`}
              >
                {isTour
                  ? busy
                    ? t('onboarding.starting')
                    : t('onboarding.start')
                  : t('onboarding.next')}
                {!busy && <IoArrowForward className="h-[18px] w-[18px]" aria-hidden />}
              </button>
            </div>
          </div>
        </footer>
      </form>
    </div>
  );
};

export default OnboardingPage;
