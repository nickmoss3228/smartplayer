import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AdminStoryListItem,
  fetchHiddenStories,
  setStoryHidden,
} from "../../../services/adminStoryServices";
import { getStoryGroups, DifficultySlug } from "../../../types/storyGroups";

/**
 * Controls which stories students actually see.
 *
 * This exists because deleting a story in the builder does NOT remove it from
 * the app. The built-in stories are declared in src/types/storyGroups.ts and
 * render whether or not the database knows them; a DB story only ever *covers*
 * one of the same slug while it is published. So deleting a draft dropped the
 * override and let the static entry underneath reappear, which reads exactly
 * like the delete silently failing.
 *
 * Hiding is stored per (difficulty, storyId) and applies to built-in and
 * DB-backed stories alike, so this panel is the single answer to "what is on
 * the shelves".
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
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : "Could not load visibility.");
    } finally {
      setLoaded(true);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Everything addressable: the built-in catalogue, plus any DB story that has
  // no static counterpart. Keyed by slug so an imported built-in appears once.
  const rows = useMemo(
    () =>
      DIFFICULTIES.map((difficulty) => {
        const staticGroups = getStoryGroups(difficulty, t).map((g) => ({
          slug: g.slug,
          title: g.title,
          icon: g.coverEmoji,
          builtIn: true,
        }));
        const seen = new Set(staticGroups.map((g) => g.slug));
        const dbOnly = stories
          .filter((s) => s.difficulty === difficulty && !seen.has(s.storyId))
          .map((s) => ({
            slug: s.storyId,
            title: s.storyName,
            icon: s.characterIcon,
            builtIn: false,
          }));
        return { difficulty, items: [...staticGroups, ...dbOnly] };
      }),
    [stories, t],
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
      setError(err instanceof Error ? err.message : "Could not update visibility.");
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-6 bg-gray-50 rounded-lg border border-gray-200 p-3">
      <h3 className="text-sm font-semibold text-black mb-1">Shown in the app</h3>
      <p className="text-xs text-gray-500 mb-3">
        Unlisting takes a story off the students' list immediately. It does{" "}
        <strong>not</strong> revoke anything — anyone who bought it keeps access and playback
        keeps working — but it disappears from their list too, so it is a way to retire a
        story rather than a way to take one down for repairs. Deleting a story here does not
        remove it either: the built-in stories ship with the app and come back when their
        draft is gone, so this is the switch that controls the shelves.
      </p>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      {!loaded && <p className="text-xs text-gray-400">Loading…</p>}

      {loaded &&
        rows.map(({ difficulty, items }) => (
          <div key={difficulty} className="mb-3 last:mb-0">
            <div className="text-xs font-semibold text-gray-500 capitalize mb-1">{difficulty}</div>
            <div className="space-y-1">
              {items.map((item) => {
                const isHidden = hidden[difficulty]?.has(item.slug) ?? false;
                const key = `${difficulty}:${item.slug}`;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 text-sm rounded px-2 py-1.5 ${
                      isHidden ? "bg-gray-100 text-gray-400" : "bg-white text-black"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className={isHidden ? "line-through" : ""}>{item.title}</span>
                    <span className="text-xs text-gray-400">{item.slug}</span>
                    {item.builtIn && (
                      <span className="text-[10px] uppercase tracking-wide text-gray-400 border border-gray-300 rounded px-1">
                        built-in
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggle(difficulty, item.slug, !isHidden)}
                      disabled={busy === key}
                      title={
                        isHidden
                          ? "Put this back on the shelf"
                          : "Take this off the shelf. Anyone who already owns it keeps access, but it disappears from their list too."
                      }
                      className={`ml-auto text-xs rounded-lg px-3 py-1 disabled:opacity-50 ${
                        isHidden
                          ? "bg-black text-white hover:bg-gray-800"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {busy === key ? "…" : isHidden ? "List" : "Unlist"}
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
