// components/Home/HubCards.tsx
//
// The hub's cards. Each one is a way into a section and ends in one action;
// what a student has achieved (rank, achievements, charts) stays on the
// profile page. Only the Continue card gets the filled button: one primary
// action per screen (design manifest §5).

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoChevronForward, IoPlay } from 'react-icons/io5';
import MilkGlass from '../Levels/MilkGlass';
import { themes } from '../../modules/levelprogress/themes.levelprogress';
import { buttonPrimary } from '../ui/buttonStyles';
import { CURRENCIES } from '../../config/currencies';
import { useWallet } from '../../context/WalletContext';
import { saveLastLevel, type LevelId } from '../../services/lastLevel';
import type { ContinueTarget, StartedStory } from '../../modules/hub/hubData';
import type { OverviewData } from '../../types/Dashboard';
import type { SchoolState } from '../../services/schoolServices';
import { useContinueComic } from './useHubData';
import stockSchool from '../../assets/landing/f-school.webp';

const card = 'bg-white rounded-card border border-line';
const eyebrow = 'm-0 font-mono text-[10px] uppercase tracking-[0.16em] text-dim';

const LEVELS: { id: LevelId; fill: number; fatKey: string }[] = [
  { id: 'easy', fill: 0.28, fatKey: 'levels.fatEasy' },
  { id: 'medium', fill: 0.58, fatKey: 'levels.fatMedium' },
  { id: 'hard', fill: 0.92, fatKey: 'levels.fatHard' },
];

/** Parts as segments, never a percentage (design manifest, Dashboard). */
const PartMeter = ({
  total,
  done,
  current,
  accent,
  onDark = false,
}: {
  total: number;
  done: number[];
  current?: number;
  accent: string;
  /** Over a picture: a translucent white track, so it reads on any comic. */
  onDark?: boolean;
}) => (
  <span className="flex gap-1" aria-hidden="true">
    {Array.from({ length: total }, (_, i) => {
      const n = i + 1;
      const isDone = done.includes(n);
      return (
        // The empty track is the dashboard's (bg-black/[0.06]); only the level
        // accent comes in inline, from themes.levelprogress.
        <span
          key={n}
          className={`flex-1 h-1.5 rounded-full ${isDone || n === current ? '' : onDark ? 'bg-white/30' : 'bg-black/[0.06]'}`}
          style={
            isDone
              ? { background: accent }
              : n === current
                ? { boxShadow: `inset 0 0 0 1.5px ${accent}` }
                : undefined
          }
        />
      );
    })}
  </span>
);

// ── Continue ─────────────────────────────────────────────────────────────────

export const ContinueCard = ({ target, loading }: { target: ContinueTarget | null; loading: boolean }) => {
  const { t } = useTranslation();

  if (loading && !target) {
    return (
      <div className={`${card} p-4 sm:p-6 animate-pulse`}>
        <div className="h-3 w-24 bg-gray-200 rounded-[3px]" />
        <div className="mt-3 h-5 w-48 bg-gray-200 rounded-[3px]" />
        <div className="mt-4 h-1.5 bg-gray-200 rounded-full" />
        <div className="mt-5 h-12 bg-gray-200 rounded-[3px]" />
      </div>
    );
  }

  if (!target) {
    return (
      <div className={`${card} p-4 sm:p-6`}>
        <p className={eyebrow}>{t('hub.continue.startEyebrow')}</p>
        <p className="m-0 mt-2 text-[15px] text-dim">{t('hub.continue.empty')}</p>
        <Link to="/levels" className={`${buttonPrimary} mt-5 w-full sm:w-auto sm:px-8`}>
          {t('hub.continue.chooseLevel')}
        </Link>
      </div>
    );
  }

  return <ContinueHero target={target} />;
};

/**
 * The part to go back to, over its own comic page; the whole card is the link.
 * The part meter runs along the top, and the title and the play button sit on
 * a dark fade at the bottom, so both read on any picture.
 */
const ContinueHero = ({ target }: { target: ContinueTarget }) => {
  const { t } = useTranslation();
  const comic = useContinueComic(target);
  const theme = themes[target.difficulty] ?? themes.easy;
  const fat = LEVELS.find((l) => l.id === target.difficulty)?.fatKey ?? 'levels.fatEasy';
  const isStart = target.source === 'start';
  const partLine = target.totalParts
    ? t('hub.continue.part', { part: target.part, total: target.totalParts })
    : t('hub.continue.partOnly', { part: target.part });

  return (
    <Link
      to={target.href}
      onClick={() => saveLastLevel(target.difficulty)}
      aria-label={`${t(isStart ? 'hub.continue.start' : 'hub.continue.play')}: ${target.title}, ${partLine}`}
      className="group relative flex h-full min-h-[240px] sm:min-h-[280px] flex-col overflow-hidden rounded-card bg-ink text-white no-underline
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
    >
      {comic && (
        <img
          src={comic}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[50%_30%] transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      )}
      {/* Dark at the top for the meter and at the bottom for the text, clear in between. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.05)_30%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.78)_100%)]"
      />

      <span className="relative flex flex-col gap-2.5 p-4 sm:p-5">
        {target.totalParts ? (
          <PartMeter total={target.totalParts} done={target.completedParts} current={target.part} accent="#ffffff" onDark />
        ) : null}
        <span className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/80">
            {t(isStart ? 'hub.continue.startEyebrow' : 'hub.continue.eyebrow')}
          </span>
          <span className="flex items-center gap-1.5 rounded-chip bg-black/35 px-2 py-0.5 text-[12px] font-semibold text-white">
            <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: theme.accent }} />
            {t(fat)} · {t(`levels.${target.difficulty}`)}
          </span>
        </span>
      </span>

      <span className="relative mt-auto flex items-end justify-between gap-4 p-4 sm:p-5">
        <span className="min-w-0">
          <span className="block text-xl sm:text-2xl font-extrabold leading-tight tracking-[-0.02em]">{target.title}</span>
          <span className="mt-1 block text-[14px] text-white/80 tabular-nums">{partLine}</span>
        </span>
        <span
          aria-hidden="true"
          className="flex h-12 w-12 sm:h-14 sm:w-14 flex-none items-center justify-center rounded-full bg-white text-ink shadow-lg
            transition-transform duration-200 group-hover:scale-105"
        >
          <IoPlay className="ml-0.5 h-5 w-5 sm:h-6 sm:w-6" />
        </span>
      </span>
    </Link>
  );
};

// ── This week ────────────────────────────────────────────────────────────────

export const WeekCard = ({ parts }: { parts: number }) => {
  const { t } = useTranslation();
  const { wallet } = useWallet();

  return (
    <div className="grid grid-cols-2 lg:flex lg:flex-col gap-3 h-full">
      <div className={`${card} px-4 py-3.5 lg:flex-1`}>
        <p className={eyebrow}>{t('hub.week.title')}</p>
        <p className="m-0 mt-1 text-2xl font-extrabold text-ink tabular-nums">{t('hub.week.parts', { count: parts })}</p>
      </div>
      {/* The balance, kept compact. Each coin says where it comes from on
          hover, and on focus (which is a tap on a phone). */}
      <div className={`${card} px-3 py-2.5`}>
        <p className={eyebrow}>{t('hub.week.earned')}</p>
        <div className="mt-1 flex flex-wrap gap-x-1 gap-y-0.5 -ml-1.5">
          {CURRENCIES.map(({ key, label, icon: Icon, textClasses }, i) => {
            const from = t(`hub.week.from.${key}`);
            const value = wallet ? wallet[key] : '–';
            const align =
              i === 0 ? 'left-0' : i === CURRENCIES.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2';
            return (
              <span key={key} className="group relative">
                <button
                  type="button"
                  aria-label={`${label}: ${value}. ${from}`}
                  className="flex cursor-help items-center gap-1 rounded-chip px-1.5 py-0.5 text-[13px] font-bold text-ink tabular-nums
                    transition-colors hover:bg-room focus-visible:outline-2 focus-visible:outline-signal"
                >
                  <Icon size={13} className={textClasses} aria-hidden="true" />
                  {value}
                </button>
                <span
                  role="tooltip"
                  className={`pointer-events-none absolute bottom-full z-20 mb-1.5 w-max max-w-[210px] rounded-tile bg-ink px-2.5 py-1.5
                    text-[12px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150
                    group-hover:opacity-100 group-focus-within:opacity-100 ${align}`}
                >
                  <span className="block font-bold">{label}</span>
                  {from}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Levels ───────────────────────────────────────────────────────────────────

export const LevelsCard = ({ overview, current }: { overview: OverviewData | null; current: LevelId | null }) => {
  const { t } = useTranslation();

  return (
    <div className={`${card} p-4 sm:p-6 h-full`}>
      <div className="flex items-baseline justify-between">
        <p className={eyebrow}>{t('hub.levels.title')}</p>
        <Link to="/levels" className="text-[13px] font-semibold text-dim hover:text-ink">
          {t('hub.levels.all')}
        </Link>
      </div>
      <ul className="m-0 mt-3 p-0 list-none grid grid-cols-3 gap-2">
        {LEVELS.map((level) => {
          const info = overview?.[level.id];
          const on = current === level.id;
          return (
            <li key={level.id}>
              <Link
                to={`/levels/${level.id}`}
                onClick={() => saveLastLevel(level.id)}
                className="flex flex-col items-center rounded-tile py-2 hover:bg-room transition-colors
                  focus-visible:outline-2 focus-visible:outline-signal"
              >
                <MilkGlass
                  fill={level.fill}
                  selected={on}
                  className="w-12 sm:w-14 h-auto"
                  style={{ color: themes[level.id].accent }}
                />
                <span className={`mt-1.5 text-[15px] font-extrabold tabular-nums ${on ? 'text-ink' : 'text-dim'}`}>
                  {t(level.fatKey)}
                </span>
                <span className="text-[12px] text-dim tabular-nums">
                  {!info
                    ? ' '
                    : info.completed === 0
                      ? t('hub.levels.notStarted')
                      : t('hub.levels.partsOf', { done: info.completed, total: info.total })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// ── Started stories ──────────────────────────────────────────────────────────

export const StartedCard = ({ stories }: { stories: StartedStory[] }) => {
  const { t } = useTranslation();
  if (stories.length === 0) return null;

  return (
    <div className={`${card} p-4 sm:p-6 h-full`}>
      <p className={eyebrow}>{t('hub.started.title')}</p>
      <ul className="m-0 mt-3 p-0 list-none grid grid-cols-1 sm:grid-cols-2 gap-2">
        {stories.slice(0, 4).map((s) => {
          const accent = (themes[s.difficulty] ?? themes.easy).accent;
          return (
            <li key={`${s.difficulty}/${s.storyId}`}>
              <Link
                to={s.href}
                onClick={() => saveLastLevel(s.difficulty)}
                className="flex items-center gap-3 rounded-tile border border-line px-3 py-2.5 hover:border-line-strong transition-colors
                  focus-visible:outline-2 focus-visible:outline-signal"
              >
                <span className="flex-1 min-w-0">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] font-bold text-ink">{s.title}</span>
                    <span className="flex-shrink-0 text-[12px] text-dim tabular-nums">
                      {t('hub.levels.partsOf', { done: s.done, total: s.total })}
                    </span>
                  </span>
                  <span className="block mt-2">
                    <PartMeter total={s.total} done={Array.from({ length: s.done }, (_, i) => i + 1)} accent={accent} />
                  </span>
                </span>
                <IoChevronForward size={16} aria-hidden="true" className="text-muted flex-shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// ── School ───────────────────────────────────────────────────────────────────

/**
 * The student's own school, as a picture filling the card, with its name on
 * it. The picture is the snapshot the school page took last time it was open
 * on this device (services/schoolShot.ts); before that, the landing's school.
 */
export const SchoolCard = ({ school, shot }: { school?: SchoolState; shot?: string | null }) => {
  const { t } = useTranslation();
  const name = school?.name?.trim() || t('hub.school.unnamed');

  return (
    <Link
      to="/room"
      aria-label={`${t('hub.school.enter')}: ${name}`}
      className="group relative flex h-full min-h-[220px] flex-col justify-end overflow-hidden rounded-card border border-line bg-[#d8ebf6] text-white no-underline
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
    >
      <img
        src={shot || stockSchool}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        // The school is pixel art; keep it crisp when the card scales it up.
        style={shot ? { imageRendering: 'pixelated' } : undefined}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_45%,rgba(0,0,0,0.72)_100%)]"
      />
      <span className="relative flex items-end justify-between gap-3 p-4">
        <span className="min-w-0">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-white/80">{t('hub.school.title')}</span>
          <span className="mt-0.5 block truncate text-lg font-extrabold leading-tight">{name}</span>
          {school && (
            <span className="block text-[13px] text-white/80">{t('hub.school.rooms', { count: school.ownedRoomIds.length })}</span>
          )}
        </span>
        <IoChevronForward size={20} aria-hidden="true" className="flex-none transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
};
