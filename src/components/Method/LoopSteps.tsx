import React from 'react';
import { motion } from 'framer-motion';
import type { IconType } from 'react-icons';
import {
  IoWaterOutline,
  IoVolumeHighOutline,
  IoEarOutline,
  IoImagesOutline,
  IoHelpCircleOutline,
} from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { motionEnter } from '../ui/motion';

const LOOP_ICONS: IconType[] = [
  IoWaterOutline,
  IoVolumeHighOutline,
  IoEarOutline,
  IoImagesOutline,
  IoHelpCircleOutline,
];

/** Between steps when `reveal` is on — slow enough to read each title. */
const REVEAL_STEP_S = 0.45;

/**
 * The five steps a student physically performs in every story
 * (`howToUse.loop.s1..s5`). Numbered, unlike the guide's section labels —
 * this genuinely is a sequence, so the numbers carry information.
 *
 * Shared by /how-to-use (static) and the last onboarding slide, where
 * `reveal` brings the steps in one at a time.
 */
export const LoopSteps: React.FC<{ reveal?: boolean }> = ({ reveal = false }) => {
  const { t } = useTranslation();

  const steps = [1, 2, 3, 4, 5].map((n) => ({
    Icon: LOOP_ICONS[n - 1],
    title: t(`howToUse.loop.s${n}.title`),
    text: t(`howToUse.loop.s${n}.text`),
  }));

  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {steps.map(({ Icon, title, text }, i) => (
        <motion.li
          key={title}
          initial={reveal ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...motionEnter, delay: reveal ? i * REVEAL_STEP_S : 0 }}
          className={`flex gap-4 rounded-[3px] border border-gray-200 bg-white p-5
            ${i === 4 ? 'sm:col-span-2' : ''}`}
        >
          <span
            aria-hidden
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[3px]
              border border-line bg-room text-ink"
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-gray-400">
              {String(i + 1).padStart(2, '0')}
            </p>
            <h3 className="mt-0.5 text-[15px] text-gray-900">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
};
