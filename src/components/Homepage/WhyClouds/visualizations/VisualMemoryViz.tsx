import { motion, useReducedMotion } from 'framer-motion';
import { IoSearchOutline, IoCheckmarkCircle } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';

// Real comic panel (see Comics/comicsData.ts) — reused here so the demo
// points at the exact feature it's explaining, not a mockup of it.
const COMIC_SRC = '/assets/leo/comics/10. The Lost Kitten.jpg';

const VisualMemoryViz = () => {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const delay = (ms: number) => (shouldReduceMotion ? 0 : ms / 1000);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(0), duration: 0.4 }}
        className="flex items-center gap-2 text-lg font-bold text-gray-700"
      >
        <span aria-hidden>🔊</span>
        <span>kitten</span>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay(300) }}
        className="text-[11px] uppercase tracking-widest text-gray-400 font-bold -mt-3"
      >
        {t('homepage.why.visualMemory.searchPrompt')}
      </motion.p>

      {/* Comic frame — the same panel a player would open mid-story */}
      <div className="relative w-36 h-36 sm:w-40 sm:h-40">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay(500), duration: 0.5 }}
          className="absolute inset-0 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-gray-100"
        >
          <img
            src={COMIC_SRC}
            alt=""
            aria-hidden
            draggable={false}
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center top' }}
          />
        </motion.div>

        {/* Magnifying glass hunts around the panel, then settles on the kitten */}
        <motion.div
          initial={{ opacity: 0, left: '65%', top: '18%' }}
          animate={
            shouldReduceMotion
              ? { opacity: 1, left: '20%', top: '34%' }
              : {
                  opacity: 1,
                  left: ['65%', '48%', '20%', '20%'],
                  top: ['18%', '52%', '34%', '34%'],
                }
          }
          transition={{
            opacity: { delay: delay(800), duration: 0.3 },
            left: { delay: delay(800), duration: 1.4, ease: 'easeInOut' },
            top: { delay: delay(800), duration: 1.4, ease: 'easeInOut' },
          }}
          className="absolute -ml-3.5 -mt-3.5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
        >
          <IoSearchOutline size={26} />
        </motion.div>

        {/* Spotlight ring lands where the search settles */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay(2100), duration: 0.4, ease: 'easeOut' }}
          className="absolute rounded-full border-2 border-yellow-300"
          style={{ left: '9%', top: '22%', width: '34%', height: '34%' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(2300) }}
        className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700"
      >
        <IoCheckmarkCircle size={14} />
        {t('homepage.why.visualMemory.foundLabel')}
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(2700) }}
        className="text-sm text-gray-500 max-w-xs text-center"
      >
        {t('homepage.why.visualMemory.takeaway')}
      </motion.p>
    </div>
  );
};

export default VisualMemoryViz;
