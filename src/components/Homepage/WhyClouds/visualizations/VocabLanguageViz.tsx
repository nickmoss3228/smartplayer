import { IoEyeOutline, IoVolumeHighOutline } from 'react-icons/io5';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/* Drawn rather than an emoji (CLAUDE.md: no emoji) — the same one-stroke
   chair the auth panel draws, so the object reads the same everywhere. */
const Chair = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={`inline-block ${className}`} fill="none" stroke="currentColor"
    strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M34 12 V88 M34 54 H74 V88 M34 12 H48 V54" />
  </svg>
);

/** "chair", as heard: a speaker, then the English word. */
const Heard = () => (
  <>
    <IoVolumeHighOutline className="inline h-4 w-4 align-[-2px]" aria-hidden /> chair
  </>
);

const VocabLanguageViz = () => {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  // framer-motion's transition.delay is in seconds — convert from the ms
  // beat values below so the sequence doesn't wait hundreds of seconds.
  const delay = (ms: number) => (shouldReduceMotion ? 0 : ms / 1000);

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <Chair className="w-14 h-14 text-gray-900" />

      <div className="flex flex-col gap-5 w-full max-w-xs">
        {/* Track A — via translation: this is literally what our own vocab
            chips do (see VocabChip.tsx) — the on-screen word is the Russian
            translation, but tapping it plays the ENGLISH pronunciation. The
            two don't sound remotely alike, so reading the chip can't train
            your ear for the audio you just heard — you have to consciously
            translate before arriving at the meaning. Two extra hops. */}
        <div className="flex items-center justify-center gap-2 text-sm sm:text-base">
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay(0), duration: 0.4 }}
            className="font-semibold text-gray-400"
          >
            <Heard />
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay(500), duration: 0.4 }}
            className="text-gray-400"
          >
            →
          </motion.span>
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay(900), duration: 0.4 }}
            className="font-semibold text-amber-700"
          >
            <IoEyeOutline className="inline h-4 w-4 align-[-2px]" aria-hidden /> стул
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay(1400), duration: 0.4 }}
            className="text-gray-400"
          >
            →
          </motion.span>
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay(1800), duration: 0.4 }}
            className="font-semibold text-gray-600"
          >
            <Chair className="h-5 w-5" />
          </motion.span>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay(2200) }}
          className="font-mono text-center text-[11px] uppercase tracking-[0.18em] text-amber-700"
        >
          {t('homepage.why.vocabLanguage.viaTranslation')} · 2×
        </motion.p>

        {/* Track B — direct: hear it, know it, no detour through text at all */}
        <div className="flex items-center justify-center gap-2 text-sm sm:text-base mt-2">
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay(200), duration: 0.4 }}
            className="font-semibold text-gray-400"
          >
            <Heard />
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay(500), duration: 0.4 }}
            className="text-gray-400"
          >
            →
          </motion.span>
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay(800), duration: 0.4 }}
            className="font-semibold text-green-700"
          >
            <Chair className="h-5 w-5" />
          </motion.span>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay(1100) }}
          className="font-mono text-center text-[11px] uppercase tracking-[0.18em] text-green-700"
        >
          {t('homepage.why.vocabLanguage.direct')}
        </motion.p>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(2600) }}
        className="text-sm text-gray-500 max-w-xs text-center"
      >
        {t('homepage.why.vocabLanguage.takeaway')}
      </motion.p>
    </div>
  );
};

export default VocabLanguageViz;
