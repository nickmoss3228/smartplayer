import { motion, useReducedMotion } from 'framer-motion';
import { BLOB_COLORS } from './whyCloudsData';

interface CloudProps {
  label: string;
  index: number;
  onClick: () => void;
  isPaused?: boolean;
}


const Cloud: React.FC<CloudProps> = ({ label, index, onClick, isPaused }) => {
  const shouldReduceMotion = useReducedMotion();
  const [colorA, colorB] = BLOB_COLORS[index % BLOB_COLORS.length];
  const bobDuration = 5 + (index % 3) * 0.6;
  const bobDelay = index * 0.35;
  const bobbing = !shouldReduceMotion && !isPaused;

  return (
    <motion.div
      className="relative w-48 h-30 sm:w-72 sm:h-48 flex items-center justify-center"
      style={{ willChange: 'transform' }}
      animate={bobbing ? { y: [0, -10, 0] } : { y: 0 }}
      transition={
        bobbing
          ? { duration: bobDuration, delay: bobDelay, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.3 }
      }
    >
      {/* Decorative gradient blob cluster — reads as a cloud/smoke puff.
          Deliberately NOT wrapped in overflow-hidden so the button's own
          hover/focus glow below is never invisibly clipped. */}
      <div
        aria-hidden
        className="absolute -top-3 left-3 w-36 h-36 sm:w-42 sm:h-42 rounded-full opacity-70 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${colorA} 0%, ${colorA}00 72%)` }}
      />
      <div
        aria-hidden
        className="absolute -bottom-3 right-3 w-42 h-36 sm:w-48 sm:h-42 rounded-full opacity-60 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${colorB} 0%, ${colorB}00 72%)` }}
      />

      <button
        type="button"
        onClick={onClick}
        className="relative z-10 px-4.5 py-3.75 sm:px-6 sm:py-4.5 max-w-[14.25rem] sm:max-w-[16.5rem] text-center text-lg sm:text-xl font-semibold text-gray-700
          hover:text-black hover:scale-105 focus-visible:scale-105 focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400
          transition-transform duration-200 cursor-pointer rounded-2xl"
      >
        {label}
      </button>
    </motion.div>
  );
};

export default Cloud;
