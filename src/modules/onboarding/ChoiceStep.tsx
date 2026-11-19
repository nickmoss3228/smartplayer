import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { IoCheckmark } from 'react-icons/io5';
import MilkGlass from '../../components/Levels/MilkGlass';
import { Eyebrow, GREEN, WATER } from '../../components/Guide/guideKit';
import { themes } from '../levelprogress/themes.levelprogress';
import {
  ENGLISH_LEVEL_OPTIONS,
  LISTENING_OPTIONS,
  difficultyForLevel,
  type EnglishLevel,
  type ListeningExperience,
} from './onboardingOptions';

// The guide's headings (pages/HowToUse.tsx), a size down: a question is one screen.
const title =
  'mt-3.5 text-balance text-[clamp(30px,5vw,44px)] font-extrabold leading-[1.06] tracking-[-0.04em] text-ink outline-none';

/**
 * One option card. A real radio underneath, visually hidden, so arrow keys
 * move between options and a screen reader announces "3 of 5, selected" —
 * the card is only how it looks.
 */
const Option: React.FC<{
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}> = ({ name, value, checked, onChange, children }) => (
  <label
    className={`flex min-h-[64px] cursor-pointer items-center gap-4 rounded-[18px] border bg-white px-4 py-3
      transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal
      ${checked ? 'border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-line-strong'}`}
  >
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="sr-only"
    />
    {children}
    <span
      aria-hidden
      className={`ml-auto flex h-6 w-6 flex-none items-center justify-center rounded-full border
        ${checked ? 'border-transparent text-ink' : 'border-line-strong bg-white'}`}
      style={checked ? { background: GREEN } : undefined}
    >
      {checked && <IoCheckmark className="h-4 w-4" />}
    </span>
  </label>
);

export const LevelQuestion: React.FC<{
  value: EnglishLevel | null;
  onChange: (value: EnglishLevel) => void;
  headingRef: React.Ref<HTMLHeadingElement>;
}> = ({ value, onChange, headingRef }) => {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <fieldset aria-labelledby={headingId} className="m-0 min-w-0 border-0 p-0">
      <Eyebrow>{t('onboarding.level.eyebrow')}</Eyebrow>
      <h1 id={headingId} ref={headingRef} tabIndex={-1} className={title}>
        {t('onboarding.level.title')}
      </h1>
      <p className="mt-3.5 text-[17px] leading-relaxed text-dim">{t('onboarding.level.hint')}</p>

      <div className="mt-6 flex flex-col gap-2.5">
        {ENGLISH_LEVEL_OPTIONS.map(({ id, fill }) => (
          <Option
            key={id}
            name="english-level"
            value={id}
            checked={value === id}
            onChange={() => onChange(id)}
          >
            {/* The glass is tinted by the shelf this answer opens, so the
                five answers visibly fall into the three levels. */}
            <MilkGlass
              fill={fill}
              selected={value === id}
              className="h-11 w-auto flex-none"
              style={{ color: themes[difficultyForLevel(id)].accent }}
            />
            <span className="min-w-0">
              <span className="block text-[15px] font-bold text-ink">
                {t(`onboarding.level.options.${id}.label`)}
              </span>
              <span className="mt-0.5 block text-sm leading-snug text-dim">
                {t(`onboarding.level.options.${id}.hint`)}
              </span>
            </span>
          </Option>
        ))}
      </div>
    </fieldset>
  );
};

export const ListeningQuestion: React.FC<{
  value: ListeningExperience | null;
  onChange: (value: ListeningExperience) => void;
  headingRef: React.Ref<HTMLHeadingElement>;
}> = ({ value, onChange, headingRef }) => {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <fieldset aria-labelledby={headingId} className="m-0 min-w-0 border-0 p-0">
      <Eyebrow>{t('onboarding.listening.eyebrow')}</Eyebrow>
      <h1 id={headingId} ref={headingRef} tabIndex={-1} className={title}>
        {t('onboarding.listening.title')}
      </h1>
      <p className="mt-3.5 text-[17px] leading-relaxed text-dim">{t('onboarding.listening.hint')}</p>

      <div className="mt-6 flex flex-col gap-2.5">
        {LISTENING_OPTIONS.map(({ id, Icon }) => (
          <Option
            key={id}
            name="listening-experience"
            value={id}
            checked={value === id}
            onChange={() => onChange(id)}
          >
            <span
              aria-hidden
              className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] text-ink"
              style={{ background: WATER }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-[15px] font-semibold leading-snug text-ink">
              {t(`onboarding.listening.options.${id}`)}
            </span>
          </Option>
        ))}
      </div>
    </fieldset>
  );
};
