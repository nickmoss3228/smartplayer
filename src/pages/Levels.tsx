import { Link } from 'react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import MilkGlass from '../components/Levels/MilkGlass';
import { themes } from '../modules/levelprogress/themes.levelprogress';

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
 */

type Level = {
  id: keyof typeof themes;
  title: string;
  fat: string;
  /** 0–1, how full the glass sits. */
  fill: number;
};

const Levels = () => {
  const [selectedLevel, setSelectedLevel] = useState('');
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

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
    <div className="min-h-dvh flex flex-col bg-white pt-14 sm:pt-20">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 sm:py-10">

        {/* ── Header ── */}
        <motion.div
          className="text-center mb-5 sm:mb-10"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <p className="text-[9px] sm:text-[10px] tracking-[0.5em] uppercase text-gray-400 mb-2">
            {t('levels.fatLabel')}
          </p>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-black tracking-tighter leading-none">
            {t('levels.selectProficiency')}
          </h1>
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
                onClick={() => setSelectedLevel(level.id)}
                aria-pressed={isSelected}
                className="group flex flex-col items-center cursor-pointer rounded-2xl
                  px-1 pt-2 pb-3 sm:px-3
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60
                  focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.09, ease: 'easeOut' }}
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
                      biggest thing on the pack. */}
                  <span
                    className={`mt-2 sm:mt-3 font-black tabular-nums leading-none
                      text-xl sm:text-3xl transition-colors duration-200
                      ${isSelected ? 'text-black' : 'text-gray-400'}`}
                  >
                    {level.fat}
                  </span>

                  {/* No subtitle: in RU it reads "Базовый" then "Базовый
                      уровень", which is the same word twice. The percentage
                      already carries the ranking the subtitle was doing. */}
                  <span
                    className={`mt-1 text-[11px] sm:text-sm font-bold leading-tight
                      transition-colors duration-200
                      ${isSelected ? 'text-black' : 'text-gray-500'}`}
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
            <Link to={`/levels/${chosen.id}`} className="block">
              <motion.button
                className="w-full py-3 bg-black text-white font-bold text-sm
                  tracking-[0.2em] uppercase cursor-pointer
                  hover:bg-gray-800 transition-colors"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {t('levels.continue')}
              </motion.button>
            </Link>
          ) : (
            <button
              disabled
              className="w-full py-3 border border-gray-200 text-gray-300 font-bold
                text-sm tracking-[0.2em] uppercase cursor-not-allowed"
            >
              {t('levels.continue')}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Levels;
