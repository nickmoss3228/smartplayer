import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IoEyeOutline, IoEarOutline, IoCheckmarkCircle } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';

const BAR_HEIGHTS = [6, 14, 22, 14, 8, 18, 10];
const BEATS_MS = [1100, 900];

const NoSubtitlesViz = () => {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [stage, setStage] = useState(shouldReduceMotion ? 2 : 0);

  useEffect(() => {
    if (shouldReduceMotion) return;
    let elapsed = 0;
    const timers = [1, 2].map((s) => {
      elapsed += BEATS_MS[s - 1];
      return setTimeout(() => setStage(s), elapsed);
    });
    return () => timers.forEach(clearTimeout);
  }, [shouldReduceMotion]);

  return (
    <div className="flex flex-col items-center gap-6 text-center w-full">
      <div className="flex items-center justify-center gap-8 sm:gap-10">
        <motion.div
          animate={{
            opacity: stage < 2 ? 1 : 0.25,
            scale: stage === 0 ? 1.15 : 1,
            color: stage < 2 ? '#111827' : '#9ca3af',
          }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-1"
        >
          <IoEyeOutline size={32} />
          <span className="text-[10px] uppercase tracking-widest">
            {t('homepage.why.noSubtitles.eyeLabel')}
          </span>
        </motion.div>

        <div className="flex items-end gap-1 h-10">
          {BAR_HEIGHTS.map((h, i) => (
            <motion.span
              key={i}
              className="w-1.5 rounded-full"
              animate={
                stage === 2
                  ? { height: [h, h * 1.6, h], backgroundColor: '#10b981' }
                  : { height: h, backgroundColor: '#d1d5db' }
              }
              transition={
                stage === 2
                  ? { duration: 0.8, repeat: Infinity, delay: i * 0.05 }
                  : { duration: 0.3 }
              }
            />
          ))}
        </div>

        <motion.div
          animate={{
            opacity: stage === 2 ? 1 : 0.25,
            scale: stage === 2 ? 1.15 : 1,
            color: stage === 2 ? '#059669' : '#9ca3af',
          }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-1"
        >
          <IoEarOutline size={32} />
          <span className="text-[10px] uppercase tracking-widest">
            {t('homepage.why.noSubtitles.earLabel')}
          </span>
        </motion.div>
      </div>

      <div className="h-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {stage === 0 && (
            <motion.p
              key="subtitle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 0.5 }}
              className="text-sm text-gray-500 italic border-b border-dashed border-gray-300 pb-1"
            >
              &ldquo;...the words on the screen...&rdquo;
            </motion.p>
          )}
          {stage === 2 && (
            <motion.div
              key="check"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="text-emerald-600"
            >
              <IoCheckmarkCircle size={22} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {stage === 2 && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-gray-500 max-w-xs"
        >
          {t('homepage.why.noSubtitles.takeaway')}
        </motion.p>
      )}
    </div>
  );
};

export default NoSubtitlesViz;
