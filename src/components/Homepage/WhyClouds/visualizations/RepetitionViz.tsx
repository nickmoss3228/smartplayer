import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const PHRASE = 'I like the way you move';
const BEAT_MS = 900;

const STEP_STYLE = [
  'text-gray-300 font-normal',
  'text-gray-500 font-medium',
  'text-gray-700 font-semibold',
  'text-emerald-600 font-black',
];

const RepetitionViz = () => {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState(shouldReduceMotion ? 3 : 0);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const timers = [1, 2, 3].map((s) => setTimeout(() => setStep(s), s * BEAT_MS));
    return () => timers.forEach(clearTimeout);
  }, [shouldReduceMotion]);

  const tags = [
    t('homepage.why.repetition.tag1'),
    t('homepage.why.repetition.tag2'),
    t('homepage.why.repetition.tag3'),
  ];

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <motion.p
        animate={{ scale: step === 3 ? 1.08 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`text-xl sm:text-2xl transition-colors duration-300 ${STEP_STYLE[step]}`}
      >
        &ldquo;{PHRASE}&rdquo;
      </motion.p>

      <div className="flex gap-3">
        {tags.map((tag, i) => (
          <motion.span
            key={tag}
            animate={{
              opacity: step > i ? 1 : 0.25,
              scale: step > i ? 1 : 0.8,
            }}
            transition={{ duration: 0.3 }}
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              step > i ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {tag}
          </motion.span>
        ))}
      </div>

      {step === 3 && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-gray-500 max-w-xs"
        >
          {t('homepage.why.repetition.takeaway')}
        </motion.p>
      )}
    </div>
  );
};

export default RepetitionViz;
