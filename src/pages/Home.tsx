// pages/Home.tsx: the signed-in hub (/home), behind HUB_ENABLED.
//
// One question per card, in the order a student needs them: where was I
// (Continue), how am I doing this week, which level, what is half-finished,
// my words, my school. Everything else a student owns (rank, achievements,
// character, account) stays on the profile page behind the avatar.
//
// No new endpoint: progress is the dashboard's request and cache, the
// continue target is decided by modules/hub/hubData.ts from that and the
// device's last-played record, and the school card makes one GET.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { loadLastPlayed } from '../services/lastPlayed';
import { readLastLevel } from '../services/lastLevel';
import { readSchoolShot } from '../services/schoolShot';
import { pickContinue, startedStories, partsCompletedSince, startOfWeek } from '../modules/hub/hubData';
import { difficultyForLevel, isEnglishLevel } from '../modules/onboarding/onboardingOptions';
import KopilkaCard from '../auth/Dashboard/KopilkaCard';
import { useHubProgress, useHubSchool } from '../components/Home/useHubData';
import { ContinueCard, LevelsCard, SchoolCard, StartedCard, WeekCard } from '../components/Home/HubCards';

const Home = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { overview, detailed, loading } = useHubProgress();
  const { school } = useHubSchool();
  const [schoolShot] = useState(() => readSchoolShot(user?.id)?.url ?? null);
  const [lastPlayed] = useState(loadLastPlayed);
  const [lastLevel] = useState(readLastLevel);

  const locale = i18n.language.startsWith('en') ? 'en' : 'ru';
  const suggested = isEnglishLevel(user?.englishLevel) ? difficultyForLevel(user.englishLevel) : null;

  const target = useMemo(
    () => pickContinue({ lastPlayed, overview, detailed, locale, suggestedLevel: suggested }),
    [lastPlayed, overview, detailed, locale, suggested],
  );
  const started = useMemo(
    () =>
      startedStories({
        overview,
        detailed,
        exclude: target ? { difficulty: target.difficulty, storyId: target.storyId } : null,
      }),
    [overview, detailed, target],
  );
  const weekParts = useMemo(() => partsCompletedSince(detailed, startOfWeek(new Date())), [detailed]);

  const name = profile?.nickname?.trim();

  return (
    <div className="min-h-dvh bg-room pt-20 pb-12 px-4 sm:px-8 lg:px-14">
      <div className="max-w-6xl mx-auto">
        <h1 className="m-0 mb-4 text-[26px] sm:text-[30px] lg:text-4xl font-extrabold tracking-[-0.03em] leading-tight text-ink animate-fade-in">
          {name ? t('hub.greeting', { name }) : t('hub.greetingPlain')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 items-stretch">
          <div className="lg:col-span-2 animate-fade-in-delay-1">
            <ContinueCard target={target} loading={loading} />
          </div>
          <div className="animate-fade-in-delay-1">
            <WeekCard parts={weekParts} />
          </div>

          <div className="animate-fade-in-delay-2">
            <LevelsCard overview={overview} current={target?.difficulty ?? lastLevel} />
          </div>
          {started.length > 0 && (
            <div className="lg:col-span-2 animate-fade-in-delay-2">
              <StartedCard stories={started} />
            </div>
          )}

          <div className={`animate-fade-in-delay-3 ${started.length > 0 ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
            <KopilkaCard quiet />
          </div>
          <div className="animate-fade-in-delay-3">
            <SchoolCard school={school} shot={schoolShot} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
