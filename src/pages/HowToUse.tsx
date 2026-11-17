import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IoChevronBack,
  IoArrowForward,
  IoArrowDown,
  IoTimeOutline,
  IoMicOutline,
  IoRepeatOutline,
  IoHeadsetOutline,
  IoShareSocialOutline,
  IoLockClosedOutline,
  IoCheckmark,
  IoClose,
  IoVolumeHighOutline,
} from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import MilkGlass from '../components/Levels/MilkGlass';
import { themes } from '../modules/levelprogress/themes.levelprogress';
import { METHOD_GROUPS, type WhyQuestionId } from '../components/Homepage/WhyClouds/whyCloudsData';
import playerShot from '../assets/landing/d3-player.webp';
import repeatShot from '../assets/landing/d5-repeat.webp';
import quizShot from '../assets/landing/d4-quiz.webp';
import wordsShot from '../assets/landing/steps/step1-d.webp';
import waveShot from '../assets/landing/steps/step2-d.webp';
import controlsShot from '../assets/landing/steps/step34-d.webp';
import repeatBarShot from '../assets/landing/steps/step5-d.webp';

/**
 * The guide, drawn in the landing's language (2026-11-14).
 *
 * The page before this one was a grey documentation page: hairlines, 3px
 * corners, a fixed rail on the left that phones never saw. It said the right
 * things in the right order (the loop first, then the recording, then the six
 * cloud questions in their three groups, then the level) but looked like it
 * belonged to a different product than the landing a visitor had just read.
 *
 * The order is unchanged. What changed is how it is shown:
 *
 *   surface        the claim, the way in, the player itself
 *   shallow water  the six steps on a rope, as on the landing, each beside the
 *                  real screen it happens on
 *   the deep       «Повторяй вслух»: how the recording works
 *   surface again  the six questions as cards, grouped into the argument they
 *                  make (METHOD_GROUPS, shared with the onboarding slides)
 *   the glasses    the level picker's own glasses and the way in
 *
 * The rail became a bar of anchors under the navbar, so phones get it too.
 * The screenshots are the landing's captures (assets/landing): recapture them
 * there and both pages follow.
 */

const LEVEL_IDS = ['easy', 'medium', 'hard'] as const;
const LEVEL_FILL: Record<(typeof LEVEL_IDS)[number], number> = {
  easy: 0.28,
  medium: 0.58,
  hard: 0.92,
};
const levelKey = (id: string, prefix = '') =>
  prefix ? `levels.${prefix}${id.charAt(0).toUpperCase()}${id.slice(1)}` : `levels.${id}`;

/** The recording, in the order it is used: howToUse.repeat.steps[0..3]. */
const REPEAT_ICONS = [IoMicOutline, IoRepeatOutline, IoHeadsetOutline, IoShareSocialOutline];

/** The bar's anchors, in page order; the ids are the sections' ids. */
const ANCHORS = [
  { id: 'do', label: 'howToUse.nav.doIt' },
  { id: 'repeat', label: 'howToUse.nav.repeat' },
  { id: 'why', label: 'howToUse.nav.why' },
  { id: 'levels', label: 'howToUse.pick.navLabel' },
] as const;

const WATER = '#cfe6f3';
const DEEP = '#0d2c47';
const ROOM = '#f5f8fa';
/** The landing's green, as a fill behind ink; `GREEN_INK` is the shade that passes AA as text on white. */
const GREEN = '#00c951';
const GREEN_INK = '#007a33';

const card = 'rounded-[22px] bg-white p-5 sm:p-7';
const shot = 'block h-auto w-full rounded-[14px]';

// ─── Pieces ───────────────────────────────────────────────────────────────

/** A still waterline between two bands: `to` rises into `from` (or hangs down from it when `down`). */
const Waterline: React.FC<{ from: string; to: string; down?: boolean }> = ({ from, to, down }) => {
  let d = down ? 'M0 14' : 'M0 18';
  for (let x = 0; x < 1200; x += 200) d += down ? ' q50 16 100 0 t100 0' : ' q50 -16 100 0 t100 0';
  d += down ? ' V0 H0Z' : ' V32 H0Z';
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 32"
      preserveAspectRatio="none"
      className="-my-px block h-8 w-full"
      style={{ background: from }}
    >
      <path d={d} fill={to} />
    </svg>
  );
};

/** The landing's kicker, small: a bar of colour and a mono label. */
const Eyebrow: React.FC<{ children: React.ReactNode; bar?: string; className?: string }> = ({
  children,
  bar = GREEN,
  className = 'text-dim',
}) => (
  <p className={`m-0 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] ${className}`}>
    <span aria-hidden className="h-1.5 w-7 flex-none rounded-full" style={{ background: bar }} />
    {children}
  </p>
);

/** A step's "in the app" line, as on the landing's steps. */
const AppNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-4 flex items-start gap-2 text-sm font-semibold" style={{ color: GREEN_INK }}>
    <IoCheckmark aria-hidden className="mt-0.5 h-[18px] w-[18px] flex-none" />
    {children}
  </p>
);

/** The small drawing inside each question's card. */
const QuestionDiagram: React.FC<{ id: WhyQuestionId }> = ({ id }) => {
  const { t } = useTranslation();
  const chip = 'rounded-tile px-3.5 py-2 text-sm font-bold';

  switch (id) {
    case 'repetition':
      return (
        <div aria-hidden className="flex h-[72px] items-end gap-2 text-sm font-extrabold">
          <span className="grid h-[34%] flex-1 place-items-center rounded-tile bg-gray-100">
            {t('homepage.why.repetition.tag1')}
          </span>
          <span className="grid h-[66%] flex-1 place-items-center rounded-tile bg-gray-300">
            {t('homepage.why.repetition.tag2')}
          </span>
          <span className="grid h-full flex-1 place-items-center rounded-tile" style={{ background: GREEN }}>
            {t('homepage.why.repetition.tag3')}
          </span>
        </div>
      );
    case 'speeds':
      return (
        <div aria-hidden className="flex min-h-[72px] flex-wrap items-center gap-1.5 text-[15px] font-extrabold">
          <span className="grid h-11 place-items-center rounded-full px-4" style={{ background: GREEN }}>
            {t('homepage.why.speeds.tagSlow')}
          </span>
          <span className="grid h-11 place-items-center rounded-full bg-gray-100 px-4">
            {t('homepage.why.speeds.tagMid')}
          </span>
          <span className="grid h-11 place-items-center rounded-full bg-gray-100 px-4">
            {t('homepage.why.speeds.tagFast')}
          </span>
        </div>
      );
    case 'noSubtitles':
      return (
        <p className={`m-0 inline-flex items-center gap-2 border border-dashed border-line-strong text-signal-ink ${chip}`}>
          <IoClose aria-hidden className="h-4 w-4" />
          {t('homepage.why.noSubtitles.offLabel')}
        </p>
      );
    case 'earsOnly':
      return (
        <p className="m-0 flex flex-wrap items-center gap-2">
          <span className={`border border-dashed border-line-strong text-signal-ink ${chip}`}>
            {t('homepage.why.earsOnly.leftLabel')}
          </span>
          <IoArrowForward aria-hidden className="h-4 w-4" />
          <span className={chip} style={{ background: '#effbf4', color: GREEN_INK }}>
            {t('homepage.why.earsOnly.rightLabel')}
          </span>
        </p>
      );
    case 'vocabLanguage':
      return (
        <p
          lang="ru"
          className="m-0 inline-flex items-center gap-2.5 rounded-full py-2 pl-2 pr-3.5 text-[15px] font-bold"
          style={{ background: '#effbf4' }}
        >
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full" style={{ background: GREEN }}>
            <IoVolumeHighOutline className="h-4 w-4" />
          </span>
          {t('howToUse.taken.wordExample')}
        </p>
      );
    case 'visualMemory': {
      const steps = [
        t('howToUse.given.hear'),
        t('homepage.why.visualMemory.searchPrompt'),
        t('homepage.why.visualMemory.foundLabel'),
      ];
      return (
        <ol className="m-0 flex list-none flex-wrap gap-2 p-0 text-[15px] font-extrabold">
          {steps.map((label, i) => (
            <li key={label} className="inline-flex items-center gap-2.5 rounded-full bg-room py-2 pl-2 pr-4">
              <span
                aria-hidden
                className="grid h-7 w-7 place-items-center rounded-full text-[13px]"
                style={{ background: GREEN }}
              >
                {i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
      );
    }
    default:
      return null;
  }
};

// ─── Main ─────────────────────────────────────────────────────────────────
const HowToUse: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [active, setActive] = useState<string>('');

  // Scrollspy for the anchor bar. rootMargin picks the band just under the
  // navbar and the bar, so the highlighted entry is the section being read.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const nodes = ANCHORS.map(({ id }) => document.getElementById(id)).filter(
      (n): n is HTMLElement => n !== null,
    );
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-25% 0px -65% 0px' },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const repeatSteps = t('howToUse.repeat.steps', { returnObjects: true }) as { title: string; text: string }[];

  /** What sits beside each of the six steps (howToUse.loop.s1..s6): its place in the app. */
  const loopExtras: { note?: React.ReactNode; media?: React.ReactNode; narrow?: boolean }[] = [
    {
      media: (
        <div className="flex flex-wrap gap-2.5">
          {LEVEL_IDS.map((id) => (
            <span key={id} className="inline-flex items-baseline gap-2 rounded-card border border-line bg-room px-4 py-2.5">
              <b className="text-[22px] font-extrabold tabular-nums tracking-tight">{t(levelKey(id, 'fat'))}</b>
              <span className="text-sm font-semibold text-dim">{t(levelKey(id))}</span>
            </span>
          ))}
        </div>
      ),
    },
    {
      note: <AppNote>{t('howToUse.loop.wordsNote')}</AppNote>,
      media: <img src={wordsShot} alt={t('howToUse.shots.words')} loading="lazy" width={720} height={820} className={shot} />,
      narrow: true,
    },
    {
      note: <AppNote>{t('howToUse.loop.speedsNote')}</AppNote>,
      media: (
        <div className="flex flex-col gap-2.5">
          <img src={waveShot} alt={t('howToUse.shots.wave')} loading="lazy" width={1312} height={192} className={shot} />
          <img src={controlsShot} alt={t('howToUse.shots.controls')} loading="lazy" width={1312} height={380} className={shot} />
        </div>
      ),
    },
    {
      note: (
        <a
          href="#repeat"
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink underline underline-offset-4"
        >
          {t('howToUse.loop.repeatLink')}
          <IoArrowDown aria-hidden className="h-4 w-4" />
        </a>
      ),
      media: <img src={repeatBarShot} alt={t('howToUse.shots.repeatBar')} loading="lazy" width={944} height={144} className={shot} />,
    },
    {
      media: <img src={playerShot} alt={t('howToUse.shots.comic')} loading="lazy" width={1440} height={999} className={shot} />,
    },
    {
      media: <img src={quizShot} alt={t('howToUse.shots.quiz')} loading="lazy" width={921} height={849} className={shot} />,
      narrow: true,
    },
  ];

  return (
    <div className="min-h-screen bg-room pt-13 text-ink">
      {/* ═══════════════ ANCHOR BAR ═══════════════
          Under the fixed navbar (Layout.tsx, `top-13`) at every width. On a
          phone it scrolls sideways rather than wrapping, so it stays one row. */}
      <div className="sticky top-13 z-30 border-b border-line bg-room/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center gap-1 overflow-x-auto px-2 sm:px-6 lg:px-12">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 flex-none cursor-pointer items-center gap-1 px-2 text-sm font-semibold text-dim transition-colors
              hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal"
          >
            <IoChevronBack aria-hidden className="h-4 w-4" />
            {t('howToUse.back')}
          </button>
          <span aria-hidden className="mx-1 h-5 w-px flex-none bg-line-strong" />
          <nav aria-label={t('howToUse.nav.onPage')} className="flex flex-none">
            {ANCHORS.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={active === id ? 'true' : undefined}
                className={`relative flex h-11 flex-none items-center whitespace-nowrap px-3 text-sm font-semibold no-underline transition-colors
                  focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal
                  ${active === id ? 'text-ink' : 'text-dim hover:text-ink'}`}
              >
                {t(label)}
                {active === id && (
                  <span aria-hidden className="absolute inset-x-3 bottom-0 h-[3px] rounded-full" style={{ background: GREEN }} />
                )}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* ═══════════════ HERO: the surface ═══════════════ */}
      <header className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-14 gap-y-10 px-4 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-16 lg:px-14">
        <div className="min-w-0 flex-[1_1_440px]">
          <p className="m-0 font-mono text-[11px] uppercase tracking-[0.16em] text-dim">
            {t('howToUse.intro.eyebrow')}
          </p>
          <h1 className="mt-4 text-balance text-[clamp(44px,7.4vw,84px)] font-extrabold leading-[0.98] tracking-[-0.05em]">
            <span className="text-dim">{t('howToUse.intro.title1')}</span>{' '}
            {/* the landing's underline on the line that matters, in green instead of red */}
            <span className="inline-block bg-[linear-gradient(transparent_68%,rgba(0,201,81,0.35)_68%)]">
              {t('howToUse.intro.title2')}
            </span>
          </h1>
          <p className="mt-6 max-w-[34em] text-lg leading-relaxed text-dim">{t('howToUse.intro.text')}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-4">
            <Link
              to="/levels"
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-ink px-7 text-sm font-bold uppercase
                tracking-[0.2em] text-white no-underline transition-colors hover:bg-gray-800
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              {t('howToUse.pick.cta')}
              <IoArrowForward aria-hidden className="h-[18px] w-[18px]" />
            </Link>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-dim">
              <IoTimeOutline aria-hidden className="h-[18px] w-[18px]" />
              {t('howToUse.intro.readTime')}
            </span>
          </div>
        </div>
        <figure className="m-0 min-w-0 flex-[1_1_400px]">
          <img
            src={playerShot}
            alt={t('howToUse.shots.player')}
            width={1440}
            height={999}
            className="block h-auto w-full rounded-[22px] shadow-[0_40px_80px_-50px_rgba(13,58,92,0.7)]"
          />
        </figure>
      </header>

      <Waterline from={ROOM} to={WATER} />

      {/* ═══════════════ THE LOOP: shallow water ═══════════════
          Numbered, because this genuinely is a sequence. The rope and its
          knots are the landing's (Steps.tsx), standing still. */}
      <section id="do" className="scroll-mt-24" style={{ background: WATER }}>
        <div className="mx-auto max-w-[1180px] px-4 pb-14 pt-9 sm:px-8 sm:pb-24 sm:pt-14 lg:px-14">
          <Eyebrow className="text-gray-700">{t('howToUse.loop.label')}</Eyebrow>
          <h2 className="mt-3.5 max-w-[16em] text-balance text-[clamp(30px,5vw,52px)] font-extrabold leading-[1.06] tracking-[-0.04em]">
            {t('howToUse.loop.title')}
          </h2>

          <ol className="m-0 mt-11 flex list-none flex-col p-0">
            {loopExtras.map(({ note, media, narrow }, i) => {
              const last = i === loopExtras.length - 1;
              return (
                <li key={i} className="flex gap-3 sm:gap-6">
                  <div aria-hidden className="flex w-[46px] flex-none flex-col items-center">
                    <span
                      className="grid h-[46px] w-[46px] flex-none place-items-center rounded-full text-[17px] font-extrabold"
                      style={{ background: GREEN }}
                    >
                      {i + 1}
                    </span>
                    {!last && <span className="w-[3px] flex-1" style={{ background: GREEN }} />}
                  </div>
                  <article className={`${card} ${last ? '' : 'mb-6'} flex min-w-0 flex-1 flex-wrap items-center gap-x-10 gap-y-5`}>
                    <div className="min-w-0 flex-[1_1_280px]">
                      <h3 className="m-0 text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
                        {t(`howToUse.loop.s${i + 1}.title`)}
                      </h3>
                      <p className="mt-2 leading-relaxed text-dim">{t(`howToUse.loop.s${i + 1}.text`)}</p>
                      {note}
                    </div>
                    {media && (
                      <div className={`min-w-0 ${narrow ? 'flex-[0_1_300px]' : 'flex-[1_1_360px]'}`}>{media}</div>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <Waterline from={WATER} to={DEEP} />

      {/* ═══════════════ REPEAT OUT LOUD: the deep ═══════════════
          The recording: what to press, what happens, where it goes. */}
      <section id="repeat" className="scroll-mt-24 text-white" style={{ background: DEEP }}>
        <div className="mx-auto max-w-[1180px] px-4 pb-14 pt-9 sm:px-8 sm:pb-24 sm:pt-14 lg:px-14">
          <div className="flex flex-wrap items-center gap-x-14 gap-y-8">
            <div className="min-w-0 flex-[1_1_400px]">
              <Eyebrow className="text-[#9fd4ff]">{t('howToUse.repeat.label')}</Eyebrow>
              <h2 className="mt-3.5 text-balance text-[clamp(30px,5vw,52px)] font-extrabold leading-[1.06] tracking-[-0.04em]">
                {t('howToUse.repeat.title')}
              </h2>
              <p className="mt-5 max-w-[32em] text-[17px] leading-relaxed text-white/85">{t('howToUse.repeat.text')}</p>
            </div>
            <figure className="m-0 min-w-0 flex-[1_1_400px]">
              <img
                src={repeatShot}
                alt={t('howToUse.shots.repeatMode')}
                loading="lazy"
                width={1440}
                height={999}
                className="block h-auto w-full rounded-[22px] shadow-[0_28px_56px_-30px_rgba(0,0,0,0.75)]"
              />
            </figure>
          </div>

          <ol className="m-0 mt-12 grid list-none grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4 p-0">
            {repeatSteps.map((step, i) => {
              const Icon = REPEAT_ICONS[i] ?? IoMicOutline;
              return (
                <li key={step.title} className="rounded-2xl border border-white/30 bg-white/[0.08] p-[22px]">
                  <div className="flex items-center justify-between">
                    <Icon aria-hidden className="h-[26px] w-[26px]" />
                    <span className="font-mono text-xs tracking-[0.16em] text-[#9fd4ff]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-[18px] text-lg font-extrabold leading-tight tracking-[-0.015em]">{step.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/85">{step.text}</p>
                </li>
              );
            })}
          </ol>

          <p className="mt-6 flex max-w-[46em] items-start gap-2.5 text-[15px] leading-relaxed text-white/85">
            <IoLockClosedOutline aria-hidden className="mt-1 h-[18px] w-[18px] flex-none" />
            {t('howToUse.repeat.note')}
          </p>
        </div>
      </section>

      <Waterline from={ROOM} to={DEEP} down />

      {/* ═══════════════ THE SIX QUESTIONS: back on the surface ═══════════════
          The groups and their order are METHOD_GROUPS, shared with onboarding. */}
      <section id="why" className="scroll-mt-24">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-12 px-4 pb-10 pt-9 sm:gap-20 sm:px-8 sm:pb-16 sm:pt-14 lg:px-14">
          {METHOD_GROUPS.map((g) => (
            <div key={g.key} className="flex flex-wrap gap-x-14 gap-y-7">
              <div className="min-w-0 flex-[1_1_280px]">
                {/* red only where something is taken away; it is a marker here, never a fill behind text */}
                <Eyebrow bar={g.key === 'taken' ? 'var(--color-signal-ink)' : GREEN}>
                  {t(`howToUse.groups.${g.key}.label`)}
                </Eyebrow>
                <h2 className="mt-3.5 text-balance text-[clamp(26px,3.6vw,38px)] font-extrabold leading-[1.1] tracking-[-0.035em]">
                  {t(`howToUse.groups.${g.key}.title`)}
                </h2>
                <p className="mt-3.5 leading-relaxed text-dim">{t(`howToUse.groups.${g.key}.text`)}</p>
              </div>
              <div className="grid min-w-0 flex-[999_1_520px] grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                {g.ids.map((id) => (
                  <article key={id} id={id} className={`${card} scroll-mt-28 border border-line`}>
                    <p className="m-0 text-sm font-bold text-dim">{t(`homepage.why.${id}.cloud`)}</p>
                    <h3 className="mt-1.5 text-xl font-extrabold leading-tight tracking-[-0.02em]">
                      {t(`homepage.why.${id}.title`)}
                    </h3>
                    <div className="mt-5">
                      <QuestionDiagram id={id} />
                    </div>
                    <p className="mt-5 max-w-[40em] text-[15px] leading-relaxed text-dim">
                      {t(`homepage.why.${id}.takeaway`)}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ LEVELS ═══════════════
          The same glasses the level picker uses, so the guide and /levels
          show one object rather than two drawings of it. */}
      <section id="levels" className="scroll-mt-24">
        <div className="mx-auto max-w-[1180px] px-4 pb-12 sm:px-8 sm:pb-20 lg:px-14">
          <div className="flex flex-wrap items-center gap-x-14 gap-y-9 rounded-[28px] border border-line bg-white p-6 sm:p-10 lg:p-14">
            <div className="min-w-0 flex-[1_1_340px]">
              <Eyebrow>{t('howToUse.pick.label')}</Eyebrow>
              <h2 className="mt-3.5 text-balance text-[clamp(30px,5vw,52px)] font-extrabold leading-[1.06] tracking-[-0.04em]">
                {t('howToUse.pick.title')}
              </h2>
              <p className="mt-4 max-w-[30em] text-[17px] leading-relaxed text-dim">{t('howToUse.pick.text')}</p>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3.5">
                <Link
                  to="/levels"
                  className="inline-flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-ink px-7 text-sm font-bold uppercase
                    tracking-[0.2em] text-white no-underline transition-colors hover:bg-gray-800
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                >
                  {t('howToUse.pick.cta')}
                  <IoArrowForward aria-hidden className="h-[18px] w-[18px]" />
                </Link>
                <span className="text-sm text-dim">{t('howToUse.pick.note')}</span>
              </div>
            </div>

            <div className="grid min-w-0 flex-[1_1_340px] grid-cols-3 gap-2 sm:gap-6">
              {LEVEL_IDS.map((id) => (
                <div key={id} className="flex flex-col items-center text-center">
                  <MilkGlass
                    fill={LEVEL_FILL[id]}
                    selected={false}
                    className="h-auto w-full max-w-[120px]"
                    style={{ color: themes[id].accent }}
                  />
                  <span className="mt-3 text-[clamp(22px,3vw,30px)] font-extrabold tabular-nums leading-none tracking-[-0.02em]">
                    {t(levelKey(id, 'fat'))}
                  </span>
                  <span className="mt-1.5 text-sm font-bold text-dim">{t(levelKey(id))}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center">
        <p className="m-0 px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-dim">{t('howToUse.footer')}</p>
      </footer>
    </div>
  );
};

export default HowToUse;
