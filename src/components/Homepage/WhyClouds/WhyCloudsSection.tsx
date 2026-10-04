import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Cloud from './Cloud';
import WhyModal from './WhyModal';
import { ALL_WHY_QUESTIONS, whyQuestions, WhyQuestionId } from './whyCloudsData';
import { ScenePanel } from '../../Method/MethodScene';

const WhyCloudsSection = () => {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<WhyQuestionId | null>(null);

  const active = whyQuestions.find((q) => q.id === activeId) ?? null;

  const handleOpen = (id: WhyQuestionId) => setActiveId(id);
  const handleClose = () => setActiveId(null);

  return (
    <section className="relative z-10 px-6 pt-4 pb-1 sm:pt-5 sm:pb-1">
      {/* <p className="font-mono text-center text-[10px] tracking-[0.16em] uppercase text-gray-400 mb-2 sm:mb-3">
        {t('homepage.why.sectionLabel')}
      </p> */}

      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0 sm:gap-x-6 sm:gap-y-0 max-w-5xl mx-auto">
        {whyQuestions.map((q) => (
          <Cloud
            key={q.id}
            // Position in ALL_WHY_QUESTIONS, not in this filtered list: the
            // index picks the blob colour, and /how-to-use paints each
            // question's section from the same pair. Passing the filtered
            // index would give a cloud one colour here and another there
            // whenever ACTIVE_WHY_IDS is not the full set.
            index={ALL_WHY_QUESTIONS.findIndex((a) => a.id === q.id)}
            // The statement, not the question — see ACTIVE_WHY_IDS in
            // whyCloudsData.ts. `.cloud` still holds the question wording.
            label={t(`homepage.why.${q.id}.slogan`)}
            onClick={() => handleOpen(q.id)}
            isPaused={active !== null}
          />
        ))}
      </div>

      <WhyModal
        isOpen={active !== null}
        title={active ? t(`homepage.why.${active.id}.title`) : ''}
        onClose={handleClose}
      >
        {/* The login screen's picture for this question, and the line that
            says what it shows. Mounted with the modal, so it starts from its
            first beat each time a cloud is opened; it loops, so there is
            nothing to replay. */}
        {active && (
          <>
            <ScenePanel scene={active.scene} />
            <p className="m-0 mt-5 text-[15px] leading-relaxed text-gray-600">
              {t(`homepage.why.${active.id}.takeaway`)}
            </p>
          </>
        )}
      </WhyModal>
    </section>
  );
};

export default WhyCloudsSection;
