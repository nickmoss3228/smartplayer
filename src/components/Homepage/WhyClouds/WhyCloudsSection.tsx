import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Cloud from './Cloud';
import WhyModal from './WhyModal';
import { whyQuestions, WhyQuestionId } from './whyCloudsData';

const WhyCloudsSection = () => {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<WhyQuestionId | null>(null);
  const [playKey, setPlayKey] = useState(0);

  const active = whyQuestions.find((q) => q.id === activeId) ?? null;

  const handleOpen = (id: WhyQuestionId) => {
    setActiveId(id);
    setPlayKey((k) => k + 1);
  };
  const handleClose = () => setActiveId(null);
  const handleReplay = () => setPlayKey((k) => k + 1);

  return (
    <section className="relative z-10 px-6 pt-14 pb-6 sm:pt-16 sm:pb-8">
      <p className="text-center text-[9px] tracking-[0.6em] uppercase text-gray-400 mb-6 sm:mb-8">
        {t('homepage.why.sectionLabel')}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-8 sm:gap-y-4 max-w-3xl mx-auto">
        {whyQuestions.map((q, i) => (
          <Cloud
            key={q.id}
            index={i}
            label={t(`homepage.why.${q.id}.cloud`)}
            onClick={() => handleOpen(q.id)}
          />
        ))}
      </div>

      <WhyModal
        isOpen={active !== null}
        title={active ? t(`homepage.why.${active.id}.title`) : ''}
        onClose={handleClose}
        onReplay={handleReplay}
      >
        {active && <active.Viz key={playKey} />}
      </WhyModal>
    </section>
  );
};

export default WhyCloudsSection;
