// modules/onboarding/FeatureTour.tsx
//
// The last step of /welcome: what is in the app, on one screen, with nothing
// to wait for. Six cards in the guide's language (pages/HowToUse.tsx,
// components/Guide/guideKit.tsx): a picture, an icon, a name and one or two
// lines of what it does. No reasons why — just what is there.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { IoBookOutline, IoChevronForward } from 'react-icons/io5';
import { CURRENCIES } from '../../config/currencies';
import { HUB_TABS } from '../../components/TabBar/hubTabs';
import { Eyebrow, GREEN_INK, WATER } from '../../components/Guide/guideKit';
import { FEATURES } from './tourFeatures';

/** The points card has no screenshot: the three coins, as the app draws them. */
const PointsPicture: React.FC = () => (
  <div className="flex h-full flex-col items-center justify-center gap-2.5 px-6">
    {CURRENCIES.map(({ key, label, icon: CoinIcon, chipClasses }) => (
      <span
        key={key}
        className={`inline-flex h-10 min-w-[180px] items-center gap-2.5 rounded-chip px-4 text-[15px] font-bold ${chipClasses}`}
      >
        <CoinIcon size={20} className="flex-none" />
        {label}
      </span>
    ))}
  </div>
);

export const FeatureTour: React.FC<{
  headingRef: React.Ref<HTMLHeadingElement>;
  /** Ends the intro and opens the full guide (/how-to-use). */
  onOpenGuide: () => void;
  busy: boolean;
}> = ({ headingRef, onOpenGuide, busy }) => {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="tour-title">
      <Eyebrow>{t('onboarding.tour.eyebrow')}</Eyebrow>
      <h1
        id="tour-title"
        ref={headingRef}
        tabIndex={-1}
        className="mt-3.5 text-balance text-[clamp(30px,5vw,44px)] font-extrabold leading-[1.06] tracking-[-0.04em] text-ink outline-none"
      >
        {t('onboarding.tour.title')}
      </h1>

      <ul className="m-0 mt-7 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 sm:gap-4">
        {FEATURES.map(({ id, icon: FeatureIcon, shot }) => (
          <li key={id} className="flex flex-col overflow-hidden rounded-[22px] border border-line bg-white">
            <div className="aspect-[16/10] overflow-hidden" style={{ background: WATER }}>
              {shot ? (
                <img
                  src={shot.src}
                  alt=""
                  width={shot.width}
                  height={shot.height}
                  loading="lazy"
                  className="block h-full w-full object-cover"
                  style={{ objectPosition: shot.position }}
                />
              ) : (
                <PointsPicture />
              )}
            </div>
            <div className="p-5">
              <h2 className="m-0 flex items-center gap-2.5 text-[20px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
                <FeatureIcon size={22} className="flex-none" />
                {t(`onboarding.tour.${id}.title`)}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-dim">{t(`onboarding.tour.${id}.text`)}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Where the sections live: the same four the tab bar and navbar show. */}
      <div className="mt-4 rounded-[22px] bg-white p-5">
        <p className="m-0 text-sm font-semibold" style={{ color: GREEN_INK }}>
          {t('onboarding.tour.menu')}
        </p>
        <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
          {HUB_TABS.map(({ id, labelKey, icon: TabIcon }) => (
            <li
              key={id}
              className="inline-flex h-9 items-center gap-2 rounded-chip border border-line bg-room px-3 text-sm font-semibold text-ink"
            >
              <TabIcon size={18} className="flex-none" />
              {t(labelKey)}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onOpenGuide}
        disabled={busy}
        className="mt-6 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-[15px] font-bold text-ink
          underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink disabled:cursor-default disabled:opacity-60
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      >
        <IoBookOutline aria-hidden className="h-[18px] w-[18px]" />
        {t('onboarding.tour.guide')}
        <IoChevronForward aria-hidden className="h-4 w-4" />
      </button>
    </section>
  );
};
