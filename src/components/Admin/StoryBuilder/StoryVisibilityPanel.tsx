import { useCallback, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  AdminStoryListItem,
  fetchHiddenStories,
  setStoryHidden,
} from "../../../services/adminStoryServices";
import type { DifficultySlug } from "../../../types/storyGroups";

/**
 * Controls which stories students actually see.
 *
 * Hiding is stored per (difficulty, storyId), so this panel is the single
 * answer to "what is on the shelves" without unpublishing anything.
 *
 * It is called UNLIST in the UI, because that is what it does. `hidden` is
 * consulted in exactly one place on the server — listPublishedStories — and
 * never by getPublishedStory, which is what actually serves parts and audio.
 * So it takes a story off the shelf without revoking anything: anyone who
 * bought it keeps it, and playback keeps working. The catch, and the reason the
 * button says so, is that it unlists for EVERYONE including owners, so a buyer
 * would still have access and no way to reach it.
 */
const DIFFICULTIES: DifficultySlug[] = ["easy", "medium", "hard"];

interface StoryVisibilityPanelProps {
  token: string;
  /** DB stories, so ones with no static counterpart are listed too. */
  stories: AdminStoryListItem[];
}

const StoryVisibilityPanel = ({ token, stories }: StoryVisibilityPanelProps) => {
  const { t } = useTranslation("studio");
  const [hidden, setHidden] = useState<Record<string, Set<string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const entries = await Promise.all(
        DIFFICULTIES.map(async (d) => [d, new Set(await fetchHiddenStories(token, d))] as const),
      );
      setHidden(Object.fromEntries(entries));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shell.visibility.loadError"));
    } finally {
      setLoaded(true);
    }
  }, [token, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Every story in the database, per level.
  const rows = useMemo(
    () =>
      DIFFICULTIES.map((difficulty) => ({
        difficulty,
        items: stories
          .filter((s) => s.difficulty === difficulty)
          .map((s) => ({ slug: s.storyId, title: s.storyName, icon: s.characterIcon })),
      })),
    [stories],
  );

  const toggle = async (difficulty: DifficultySlug, slug: string, nextHidden: boolean) => {
    const key = `${difficulty}:${slug}`;
    setBusy(key);
    setError("");
    // Optimistic, then reconciled by load(): the toggle is the whole point of
    // the control, so it should not sit still for a round trip.
    setHidden((prev) => {
      const next = new Set(prev[difficulty] ?? []);
      if (nextHidden) next.add(slug);
      else next.delete(slug);
      return { ...prev, [difficulty]: next };
    });
    try {
      await setStoryHidden(token, difficulty, slug, nextHidden);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shell.visibility.updateError"));
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-6 bg-gray-50 rounded-[3px] border border-gray-200 p-3">
      <h3 className="text-sm font-semibold text-black mb-1">{t("shell.visibility.title")}</h3>
      <p className="text-xs text-gray-500 mb-3">
        <Trans t={t} i18nKey="shell.visibility.intro" components={{ b: <strong /> }} />
      </p>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      {!loaded && <p className="text-xs text-gray-400">{t("common.loading")}</p>}

      {loaded &&
        rows.map(({ difficulty, items }) => (
          <div key={difficulty} className="mb-3 last:mb-0">
            <div className="text-xs font-semibold text-gray-500 capitalize mb-1">{t(`common.difficulty.${difficulty}`)}</div>
            <div className="space-y-1">
              {items.map((item) => {
                const isHidden = hidden[difficulty]?.has(item.slug) ?? false;
                const key = `${difficulty}:${item.slug}`;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 text-sm rounded-[3px] px-2 py-1.5 ${
                      isHidden ? "bg-gray-100 text-gray-400" : "bg-white text-black"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className={isHidden ? "line-through" : ""}>{item.title}</span>
                    <span className="text-xs text-gray-400">{item.slug}</span>
                    <button
                      type="button"
                      onClick={() => toggle(difficulty, item.slug, !isHidden)}
                      disabled={busy === key}
                      title={isHidden ? t("shell.visibility.putBack") : t("shell.visibility.takeOff")}
                      className={`ml-auto text-xs rounded-[3px] px-3 py-1 disabled:opacity-50 ${
                        isHidden
                          ? "bg-black text-white hover:bg-gray-800"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {busy === key ? "…" : isHidden ? t("shell.visibility.list") : t("shell.visibility.unlist")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
};

export default StoryVisibilityPanel;
