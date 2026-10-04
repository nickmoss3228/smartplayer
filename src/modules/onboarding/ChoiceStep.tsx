import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import MilkGlass from '../../components/Levels/MilkGlass';
import { themes } from '../levelprogress/themes.levelprogress';
import {
  ENGLISH_LEVEL_OPTIONS,
  LISTENING_OPTIONS,
  difficultyForLevel,
  type EnglishLevel,
  type ListeningExperience,
} from './onboardingOptions';

const eyebrow = 'font-mono text-[10px] uppercase tracking-[0.16em] text-dim';
const title =
  'mt-3 text-[26px] sm:text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-ink outline-none';

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
    className={`flex min-h-[60px] cursor-pointer items-center gap-4 rounded-card border bg-white px-4 py-3
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
      className={`ml-auto flex h-5 w-5 flex-none items-center justify-center rounded-full border
        ${checked ? 'border-ink bg-ink' : 'border-line-strong bg-white'}`}
    >
      {checked && <span className="h-2 w-2 rounded-full bg-white" />}
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
      <p className={eyebrow}>{t('onboarding.level.eyebrow')}</p>
      <h1 id={headingId} ref={headingRef} tabIndex={-1} className={title}>
        {t('onboarding.level.title')}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-dim">{t('onboarding.level.hint')}</p>

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
      <p className={eyebrow}>{t('onboarding.listening.eyebrow')}</p>
      <h1 id={headingId} ref={headingRef} tabIndex={-1} className={title}>
        {t('onboarding.listening.title')}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-dim">{t('onboarding.listening.hint')}</p>

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
              className="flex h-10 w-10 flex-none items-center justify-center rounded-tile border border-line bg-room text-ink"
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
