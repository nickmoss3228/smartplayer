import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ComponentType } from 'react';
import type { IconType } from 'react-icons';
import {
  IoChevronBack,
  IoWaterOutline,
  IoVolumeHighOutline,
  IoEarOutline,
  IoImagesOutline,
  IoHelpCircleOutline,
  IoRefreshOutline,
  IoArrowForward,
} from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import MilkGlass from '../components/Levels/MilkGlass';
import { themes } from '../modules/levelprogress/themes.levelprogress';
import {
  ALL_WHY_QUESTIONS,
  BLOB_COLORS,
  type WhyQuestionId,
} from '../components/Homepage/WhyClouds/whyCloudsData';
import { buttonPrimary } from '../components/ui/buttonStyles';

/**
 * The guide, told as the six cloud questions opened up.
 *
 * This page used to be five evenly-spaced sections of cards — Philosophy, The
 * Player, Vocabulary, Engagement, Story Design — numbered 01…05. Two things
 * were wrong with that. The numbering implied a sequence these topics do not
 * have (a reader could start at 03 and lose nothing), and the even spacing
 * claimed all five mattered equally, which put "how stories are authored"
 * beside "how the player repeats a sentence" at the same weight. Only one of
 * those is needed before pressing play.
 *
 * What replaced it is already in the product: the six question-clouds from the
 * homepage hero. Each one is a question students actually ask, and each already
 * owns a visualization that answers it — but on the homepage they are locked
 * behind a modal you have to tap. Here they are unfolded, all six, grouped into
 * the argument they actually make:
 *
 *   in the player   → what happens to one sentence (3 repetitions, 3 speeds)
 *   what we take    → the three crutches removed on purpose
 *   what you get    → the one crutch handed back (comics / visual memory)
 *
 * Above them sits the thing the old page never said plainly: the five steps a
 * student physically performs. The clouds explain *why*; the loop explains
 * *what you do*, and it comes first.
 *
 * The visualizations are the app's own components, rendered inline instead of
 * in WhyModal — so anything fixed there is fixed in both places at once.
 */

// ─── Groups ───────────────────────────────────────────────────────────────
// Order matters: it is the argument. Ids index into ALL_WHY_QUESTIONS, which
// stays the single source of truth for which viz belongs to which question.
const GROUPS: { key: string; ids: WhyQuestionId[] }[] = [
  { key: 'player', ids: ['repetition', 'speeds'] },
  { key: 'taken', ids: ['noSubtitles', 'earsOnly', 'vocabLanguage'] },
  { key: 'given', ids: ['visualMemory'] },
];

const LOOP_ICONS: IconType[] = [
  IoWaterOutline,
  IoVolumeHighOutline,
  IoEarOutline,
  IoImagesOutline,
  IoHelpCircleOutline,
];

const LEVEL_IDS = ['easy', 'medium', 'hard'] as const;
const LEVEL_FILL: Record<(typeof LEVEL_IDS)[number], number> = {
  easy: 0.28,
  medium: 0.58,
  hard: 0.92,
};

// ─── Viz stage ────────────────────────────────────────────────────────────
/**
 * Every visualization animates on mount. On the homepage that is fine — the
 * modal mounts one at a time, on demand. Here all six would mount at page load
 * and play themselves out below the fold, so a student scrolling down arrives
 * at six finished diagrams having watched none of them.
 *
 * So the viz is not mounted until its card is actually on screen, and `playKey`
 * remounts it for the replay control — the same trick WhyCloudsSection uses.
 */
const VizStage: React.FC<{ Viz: ComponentType }> = ({ Viz }) => {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    // No IntersectionObserver (very old browsers): just show it.
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="rounded-[3px] border border-gray-200 bg-white p-5 sm:p-7">
      {/* min-height reserves the space the viz will occupy, so the page does
          not jump as each one mounts on scroll. */}
      <div
        ref={hostRef}
        className="flex min-h-[13rem] items-center justify-center"
      >
        {seen && <Viz key={playKey} />}
      </div>

      <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => setPlayKey((k) => k + 1)}
          className="flex items-center gap-1.5 rounded-[2px] border border-gray-200 px-3 py-1
            font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400
            transition hover:border-gray-300 hover:text-gray-700"
        >
          <IoRefreshOutline className="h-3 w-3" />
          {t('homepage.why.replay')}
        </button>
      </div>
    </div>
  );
};

// ─── Cloud block ──────────────────────────────────────────────────────────
/**
 * One question, opened. The blob pair behind the heading is the same one the
 * cloud wears in the hero, so tapping "Why 3 speeds?" on the homepage and
 * landing here reads as the same object continued.
 */
const CloudBlock: React.FC<{ id: WhyQuestionId; Viz: ComponentType; index: number }> = ({
  id,
  Viz,
  index,
}) => {
  const { t } = useTranslation();
  const [blobA, blobB] = BLOB_COLORS[index % BLOB_COLORS.length];

  return (
    <article id={id} className="relative scroll-mt-20 pt-4">
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
          <h3 className="mt-1 text-xl font-extrabold leading-tight text-gray-900 sm:text-2xl">
            {t(`homepage.why.${id}.title`)}
          </h3>
        </div>
      </div>

      <VizStage Viz={Viz} />
    </article>
  );
};

// ─── Rail ─────────────────────────────────────────────────────────────────
const RailLink: React.FC<{ href: string; label: string; active: boolean }> = ({
  href,
  label,
  active,
}) => (
  <a
    href={href}
    className={`flex items-center gap-2.5 rounded-[3px] border-l-2 px-2.5 py-1.5 text-[13px] transition
      ${
        active
          ? 'border-signal font-semibold text-gray-900'
          : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
  >
    <span
      aria-hidden
      className={`h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors
        ${active ? 'bg-signal' : 'bg-gray-300'}`}
    />
    {label}
  </a>
);

// ─── Main ─────────────────────────────────────────────────────────────────
const HowToUse: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [active, setActive] = useState('do');

  // Scrollspy for the rail. rootMargin picks the band just under the navbar so
  // the highlighted entry is the section actually being read, not merely the
  // first one intersecting the viewport at all.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const ids = ['do', ...GROUPS.flatMap((g) => g.ids), 'levels'];
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => n !== null);
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-18% 0px -70% 0px' },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const loopSteps = [1, 2, 3, 4, 5].map((n) => ({
    Icon: LOOP_ICONS[n - 1],
    title: t(`howToUse.loop.s${n}.title`),
    text: t(`howToUse.loop.s${n}.text`),
  }));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* ═══════════════ RAIL ═══════════════
          Desktop only. `top-13` clears the fixed navbar from Layout.tsx; on
          narrow screens the rail is dropped entirely rather than folded into
          a drawer — the page is short enough to scroll. */}
      <aside
        className="fixed left-0 top-13 bottom-0 z-40 hidden w-60 flex-col gap-5
          overflow-y-auto border-r border-gray-200 bg-white px-4 py-6 lg:flex"
      >
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold lowercase tracking-tighter">
            {t('brand')}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-400">
            {t('howToUse.nav.title')}
          </span>
        </div>

        <nav className="flex flex-col gap-0.5" aria-label={t('howToUse.nav.title')}>
          <RailLink href="#do" label={t('howToUse.nav.doIt')} active={active === 'do'} />

          {GROUPS.map((g) => (
            <React.Fragment key={g.key}>
              <span className="px-2.5 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-gray-400">
                {t(`howToUse.groups.${g.key}.label`)}
              </span>
              {g.ids.map((id) => (
                <RailLink
                  key={id}
                  href={`#${id}`}
                  label={t(`homepage.why.${id}.slogan`)}
                  active={active === id}
                />
              ))}
            </React.Fragment>
          ))}

          <span className="px-2.5 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-gray-400">
            {t('howToUse.nav.then')}
          </span>
          <RailLink
            href="#levels"
            label={t('howToUse.pick.navLabel')}
            active={active === 'levels'}
          />
        </nav>
      </aside>

      <main className="lg:ml-60">
        <div className="mx-auto max-w-3xl px-5 pt-13 sm:px-8">
          {/* ═══════════════ HERO ═══════════════ */}
          <header className="pt-8 pb-12 sm:pt-12 sm:pb-16">
            <button
              onClick={() => navigate(-1)}
              className="mb-8 flex items-center gap-1.5 rounded-[3px] border border-gray-200 bg-white
                px-4 py-2 text-sm text-gray-600 transition
                hover:border-gray-300 hover:text-gray-900"
            >
              <IoChevronBack className="h-4 w-4" />
              {t('howToUse.back')}
            </button>

            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
              {t('howToUse.intro.eyebrow')}
            </p>
            {/* Two-tone in ink rather than a brand colour: the page's own
                emphasis, without a hue that means nothing elsewhere. */}
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.02] tracking-tight text-gray-500 sm:text-6xl">
              {t('howToUse.intro.title1')}{' '}
              <span className="text-gray-900">{t('howToUse.intro.title2')}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg">
              {t('howToUse.intro.text')}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-[2px] border border-gray-200 bg-white px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
              <IoEarOutline className="h-3.5 w-3.5" />
              {t('howToUse.intro.readTime')}
            </span>
          </header>

          {/* ═══════════════ THE LOOP ═══════════════
              Numbered, unlike the old section labels — this genuinely is a
              sequence, so the numbers carry information. */}
          <section id="do" className="scroll-mt-20 border-t border-gray-200 py-12 sm:py-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
              {t('howToUse.loop.label')}
            </p>
            <h2 className="mt-3 mb-8 text-2xl font-extrabold leading-tight text-gray-900 sm:text-3xl">
              {t('howToUse.loop.title')}
            </h2>

            <ol className="grid gap-3 sm:grid-cols-2">
              {loopSteps.map(({ Icon, title, text }, i) => (
                <li
                  key={title}
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
                </li>
              ))}
            </ol>
          </section>

          {/* ═══════════════ THE SIX QUESTIONS ═══════════════ */}
          {GROUPS.map((g) => (
            <section
              key={g.key}
              className="border-t border-gray-200 py-12 sm:py-16"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                {t(`howToUse.groups.${g.key}.label`)}
              </p>
              <h2 className="mt-3 text-2xl font-extrabold leading-tight text-gray-900 sm:text-3xl">
                {t(`howToUse.groups.${g.key}.title`)}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-500">
                {t(`howToUse.groups.${g.key}.text`)}
              </p>

              <div className="mt-10 flex flex-col gap-12">
                {g.ids.map((id) => {
                  const index = ALL_WHY_QUESTIONS.findIndex((q) => q.id === id);
                  const entry = ALL_WHY_QUESTIONS[index];
                  if (!entry) return null;
                  return (
                    <CloudBlock key={id} id={id} Viz={entry.Viz} index={index} />
                  );
                })}
              </div>
            </section>
          ))}

          {/* ═══════════════ LEVELS ═══════════════ */}
          <section id="levels" className="scroll-mt-20 border-t border-gray-200 py-12 sm:py-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
              {t('howToUse.pick.label')}
            </p>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight text-gray-900 sm:text-3xl">
              {t('howToUse.pick.title')}
            </h2>
            <p className="mt-3 mb-8 max-w-xl text-sm leading-relaxed text-gray-500">
              {t('howToUse.pick.text')}
            </p>

            {/* The same glasses the level picker uses, so the guide and /levels
                show one object rather than two drawings of it. */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              {LEVEL_IDS.map((id) => (
                <div
                  key={id}
                  className="flex flex-col items-center rounded-[3px] border border-gray-200 bg-white p-4"
                >
                  <MilkGlass
                    fill={LEVEL_FILL[id]}
                    selected={false}
                    className="h-auto w-full max-w-[92px]"
                    style={{ color: themes[id].accent }}
                  />
                  <span className="mt-3 text-xl font-extrabold tabular-nums leading-none text-gray-900">
                    {t(`levels.fat${id.charAt(0).toUpperCase()}${id.slice(1)}`)}
                  </span>
                  <span className="mt-1 text-center text-xs font-bold text-gray-500">
                    {t(`levels.${id}`)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/levels"
                className={buttonPrimary}
              >
                {t('howToUse.pick.cta')}
                <IoArrowForward className="h-4 w-4" />
              </Link>
              <span className="text-xs text-gray-400">{t('howToUse.pick.note')}</span>
            </div>
          </section>

          <footer className="border-t border-gray-200 py-10 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
              {t('howToUse.footer')}
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default HowToUse;
