import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const WORDS = ['What', 'do', 'you', 'want', 'to', 'do', 'tonight'];
const BEAT_MS = 1000;

// Word/letter spacing alone conveys "mashed together → legible" — earlier
// this also animated `filter: blur()`, but that forces a per-frame GPU blur
// recompute and was the main cause of choppiness on mobile (iPhone 12).
const STAGE_GAP = ['0em', '0.12em', '0.35em'];

const SpeedsViz = () => {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [stage, setStage] = useState(shouldReduceMotion ? 2 : 0);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const timers = [1, 2  ].map((s) => setTimeout(() => setStage(s), s * BEAT_MS));
    return () => timers.forEach(clearTimeout);
  }, [shouldReduceMotion]);

  const tags = [
    t('homepage.why.speeds.tagFast'),
    t('homepage.why.speeds.tagMid'),
    t('homepage.why.speeds.tagSlow'),
  ];
  const currentGap = STAGE_GAP[stage];

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <motion.div
        animate={{ gap: currentGap }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-wrap justify-center text-lg sm:text-xl font-bold text-gray-800"
      >
        {WORDS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </motion.div>

      <div className="flex gap-3">
        {tags.map((tag, i) => (
          <span
            key={tag}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors duration-300 ${
              stage === i ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {tag}
          </span>
        ))}
      </div>

      {stage === 2 && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-gray-500 max-w-xs"
        >
          {t('homepage.why.speeds.takeaway')}
        </motion.p>
      )}
    </div>
  );
};

export default SpeedsViz;
