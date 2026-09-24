import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IoEyeOutline, IoEarOutline, IoChatbubbleEllipsesOutline } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';

const BEATS_MS = [1100, 900];

/**
 * Eyes → ears, told as a caption strip emptying out.
 *
 * This used to sit an animated bar meter between the two icons. The bars were
 * the only waveform anywhere in the product and they were doing the wrong job:
 * the point of this explanation is the *text leaving*, not what audio looks
 * like — and a bouncing meter reads as "sound is playing", which is true in
 * every mode, subtitles or not. A player frame whose caption line drains to
 * "subtitles off" says the actual thing.
 */
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
    <div className="flex flex-col items-center gap-5 text-center w-full">
      {/* The player frame. Deliberately plain: it is a stand-in for the
          story you are listening to, and the only thing that changes on it
          is the caption line at the bottom. */}
      <div className="w-full max-w-[19rem] rounded-[3px] overflow-hidden border border-gray-200">
        <div className="h-20 flex items-center justify-center bg-gray-50">
          <motion.span
            animate={{
              color: stage === 2 ? '#059669' : '#d1d5db',
              scale: stage === 2 ? 1.1 : 1,
            }}
            transition={{ duration: 0.4 }}
          >
            <IoChatbubbleEllipsesOutline size={30} />
          </motion.span>
        </div>

        <div className="relative border-t border-gray-200 bg-white min-h-10 flex items-center justify-center px-3 py-2">
          <AnimatePresence mode="wait">
            {stage < 2 ? (
              <motion.span
                key="caption"
                initial={{ opacity: 1 }}
                animate={{ opacity: stage === 1 ? 0.3 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="text-sm italic text-orange-500"
              >
                &ldquo;...the words on the screen...&rdquo;
              </motion.span>
            ) : (
              <motion.span
                key="off"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.15 }}
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400"
              >
                {t('homepage.why.noSubtitles.offLabel')}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Which channel is doing the work. */}
      <div className="flex items-center justify-center gap-10 sm:gap-12">
        <motion.div
          animate={{
            opacity: stage < 2 ? 1 : 0.3,
            color: stage < 2 ? '#ea580c' : '#9ca3af',
          }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-1"
        >
          <IoEyeOutline size={30} />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
            {t('homepage.why.noSubtitles.eyeLabel')}
          </span>
        </motion.div>

        <motion.div
          animate={{
            opacity: stage === 2 ? 1 : 0.3,
            scale: stage === 2 ? 1.12 : 1,
            color: stage === 2 ? '#059669' : '#9ca3af',
          }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-1"
        >
          <IoEarOutline size={30} />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
            {t('homepage.why.noSubtitles.earLabel')}
          </span>
        </motion.div>
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
