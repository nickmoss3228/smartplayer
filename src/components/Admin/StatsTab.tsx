import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchLearnerStats, LearnerStats } from "../../services/adminServices";

// Read-only overview of every learner. "Active" is the backend's heartbeat
// window (the app was open), "parts completed" counts parts whose quiz passed.

const COINS = [
  { key: "bitAward" as const, labelKey: "admin.stats.coins.award", accent: "text-amber-600" },
  { key: "bitWord" as const, labelKey: "admin.stats.coins.word", accent: "text-sky-600" },
  { key: "bitPhrase" as const, labelKey: "admin.stats.coins.phrase", accent: "text-emerald-600" },
];

const LEVELS = ["easy", "medium", "hard"] as const;

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-[3px] border border-gray-200 p-3">
      <div className="text-2xl font-bold text-black">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[3px] border border-gray-200 p-4">
      <h3 className="text-sm font-bold text-black mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Distribution({ data }: { data: Record<string, number> }) {
  const { t } = useTranslation("studio");
  const rows = Object.entries(data ?? {});
  if (rows.length === 0) return <p className="text-xs text-gray-400">{t("admin.stats.onboarding.empty")}</p>;
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <div className="space-y-1.5">
      {rows.map(([key, count]) => (
        <div key={key} className="flex items-center gap-2 text-xs">
          <span className="w-32 shrink-0 text-gray-600 truncate">
            {key === "none" ? t("admin.stats.onboarding.none") : key.replace(/_/g, " ")}
          </span>
          <div className="flex-1 bg-gray-100 rounded-[2px] h-3">
            <div className="bg-black h-3 rounded-[2px]" style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <span className="w-10 text-right font-semibold text-black">{count}</span>
        </div>
      ))}
    </div>
  );
}

const StatsTab = ({ token }: { token: string }) => {
  const { t } = useTranslation("studio");
  const [stats, setStats] = useState<LearnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStats(await fetchLearnerStats(token));
    } catch (err) {
      console.error(err);
      setError(t("admin.stats.loadError"));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-gray-500">{t("admin.stats.loading")}</p>;
  if (error || !stats) return <p className="text-red-600">{error || t("admin.stats.loadError")}</p>;

  const { users, learning, wallet, onboarding, signupsByDay } = stats;
  const hours = Math.floor(learning.listeningSeconds / 3600);
  const minutes = Math.floor((learning.listeningSeconds % 3600) / 60);
  const listening =
    hours > 0 ? t("admin.stats.duration.hm", { h: hours, m: minutes }) : t("admin.stats.duration.m", { m: minutes });
  const maxSignups = Math.max(1, ...signupsByDay.map((d) => d.count));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-black">{t("admin.stats.title")}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label={t("admin.stats.tiles.total")} value={users.total} />
        <Tile label={t("admin.stats.tiles.new7")} value={users.newLast7} />
        <Tile label={t("admin.stats.tiles.new30")} value={users.newLast30} />
        <Tile label={t("admin.stats.tiles.onboarded")} value={users.onboarded} />
        <Tile label={t("admin.stats.tiles.active1")} value={users.activeLast1} />
        <Tile label={t("admin.stats.tiles.active7")} value={users.activeLast7} />
        <Tile label={t("admin.stats.tiles.active30")} value={users.activeLast30} />
        <Tile label={t("admin.stats.tiles.withPart")} value={learning.learnersWithAPart} />
      </div>
      <p className="text-xs text-gray-400">{t("admin.stats.activeHint")}</p>

      <Section title={t("admin.stats.learning.title")}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <Tile label={t("admin.stats.learning.parts")} value={learning.partsCompleted} />
          <Tile label={t("admin.stats.learning.quizzes")} value={learning.quizzesPassed} />
          <Tile label={t("admin.stats.learning.words")} value={learning.wordsLearned} />
          <Tile label={t("admin.stats.learning.listening")} value={listening} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-200">
                <th className="px-3 py-2 font-medium">{t("admin.stats.learning.level")}</th>
                <th className="px-3 py-2 font-medium">{t("admin.stats.learning.learners")}</th>
                <th className="px-3 py-2 font-medium">{t("admin.stats.learning.partsCol")}</th>
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((lvl) => (
                <tr key={lvl} className="border-b border-gray-100">
                  <td className="px-3 py-2 text-black">{t(`admin.stats.learning.${lvl}`)}</td>
                  <td className="px-3 py-2 text-gray-600">{learning.byDifficulty?.[lvl]?.learners ?? 0}</td>
                  <td className="px-3 py-2 text-gray-600">{learning.byDifficulty?.[lvl]?.parts ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={t("admin.stats.coins.title")}>
        <div className="flex flex-wrap gap-6">
          {COINS.map((c) => (
            <div key={c.key}>
              <div className={`text-2xl font-bold ${c.accent}`}>{wallet[c.key]}</div>
              <div className={`text-xs font-semibold ${c.accent}`}>{t(c.labelKey)}</div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title={t("admin.stats.onboarding.englishLevel")}>
          <Distribution data={onboarding.englishLevel} />
        </Section>
        <Section title={t("admin.stats.onboarding.listeningExperience")}>
          <Distribution data={onboarding.listeningExperience} />
        </Section>
      </div>

      <Section title={t("admin.stats.signups.title")}>
        <div className="flex items-end gap-0.5 h-32">
          {signupsByDay.map((d) => (
            <div
              key={d.day}
              title={t("admin.stats.signups.bar", { day: d.day, count: d.count })}
              className="flex-1 h-full flex items-end"
            >
              <div
                className="w-full bg-black rounded-t-[2px]"
                style={{ height: `${(d.count / maxSignups) * 100}%`, minHeight: d.count > 0 ? 2 : 0 }}
              />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default StatsTab;
