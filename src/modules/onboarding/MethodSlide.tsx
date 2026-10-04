import React from 'react';
import { useTranslation } from 'react-i18next';
import { METHOD_GROUPS } from '../../components/Homepage/WhyClouds/whyCloudsData';
import { LoopSteps } from '../../components/Method/LoopSteps';
import { MethodBlock } from '../../components/Method/MethodBlock';
import { ScenePanel } from '../../components/Method/MethodScene';
import { slideQuestions, type SlideId } from './slides';

const eyebrow = 'font-mono text-[10px] uppercase tracking-[0.16em] text-dim';
const title =
  'mt-3 mb-6 text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-ink outline-none first-letter:uppercase sm:text-[30px]';

/**
 * One slide of the method: the login screen's picture for it, and the
 * question(s) it answers with their takeaways. The heading is the slogans the
 * homepage clouds wear ("3 повтора · 3 скорости"), and the eyebrow is the part
 * of the argument it belongs to ("в плеере", "что мы забираем", …).
 *
 * The last slide is the five-step loop: the why is done, this is the what.
 */
export const MethodSlide: React.FC<{
  slide: SlideId;
  headingRef: React.Ref<HTMLHeadingElement>;
}> = ({ slide, headingRef }) => {
  const { t } = useTranslation();

  if (slide === 'loop') {
    return (
      <div>
        <p className={eyebrow}>{t('howToUse.loop.label')}</p>
        <h1 ref={headingRef} tabIndex={-1} className={title}>
          {t('howToUse.loop.title')}
        </h1>
        <ScenePanel scene="loop" caption={false} className="mb-6" />
        <LoopSteps reveal />
      </div>
    );
  }

  const ids = slideQuestions(slide);
  const group = METHOD_GROUPS.find((g) => g.ids.includes(ids[0]));

  return (
    <div>
      {group && <p className={eyebrow}>{t(`howToUse.groups.${group.key}.label`)}</p>}
      <h1 ref={headingRef} tabIndex={-1} className={title}>
        {ids.map((id) => t(`homepage.why.${id}.slogan`)).join(' · ')}
      </h1>
      <MethodBlock scene={slide} ids={ids} headingAs="h2" />
    </div>
  );
};
