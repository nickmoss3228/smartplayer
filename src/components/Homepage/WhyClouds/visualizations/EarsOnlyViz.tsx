import { motion, useReducedMotion, Variants } from 'framer-motion';
import { IoBanOutline, IoCreateOutline, IoEarOutline, IoChatbubbleEllipsesOutline } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';

const EarsOnlyViz = () => {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.5,
        delayChildren: shouldReduceMotion ? 0 : 0.2,
      },
    },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center gap-6 text-center"
    >
      <div className="flex items-stretch justify-center gap-8 sm:gap-12">
        <motion.div variants={item} className="flex flex-col items-center gap-2 max-w-[9rem]">
          <div className="relative w-11 h-11 flex items-center justify-center">
            <IoCreateOutline size={28} className="text-gray-300" />
            <IoBanOutline size={44} className="absolute text-red-300" />
          </div>
          <p className="text-xs font-semibold text-gray-500">{t('homepage.why.earsOnly.leftLabel')}</p>
        </motion.div>

        <motion.div variants={item} className="flex flex-col items-center gap-2 max-w-[9rem]">
          <motion.div
            animate={shouldReduceMotion ? undefined : { scale: [1, 1.15, 1] }}
            transition={
              shouldReduceMotion ? undefined : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
            }
            className="flex items-center gap-1 text-emerald-600"
          >
            <IoEarOutline size={30} />
            <IoChatbubbleEllipsesOutline size={24} />
          </motion.div>
          <p className="text-xs font-semibold text-emerald-700">{t('homepage.why.earsOnly.rightLabel')}</p>
        </motion.div>
      </div>

      <motion.p variants={item} className="text-sm text-gray-500 max-w-xs">
        {t('homepage.why.earsOnly.takeaway')}
      </motion.p>
    </motion.div>
  );
};

export default EarsOnlyViz;
