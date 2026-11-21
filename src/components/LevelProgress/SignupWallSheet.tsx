import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoCloudDoneOutline, IoLockClosed } from 'react-icons/io5';
import Sheet from '../Sheet/Sheet';
import { buttonPrimary, buttonSecondary } from '../ui/buttonStyles';

interface Props {
  onClose: () => void;
  /**
   * 'locked'   — a locked part was tapped (the default).
   * 'finished' — the guest has just passed the last free part of the story:
   *              the same offer, worded as "keep what you have done".
   */
  variant?: 'locked' | 'finished';
  /** Where sign-up/log-in bring the learner back to; defaults to this page. */
  returnTo?: string;
}

/**
 * Says why a part is locked while nothing is sold: the sign-up wall. Both
 * links carry `returnTo`, so the learner lands back on this grid afterwards.
 */
export const SignupWallSheet: React.FC<Props> = ({ onClose, variant = 'locked', returnTo }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const state = { returnTo: returnTo ?? location.pathname + location.search };
  const finished = variant === 'finished';

  return (
    <Sheet onClose={onClose} labelledBy="signup-wall-title">
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-room text-ink">
          {finished ? <IoCloudDoneOutline size={24} aria-hidden /> : <IoLockClosed size={22} aria-hidden />}
        </span>
        <h2 id="signup-wall-title" className="text-lg font-bold text-ink">
          {t(finished ? 'signupWall.finishedTitle' : 'signupWall.title')}
        </h2>
        <p className="text-sm text-dim">{t(finished ? 'signupWall.finishedBody' : 'signupWall.body')}</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <Link to="/signup" state={state} className={buttonPrimary}>
            {t('signupWall.signUp')}
          </Link>
          <Link to="/login" state={state} className={buttonSecondary}>
            {t('signupWall.logIn')}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="h-10 text-sm text-dim hover:text-ink transition-colors"
          >
            {t('signupWall.notNow')}
          </button>
        </div>
      </div>
    </Sheet>
  );
};
