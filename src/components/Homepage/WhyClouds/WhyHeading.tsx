import React from 'react';
import { useTranslation } from 'react-i18next';
import { BLOB_COLORS, type WhyQuestionId } from './whyCloudsData';

/**
 * One question's heading: its cloud wording as a small line, its title under
 * it, both over the blob pair the cloud wears in the hero — so tapping "Why 3
 * speeds?" on the homepage and landing on its section reads as the same object
 * continued.
 *
 * Shared by the /how-to-use guide and the onboarding slides. `index` is the
 * question's position in ALL_WHY_QUESTIONS, never in a filtered list, or a
 * question gets one colour here and another in the hero.
 */
export const WhyHeading: React.FC<{
  id: WhyQuestionId;
  index: number;
  as?: 'h1' | 'h2' | 'h3';
  /** Lets a slide move focus onto its heading when it opens. */
  headingRef?: React.Ref<HTMLHeadingElement>;
}> = ({ id, index, as: Heading = 'h3', headingRef }) => {
  const { t } = useTranslation();
  const [blobA, blobB] = BLOB_COLORS[index % BLOB_COLORS.length];

  return (
    <div className="relative mb-5">
      {/* Same radial-gradient treatment as Cloud.tsx — a transparent-edged
          gradient rather than a blurred solid, so there is no per-frame
          filter pass. See the note in Cloud.tsx. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-6 -top-10 h-40 w-40 rounded-full opacity-70"
        style={{ background: `radial-gradient(circle, ${blobA} 0%, ${blobA}00 70%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-16 -top-4 h-36 w-36 rounded-full opacity-60"
        style={{ background: `radial-gradient(circle, ${blobB} 0%, ${blobB}00 70%)` }}
      />

      <div className="relative">
        <p className="text-sm font-semibold text-gray-500">
          {t(`homepage.why.${id}.cloud`)}
        </p>
        <Heading
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className="mt-1 text-xl font-extrabold leading-tight text-gray-900 outline-none sm:text-2xl"
        >
          {t(`homepage.why.${id}.title`)}
        </Heading>
      </div>
    </div>
  );
};
