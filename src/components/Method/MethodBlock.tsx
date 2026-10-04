import React from 'react';
import { useTranslation } from 'react-i18next';
import { WhyHeading } from '../Homepage/WhyClouds/WhyHeading';
import { whyQuestionById, type WhyQuestion, type WhyQuestionId } from '../Homepage/WhyClouds/whyCloudsData';
import { ScenePanel } from './MethodScene';

/**
 * One method picture and the question(s) it answers: the drawing first, then
 * each question's cloud wording, title and takeaway. Two questions share a
 * block when they share a picture (3 repetitions + 3 speeds, no subtitles +
 * ears only — see METHOD_SCENES), so the same animation is never shown twice
 * in a row.
 *
 * Used by /how-to-use and by the onboarding slides; the homepage pop-up shows
 * one question at a time and builds its own.
 */
export const MethodBlock: React.FC<{
  scene: WhyQuestion['scene'];
  ids: WhyQuestionId[];
  /** h3 under a section's h2 on the guide; h2 under a slide's h1. */
  headingAs?: 'h2' | 'h3';
  /** Give each question its id as an anchor, for the guide's rail. */
  anchors?: boolean;
  startWhenSeen?: boolean;
}> = ({ scene, ids, headingAs = 'h3', anchors = false, startWhenSeen = false }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-10">
      <ScenePanel scene={scene} startWhenSeen={startWhenSeen} />
      {ids.map((id) => (
        <section key={id} id={anchors ? id : undefined} className="relative scroll-mt-20">
          <WhyHeading id={id} index={whyQuestionById(id).index} as={headingAs} />
          <p className="m-0 -mt-2 max-w-xl text-[15px] leading-relaxed text-gray-600">
            {t(`homepage.why.${id}.takeaway`)}
          </p>
        </section>
      ))}
    </div>
  );
};
