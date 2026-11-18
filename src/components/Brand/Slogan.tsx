import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EASE_ENTER } from '../ui/motion';
import { useTranslation } from 'react-i18next';
import { themes } from '../../modules/levelprogress/themes.levelprogress';

/**
 * "как услышишь — так и <слово>", where the last word keeps changing.
 *
 * The joke only works if the swapped word lands as a surprise, which is why
 * the fixed part and the rotating part are separate nodes: the prefix never
 * moves or re-renders, so the eye stays parked on the slot where the word
 * changes.
 *
 * The rotating word cycles through the three level accents from
 * themes.levelprogress rather than introducing a colour of its own — five
 * words over three colours means the pairing never settles, which reads as
 * motion rather than as a fixed label.
 */

const INTERVAL_MS = 2200;

const ACCENTS = [themes.easy.accent, themes.medium.accent, themes.hard.accent];

const Slogan = ({ className = '' }: { className?: string }) => {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  const fromI18n = t('homepage.slogan.words', { returnObjects: true, defaultValue: null });
  const words: string[] = Array.isArray(fromI18n) ? (fromI18n as string[]) : [];

  useEffect(() => {
    if (words.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [words.length]);

  if (words.length === 0) return null;

  const word = words[index % words.length];
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <p className={className}>
      {t('homepage.slogan.prefix')}{' '}

      {/*
        A fixed box: every word sits, invisible, in the same grid cell, so the
        cell is as wide as the longest word and the line never changes width.
        In a centred line a changing width moved the prefix too, and the old
        `popLayout` exit pulled the leaving word out of the cell, so on phones
        the two words were seen overlapping mid-switch. Now the old word fades
        out before the new one fades in (mode="wait"), in the same place.
      */}
      <span className="inline-grid align-bottom text-left">
        {words.map((w) => (
          <span
            key={`sizer-${w}`}
            aria-hidden="true"
            className="invisible col-start-1 row-start-1 whitespace-nowrap font-extrabold"
          >
            {w}
          </span>
        ))}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={word}
            className="col-start-1 row-start-1 whitespace-nowrap font-extrabold"
            style={{ color: accent }}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: '0.3em' }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: shouldReduceMotion ? 0.15 : 0.16, ease: 'easeIn' } }}
            transition={{ duration: shouldReduceMotion ? 0.2 : 0.34, ease: EASE_ENTER }}
          >
            {word}
          </motion.span>
        </AnimatePresence>
      </span>
    </p>
  );
};

export default Slogan;
