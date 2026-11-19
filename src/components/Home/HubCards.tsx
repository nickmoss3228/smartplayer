// components/Home/HubCards.tsx
//
// The hub's cards. Each one is a way into a section and ends in one action;
// what a student has achieved (rank, achievements, charts) stays on the
// profile page. Only the Continue card gets the filled button: one primary
// action per screen (design manifest §5).

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoChevronForward, IoSchoolOutline } from 'react-icons/io5';
import MilkGlass from '../Levels/MilkGlass';
import { themes } from '../../modules/levelprogress/themes.levelprogress';
import { buttonPrimary, buttonSecondary } from '../ui/buttonStyles';
import { CURRENCIES } from '../../config/currencies';
import { useWallet } from '../../context/WalletContext';
import { saveLastLevel, type LevelId } from '../../services/lastLevel';
import { buildableRooms } from '../../config/schoolCatalog';
import { adviceFor } from '../../modules/school/advisor';
import type { ContinueTarget, StartedStory } from '../../modules/hub/hubData';
import type { OverviewData } from '../../types/Dashboard';
import type { SchoolState, WalletBalances } from '../../services/schoolServices';

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
}: {
  total: number;
  done: number[];
  current?: number;
  accent: string;
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
          className={`flex-1 h-1.5 rounded-full ${isDone || n === current ? '' : 'bg-black/[0.06]'}`}
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

  const theme = themes[target.difficulty] ?? themes.easy;
  const fat = LEVELS.find((l) => l.id === target.difficulty)?.fatKey ?? 'levels.fatEasy';
  const isStart = target.source === 'start';

  return (
    <div className={`${card} p-4 sm:p-6`}>
      <div className="flex items-center justify-between gap-3">
        <p className={eyebrow}>{t(isStart ? 'hub.continue.startEyebrow' : 'hub.continue.eyebrow')}</p>
        <span className="flex items-center gap-1.5 rounded-chip border border-line px-2 py-0.5 text-[12px] font-semibold text-ink">
          <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: theme.accent }} />
          {t(fat)} · {t(`levels.${target.difficulty}`)}
        </span>
      </div>

      {/* Card title (h3), manifest §3. */}
      <h2 className="m-0 mt-2 text-[15px] sm:text-lg font-bold text-ink">{target.title}</h2>
      <p className="m-0 mt-0.5 text-[14px] text-dim tabular-nums">
        {target.totalParts
          ? t('hub.continue.part', { part: target.part, total: target.totalParts })
          : t('hub.continue.partOnly', { part: target.part })}
      </p>

      {target.totalParts ? (
        <div className="mt-4">
          <PartMeter
            total={target.totalParts}
            done={target.completedParts}
            current={target.part}
            accent={theme.accent}
          />
        </div>
      ) : null}

      <Link
        to={target.href}
        onClick={() => saveLastLevel(target.difficulty)}
        className={`${buttonPrimary} mt-5 w-full sm:w-auto sm:px-8`}
      >
        {t(isStart ? 'hub.continue.start' : 'hub.continue.play')}
      </Link>
    </div>
  );
};

// ── This week ────────────────────────────────────────────────────────────────

export const WeekCard = ({ parts }: { parts: number }) => {
  const { t } = useTranslation();
  const { wallet } = useWallet();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 h-full">
      <div className={`${card} px-4 py-3.5`}>
        <p className={eyebrow}>{t('hub.week.title')}</p>
        <p className="m-0 mt-1 text-2xl font-extrabold text-ink tabular-nums">{t('hub.week.parts', { count: parts })}</p>
      </div>
      <div className={`${card} px-4 py-3.5`}>
        <p className={eyebrow}>{t('hub.week.earned')}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {CURRENCIES.map(({ key, label, icon: Icon, textClasses }) => (
            <span key={key} title={label} className="flex items-center gap-1 text-[15px] font-bold text-ink tabular-nums">
              <Icon size={15} className={textClasses} aria-hidden="true" />
              {wallet ? wallet[key] : '–'}
            </span>
          ))}
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

export const SchoolCard = ({
  school,
  wallet,
}: {
  school?: SchoolState;
  wallet?: WalletBalances;
}) => {
  const { t } = useTranslation();

  let line: string | null = null;
  if (school && wallet) {
    const canBuild = buildableRooms(school.variantId, school.ownedRoomIds).some(
      ({ spec, blocker }) => blocker === null && wallet[spec.currency] >= spec.price,
    );
    const advice = adviceFor({
      weeksOwed: school.payroll?.weeksOwed ?? 0,
      due: school.payroll?.due ?? 0,
      morale: school.payroll?.morale ?? 100,
      canBuild,
      rooms: school.ownedRoomIds.length,
    });
    line = t(`school.advisor.${advice.line}`, advice.params);
  }

  return (
    <div className={`${card} p-4 sm:p-6 h-full flex flex-col`}>
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-11 h-11 rounded-tile bg-room border border-line flex items-center justify-center text-ink">
          <IoSchoolOutline size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className={eyebrow}>{t('hub.school.title')}</p>
          <p className="m-0 mt-0.5 text-[15px] font-bold text-ink truncate">
            {school?.name?.trim() || t('hub.school.unnamed')}
          </p>
          {school && (
            <p className="m-0 text-[13px] text-dim">{t('hub.school.rooms', { count: school.ownedRoomIds.length })}</p>
          )}
        </div>
      </div>
      {/* The deputy head's line from the school itself (modules/school/advisor.ts):
          what is owed, what is affordable. It is what ties "listen and earn"
          to "spend in the school". */}
      {line && <p className="m-0 mt-3 text-[14px] leading-snug text-ink">«{line}»</p>}
      <div className="mt-auto pt-4">
        <Link to="/room" className={`${buttonSecondary} w-full`}>
          {t('hub.school.enter')}
        </Link>
      </div>
    </div>
  );
};
