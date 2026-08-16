import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
        The slot is inline-grid with a single cell that every word shares, so
        the outgoing and incoming words stack instead of sitting side by side
        while they cross-fade. Without it the line visibly jumps as each word's
        width lands. `align-bottom` keeps the baseline steady.
      */}
      <span className="inline-grid align-bottom">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={word}
            className="col-start-1 row-start-1 whitespace-nowrap font-black"
            style={{ color: accent }}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: '0.45em' }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: '-0.45em' }}
            transition={{ duration: shouldReduceMotion ? 0.2 : 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}
          </motion.span>
        </AnimatePresence>
      </span>
    </p>
  );
};

export default Slogan;
