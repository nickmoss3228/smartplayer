import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const VocabLanguageViz = () => {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  // framer-motion's transition.delay is in seconds — convert from the ms
  // beat values below so the sequence doesn't wait hundreds of seconds.
  const delay = (ms: number) => (shouldReduceMotion ? 0 : ms / 1000);

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <span className="text-5xl" aria-hidden>
        🪑
      </span>

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
            🔊 chair
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
            className="font-semibold text-orange-500"
          >
            👁 стул
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
            🪑
          </motion.span>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay(2200) }}
          className="text-center text-[11px] uppercase tracking-widest text-orange-500 font-bold"
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
            🔊 chair
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
            className="font-semibold text-emerald-600"
          >
            🪑
          </motion.span>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay(1100) }}
          className="text-center text-[11px] uppercase tracking-widest text-emerald-600 font-bold"
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
