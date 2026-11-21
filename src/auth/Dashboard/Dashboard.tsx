// components/Dashboard/Dashboard.tsx
//
// Four headed sections, in the order people use them: «Учёба» (words, levels,
// weeks), «Награды» (rank, achievements, currency), «Персонаж» and «Аккаунт».
// Every option is a row that says what it is and what it does. Nothing here
// is shown as a percentage: progress is counted in parts.
import React, { useState, useEffect, useMemo } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IoBarChartOutline,
  IoChevronForward,
  IoCreateOutline,
  IoKeyOutline,
  IoLogOutOutline,
  IoRefreshOutline,
} from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
import { useCharacter } from "../../context/CharacterContext";
import { useCharacterPortrait } from "../../modules/character/useCharacterPortrait";
import { restartOnboarding } from "../../services/onboardingServices";
import { fetchAllDashboardData } from "../../services/dashboardServices";
import {
  getOverallProgress,
  getRank,
  getProgressPercentage,
  getDifficultyTheme,
  getTotalCompleted,
  getTotalLevels,
  RANKS,
} from "./dashboardModule";
import { OverviewData, DetailedProgressMap } from "../../types/Dashboard";
import ProfileHeader from "./ProfileHeader";
import DifficultyModal from "./DifficultyModal";
import RankModal from "./RankModal";
import ChangePasswordModal from "./ChangePasswordModal";
import NicknameModal from "./NicknameModal";
import CharacterEditorDialog from "./CharacterEditorDialog";
import AchievementsRow from "./AchievementsRow";
import WalletRow from "./WalletRow";
import KopilkaCard from "./KopilkaCard";
import WeeklyActivityChart from "./charts/WeeklyActivityChart";
import { buildWeeklySeries } from "./charts/progressChartData";
import { DashboardSection, ListRow, RowCard } from "./SectionKit";
import { useProfile } from "../../context/ProfileContext";
import { buttonBase, buttonTone } from "../../components/ui/buttonStyles";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

// Section ids double as the jump buttons' targets, in page order.
const SECTIONS = [
  { id: "learn", key: "learn" },
  { id: "rewards", key: "rewards" },
  { id: "me", key: "character" },
  { id: "account", key: "account" },
] as const;

/** Which section the reader is in: the last one whose top has passed the jump bar. */
const useCurrentSection = (): string => {
  const [current, setCurrent] = useState<string>(SECTIONS[0].id);
  useEffect(() => {
    const onScroll = () => {
      let found: string = SECTIONS[0].id;
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) found = id;
      }
      // At the very bottom the last, short section may never reach the bar.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        found = SECTIONS[SECTIONS.length - 1].id;
      }
      setCurrent(found);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return current;
};

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, loading, updateUser } = useAuth();
  const { character } = useCharacter();
  const portrait = useCharacterPortrait(character);
  const navigate = useNavigate();
  const location = useLocation();

  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [detailedProgress, setDetailedProgress] =
    useState<DetailedProgressMap>({});
  const [progressLoading, setProgressLoading] = useState<boolean>(true);

  // Modal state — clicking a level row opens the window for that difficulty
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null
  );
  const [rankModalOpen, setRankModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  // Links into the editor ("/dashboard#character", from the school) open it.
  const [editorOpen, setEditorOpen] = useState(location.hash === "#character");
  const [weeksOpen, setWeeksOpen] = useState(false);
  const [introRestarting, setIntroRestarting] = useState(false);
  const [introError, setIntroError] = useState(false);
  const currentSection = useCurrentSection();

  useEffect(() => {
    if (location.hash === "#character") setEditorOpen(true);
  }, [location.hash]);

  // "Take the intro again": the server forgets the answers and the finish, and
  // /welcome runs from the first question. Finishing it lands on the level the
  // new answer suggests, exactly as the first time (returnTo /levels — see
  // modules/onboarding/destination.ts).
  const handleRestartIntro = async () => {
    setIntroRestarting(true);
    setIntroError(false);
    try {
      await restartOnboarding();
      updateUser({ onboardedAt: null, englishLevel: null, listeningExperience: null });
      navigate("/welcome", { state: { returnTo: "/levels" } });
    } catch {
      setIntroError(true);
      setIntroRestarting(false);
    }
  };

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      const cachedData = sessionStorage.getItem("dashboardData");
      if (cachedData) {
        const { overviewData, detailedProgress } = JSON.parse(cachedData);
        setOverviewData(overviewData);
        setDetailedProgress(detailedProgress);
        setProgressLoading(false);
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const { overviewData, detailedProgress } =
          await fetchAllDashboardData(token);
        setOverviewData(overviewData);
        setDetailedProgress(detailedProgress);
        sessionStorage.setItem(
          "dashboardData",
          JSON.stringify({ overviewData, detailedProgress })
        );
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setProgressLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const { profile, profileLoading, setProfileDirect } = useProfile();

  // Built entirely from data the dashboard already fetches: every graded part in
  // detailedProgress carries a completedAt, so the weekly series needs no new
  // endpoint.
  const weeklySeries = useMemo(
    () => buildWeeklySeries(detailedProgress, { locale: i18n.language }),
    [detailedProgress, i18n.language]
  );

  const closeEditor = () => {
    setEditorOpen(false);
    if (location.hash === "#character") navigate(location.pathname, { replace: true });
  };

  // Close windows on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedDifficulty(null);
        setRankModalOpen(false);
        setPasswordModalOpen(false);
        setNicknameModalOpen(false);
        setEditorOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black text-xl">{t("dashboard.loading")}</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const overallProgress = getOverallProgress(overviewData);
  const rank = getRank(overallProgress);
  const RankIcon = rank.icon;
  const nextRank = RANKS[RANKS.findIndex((r) => r.title === rank.title) + 1];
  const made = Boolean(character?.look);

  const jumpTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-room pt-20 pb-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">

        {/* ── Who you are ── */}
        <div className="bg-white rounded-card p-4 sm:p-6 border border-line animate-fade-in">
          {profileLoading ? (
            <div className="animate-pulse flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-200" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded-[3px] w-32" />
                <div className="h-3 bg-gray-200 rounded-[3px] w-48" />
              </div>
            </div>
          ) : (
            <ProfileHeader
              name={profile?.nickname ?? user.email ?? ""}
              email={profile ? profile.email : null}
              onOpenCharacter={() => setEditorOpen(true)}
            />
          )}
        </div>

        {/* ── Jump to a section. Phones and tablets: on desktop every
            section is already on screen side by side. ── */}
        <nav
          aria-label={t("dashboard.home.sectionsLabel")}
          className="lg:hidden sticky top-13 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-room/95"
        >
          <ul className="m-0 p-0 list-none flex gap-1.5 overflow-x-auto">
            {SECTIONS.map(({ id, key }) => {
              const on = currentSection === id;
              return (
                <li key={id} className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => jumpTo(id)}
                    aria-current={on ? "location" : undefined}
                    className={`h-9 px-3 rounded-chip border text-[13px] font-semibold transition-colors ${
                      on ? "bg-ink border-ink text-white" : "bg-white border-line text-ink hover:border-line-strong"
                    }`}
                  >
                    {t(`dashboard.home.${key}`)}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-x-6 items-start mt-2">

          {/* ── Учёба ── */}
          <DashboardSection
            id="learn"
            title={t("dashboard.home.learn")}
            hint={t("dashboard.home.learnHint")}
            className="lg:row-span-3"
          >
            <KopilkaCard />

            <div className="bg-white rounded-card border border-line overflow-hidden">
              <div className="px-4 pt-3.5 pb-1">
                <h3 className="m-0 text-[15px] font-bold text-ink">{t("dashboard.home.levelsTitle")}</h3>
                <p className="m-0 mt-0.5 text-[13px] leading-snug text-dim">{t("dashboard.home.levelsHint")}</p>
              </div>
              {progressLoading && !overviewData ? (
                <div className="px-4 pb-4 pt-2 flex flex-col gap-4 animate-pulse">
                  {[0, 1, 2].map((i) => (
                    <div key={i}>
                      <div className="h-3.5 bg-gray-200 rounded-[3px] w-1/3 mb-2" />
                      <div className="h-1.5 bg-gray-200 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="m-0 p-0 list-none">
                  {overviewData &&
                    DIFFICULTIES.map((difficulty) => {
                      const info = overviewData[difficulty];
                      const theme = getDifficultyTheme(difficulty);
                      return (
                        <li key={difficulty}>
                          <button
                            type="button"
                            onClick={() => setSelectedDifficulty(difficulty)}
                            aria-haspopup="dialog"
                            className="w-full min-h-[56px] flex items-center gap-3 px-4 py-3 text-left hover:bg-room/70 active:bg-room transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal"
                          >
                            <span className="flex-1 min-w-0">
                              <span className="flex items-baseline justify-between gap-3">
                                <span className="text-[14px] font-bold text-ink">
                                  {t(`dashboard.difficulty.${difficulty}`)}
                                </span>
                                <span className="text-[13px] text-dim tabular-nums">
                                  {info.completed === 0 && info.total > 0
                                    ? t("dashboard.home.notStarted")
                                    : t("dashboard.home.partsOf", { completed: info.completed, count: info.total })}
                                </span>
                              </span>
                              <span className="block mt-2 h-1.5 rounded-full overflow-hidden bg-black/[0.06]">
                                <span
                                  className={`block h-full ${theme.bg} rounded-full transition-all duration-700 ease-out`}
                                  style={{ width: `${getProgressPercentage(info.completed, info.total)}%` }}
                                />
                              </span>
                            </span>
                            <IoChevronForward size={16} aria-hidden="true" className="text-muted flex-shrink-0" />
                          </button>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>

            <RowCard>
              <ListRow
                icon={IoBarChartOutline}
                title={t("dashboard.home.weeksTitle")}
                hint={t("dashboard.home.weeksHint")}
                expanded={weeksOpen}
                controls="weeks-chart"
                onClick={() => setWeeksOpen((v) => !v)}
              />
              {weeksOpen && (
                // The chart brings its own card; inside this one it drops the frame.
                <div id="weeks-chart" className="[&>div]:border-0 [&>div]:rounded-none">
                  <WeeklyActivityChart weeks={weeklySeries.weeks} hasData={weeklySeries.hasData} />
                </div>
              )}
            </RowCard>
          </DashboardSection>

          {/* ── Награды ── */}
          <DashboardSection
            id="rewards"
            title={t("dashboard.home.rewards")}
            hint={t("dashboard.home.rewardsHint")}
          >
            <RowCard>
              <ListRow
                icon={RankIcon}
                iconDark
                title={t(`dashboard.ranks.${rank.title}`)}
                hint={
                  nextRank
                    ? t("dashboard.home.rankHint", { rank: t(`dashboard.ranks.${nextRank.title}`) })
                    : t("dashboard.home.rankTop")
                }
                hasPopup
                disabled={progressLoading && !overviewData}
                onClick={() => setRankModalOpen(true)}
              />
              <AchievementsRow collapsible />
              <div className="px-4 pt-3 pb-4">
                <p className="m-0 mb-2 text-[14px] font-bold text-ink">{t("dashboard.home.walletTitle")}</p>
                <WalletRow compact />
              </div>
            </RowCard>
          </DashboardSection>

          {/* ── Персонаж ── */}
          <DashboardSection
            id="me"
            title={t("dashboard.home.character")}
            hint={t("dashboard.home.characterHint")}
          >
            <div className="bg-white rounded-card border border-line p-4 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                {/* The portrait is drawn after load; until then, its backdrop. */}
                {portrait ? (
                  <img
                    src={portrait}
                    alt=""
                    className="w-[76px] h-[76px] rounded-tile bg-[#d8ebf6] object-cover flex-shrink-0"
                  />
                ) : (
                  <span className="w-[76px] h-[76px] rounded-tile bg-[#d8ebf6] flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <h3 className="m-0 text-[15px] font-bold text-ink">
                    {made ? t("dashboard.home.characterMade") : t("dashboard.home.characterNew")}
                  </h3>
                  <p className="m-0 mt-0.5 text-[13px] leading-snug text-dim">{t("dashboard.home.characterText")}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
                  aria-haspopup="dialog"
                  className={`${buttonBase} flex-1 h-11 px-4 ${buttonTone.secondary}`}
                >
                  {made ? t("dashboard.home.characterEdit") : t("dashboard.home.characterCreate")}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/room?me=1")}
                  className={`${buttonBase} flex-1 h-11 px-4 ${buttonTone.secondary}`}
                >
                  {t("dashboard.home.openSchool")}
                </button>
              </div>
            </div>
          </DashboardSection>

          {/* ── Аккаунт ── */}
          <DashboardSection id="account" title={t("dashboard.home.account")}>
            <RowCard>
              {profile && (
                <ListRow
                  icon={IoCreateOutline}
                  title={t("dashboard.home.name")}
                  hint={profile.nickname}
                  hasPopup
                  onClick={() => setNicknameModalOpen(true)}
                />
              )}
              <ListRow
                icon={IoKeyOutline}
                title={t("dashboard.home.password")}
                hint={t("dashboard.home.passwordHint")}
                hasPopup
                onClick={() => setPasswordModalOpen(true)}
              />
              <ListRow
                icon={IoRefreshOutline}
                title={t("dashboard.intro.button")}
                hint={t("dashboard.home.introHint")}
                disabled={introRestarting}
                onClick={handleRestartIntro}
              />
              <ListRow
                icon={IoLogOutOutline}
                title={t("dashboard.signOut")}
                danger
                onClick={signOut}
              />
            </RowCard>
            {introError && (
              <p role="alert" className="m-0 px-0.5 text-[13px] text-signal-ink">
                {t("dashboard.intro.error")}
              </p>
            )}
          </DashboardSection>
        </div>
      </div>

      {selectedDifficulty && overviewData && (
        <DifficultyModal
          difficulty={selectedDifficulty}
          overview={overviewData[selectedDifficulty as keyof OverviewData]}
          onClose={() => setSelectedDifficulty(null)}
        />
      )}

      {rankModalOpen && (
        <RankModal
          completed={getTotalCompleted(overviewData)}
          total={getTotalLevels(overviewData)}
          onClose={() => setRankModalOpen(false)}
        />
      )}

      {passwordModalOpen && (
        <ChangePasswordModal
          passwordChangedAt={profile?.passwordChangedAt}
          onChanged={(passwordChangedAt) => {
            if (profile) setProfileDirect({ ...profile, passwordChangedAt });
          }}
          onClose={() => setPasswordModalOpen(false)}
        />
      )}

      {nicknameModalOpen && profile && (
        <NicknameModal
          profile={profile}
          onSaved={setProfileDirect}
          onClose={() => setNicknameModalOpen(false)}
        />
      )}

      {editorOpen && <CharacterEditorDialog onClose={closeEditor} />}
    </div>
  );
};

export default Dashboard;
