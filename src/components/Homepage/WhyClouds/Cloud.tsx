import { motion, useReducedMotion } from 'framer-motion';

interface CloudProps {
  label: string;
  index: number;
  onClick: () => void;
}

// Blurred blob pairs, one per cloud, cycling through a soft pastel set.
const BLOB_PALETTES: [string, string][] = [
  ['from-sky-200 to-blue-300', 'from-indigo-200 to-purple-300'],
  ['from-rose-200 to-pink-300', 'from-orange-200 to-amber-300'],
  ['from-emerald-200 to-teal-300', 'from-cyan-200 to-sky-300'],
  ['from-violet-200 to-fuchsia-300', 'from-blue-200 to-indigo-300'],
  ['from-amber-200 to-orange-300', 'from-pink-200 to-rose-300'],
];

const Cloud: React.FC<CloudProps> = ({ label, index, onClick }) => {
  const shouldReduceMotion = useReducedMotion();
  const [blobA, blobB] = BLOB_PALETTES[index % BLOB_PALETTES.length];
  const bobDuration = 5 + (index % 3) * 0.6;
  const bobDelay = index * 0.35;

  return (
    <motion.div
      className="relative w-36 h-24 sm:w-44 sm:h-28 flex items-center justify-center"
      animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
      transition={
        shouldReduceMotion
          ? undefined
          : {
              duration: bobDuration,
              delay: bobDelay,
              repeat: Infinity,
              ease: 'easeInOut',
            }
      }
    >
      {/* Decorative blurred blob cluster — reads as a cloud/smoke puff.
          Deliberately NOT wrapped in overflow-hidden so the button's own
          hover/focus glow below is never invisibly clipped. */}
      <div
        aria-hidden
        className={`absolute -top-2 left-2 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br ${blobA} blur-2xl opacity-60 pointer-events-none`}
      />
      <div
        aria-hidden
        className={`absolute -bottom-2 right-2 w-24 h-20 sm:w-28 sm:h-24 rounded-full bg-gradient-to-br ${blobB} blur-3xl opacity-50 pointer-events-none`}
      />

      <button
        type="button"
        onClick={onClick}
        className="relative z-10 px-4 py-3 max-w-[10rem] text-center text-xs sm:text-sm font-semibold text-gray-700
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
