import { Link, useLocation } from 'react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { motionEnter, STAGGER } from '../components/ui/motion';
import MilkGlass from '../components/Levels/MilkGlass';
import { themes } from '../modules/levelprogress/themes.levelprogress';
import { buttonPrimary } from '../components/ui/buttonStyles';
import { saveShelfBack } from '../services/shelfBack';
import { firstPartPath, isTryIt, PLAYER_FROM_TRY_IT_STATE } from '../components/IcebergLanding/tryIt';

/**
 * Level picker, told as three glasses of milk.
 *
 * The metaphor does real work rather than decorating: how full the glass is
 * *is* the difficulty, so the three options are comparable at a glance without
 * reading a word — which matters most on the phone, where all three have to
 * share one screen width.
 *
 * The fat percentages are the other half of it. Russian milk is sold by
 * жирность, printed larger than the brand on the carton, and the tints follow
 * the real thing: skim milk is genuinely blue-tinged, cream genuinely yellow.
 * So the colour ramp doubles as the difficulty ramp.
 *
 * Two steps on purpose: a tap pours the glass and only selects it, and the
 * Continue button under the shelf moves on. The last level picked is
 * remembered on this device and comes back already poured, so a returning
 * learner only has to press Continue.
 */

const LAST_LEVEL_KEY = 'malako:lastLevel';

const readLastLevel = (): string => {
  try {
    const saved = localStorage.getItem(LAST_LEVEL_KEY);
    return saved && Object.prototype.hasOwnProperty.call(themes, saved) ? saved : '';
  } catch {
    return '';
  }
};

type Level = {
  id: keyof typeof themes;
  title: string;
  fat: string;
  /** 0–1, how full the glass sits. */
  fill: number;
};

const Levels = () => {
  const [selectedLevel, setSelectedLevel] = useState(readLastLevel);
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  // Arrived from the landing's «Попробуй сам»: «Продолжить» opens the level's
  // first story in the player instead of its shelf (components/IcebergLanding/tryIt.ts).
  const tryIt = isTryIt(useLocation().state);

  const choose = (id: string) => {
    setSelectedLevel(id);
    try {
      localStorage.setItem(LAST_LEVEL_KEY, id);
    } catch {
      // private mode: the choice simply isn't remembered
    }
  };

  const levels: Level[] = [
    { id: 'easy', title: t('levels.easy'), fat: t('levels.fatEasy'), fill: 0.28 },
    { id: 'medium', title: t('levels.medium'), fat: t('levels.fatMedium'), fill: 0.58 },
    { id: 'hard', title: t('levels.hard'), fat: t('levels.fatHard'), fill: 0.92 },
  ];

  const chosen = levels.find((l) => l.id === selectedLevel);

  return (
    // Plain white, same as every other page. White milk stays readable because
    // the contrast that matters is milk against the *tinted glass interior*,
    // not against the page behind it — so the ground doesn't have to carry it.
    <div className="min-h-dvh flex flex-col bg-room pt-14 sm:pt-20">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 sm:py-10">

        {/* ── Header ── */}
        <motion.div
          className="text-center mb-5 sm:mb-10"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={motionEnter}
        >
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-gray-400 mb-2">
            {t('levels.fatLabel')}
          </p>
          <h1 className="text-[26px] sm:text-[30px] lg:text-4xl font-extrabold tracking-[-0.03em] leading-tight text-black">
            {t('levels.selectProficiency')}
          </h1>
          {tryIt && <p className="mt-2 text-[15px] text-dim">{t('levels.tryItHint')}</p>}
        </motion.div>

        {/* ── The shelf ──
              Three columns at every width. Glasses are tall and narrow, so
              even a 360px phone fits all three side by side — which is the
              whole point, since comparing fill levels is the interaction. */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-md sm:max-w-xl">
          {levels.map((level, index) => {
            const isSelected = selectedLevel === level.id;

            return (
              <motion.button
                key={level.id}
                type="button"
                onClick={() => choose(level.id)}
                aria-pressed={isSelected}
                className="group flex flex-col items-center cursor-pointer rounded-card
                  px-1 pt-2 pb-3 sm:px-3
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60
                  focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...motionEnter, delay: 0.1 + index * STAGGER }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              >
                {/* Lift is on an inner wrapper so it composites independently
                    of the entrance animation above it. */}
                <motion.div
                  className="w-full flex flex-col items-center"
                  initial={false}
                  animate={{ y: isSelected ? -6 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                >
                  {/* The glass paints itself from `currentColor`, so the
                      level's accent is set once here and picked up by the
                      outline and the tinted-glass wash alike. */}
                  <MilkGlass
                    fill={level.fill}
                    selected={isSelected}
                    className="w-full max-w-[112px] sm:max-w-[150px] h-auto"
                    style={{ color: themes[level.id].accent }}
                  />

                  {/* Жирность, printed the way a carton prints it — the
                      biggest thing on the pack. Unselected it stays readable
                      (dim ink, 5:1 on the page; gray-400 was 2.3:1): the lift
                      and the pour mark the choice, not a faded label. */}
                  <span
                    className={`mt-2 sm:mt-3 font-extrabold tabular-nums leading-none
                      text-xl sm:text-3xl transition-colors duration-200
                      ${isSelected ? 'text-black' : 'text-dim'}`}
                  >
                    {level.fat}
                  </span>

                  {/* No subtitle: in RU it reads "Базовый" then "Базовый
                      уровень", which is the same word twice. The percentage
                      already carries the ranking the subtitle was doing. */}
                  <span
                    className={`mt-1 text-[11px] sm:text-sm font-bold leading-tight
                      transition-colors duration-200
                      ${isSelected ? 'text-black' : 'text-dim'}`}
                  >
                    {level.title}
                  </span>
                </motion.div>
              </motion.button>
            );
          })}
        </div>

        {/* ── Continue ── */}
        <div className="mt-7 sm:mt-12 w-full max-w-xs px-4 sm:px-0">
          {chosen ? (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionEnter}
            >
              <Link
                to={tryIt ? firstPartPath(chosen.id) : `/levels/${chosen.id}`}
                state={tryIt ? PLAYER_FROM_TRY_IT_STATE : undefined}
                // The shelf this opens goes back here, not to the hub.
                onClick={() => saveShelfBack('/levels')}
                className={`${buttonPrimary} w-full`}
              >
                {t('levels.continue')}
              </Link>
            </motion.div>
          ) : (
            <button disabled className={`${buttonPrimary} w-full`}>
              {t('levels.continue')}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Levels;
