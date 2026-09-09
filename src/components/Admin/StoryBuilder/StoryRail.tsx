// components/Admin/StoryBuilder/StoryRail.tsx
//
// The list of stories, grouped the way the shelves are: difficulty first, then
// category within it.
//
// A flat list plus four filter pills was fine at six stories and stops being
// fine well before thirty — and it also did not match how the content is
// actually organised. Students see Easy / Medium / Hard, and inside each of
// those a "Stories" shelf and a "News & Interesting Things" shelf. The person
// producing the content should be looking at the same structure they are
// producing, not a filtered flat list they have to re-sort in their head.
//
// Categories are driven by CATEGORY_ORDER plus whatever else turns up in the
// data, so adding a third shelf later is one entry here and nothing else.

import { useMemo, useState } from "react";
import { AdminStoryListItem } from "../../../services/adminStoryServices";
import type { DifficultySlug, StoryCategory } from "../../../types/storyGroups";

const DIFFICULTIES: DifficultySlug[] = ["easy", "medium", "hard"];

/** Same order the students' list uses (see pages/List.tsx), so the admin reads
 *  top-to-bottom the way the shelf does. */
const CATEGORY_ORDER: StoryCategory[] = ["general", "news"];

const CATEGORY_LABEL: Record<string, string> = {
  general: "Stories",
  news: "News & Interesting Things",
};

const categoryLabel = (c: string) => CATEGORY_LABEL[c] ?? c;

interface StoryRailProps {
  stories: AdminStoryListItem[];
  activeId: string | null;
  onOpen: (id: string) => void;
  /** Rendered under the list — the import affordance, kept out of the way. */
  footer?: React.ReactNode;
}

const StoryRail = ({ stories, activeId, onOpen, footer }: StoryRailProps) => {
  const [query, setQuery] = useState("");

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stories;
    return stories.filter(
      (s) =>
        s.storyName.toLowerCase().includes(q) ||
        s.storyId.toLowerCase().includes(q),
    );
  }, [stories, query]);

  // difficulty -> category -> stories, with any category the data holds that
  // CATEGORY_ORDER has not heard of appended rather than dropped.
  const grouped = useMemo(() => {
    return DIFFICULTIES.map((difficulty) => {
      const mine = matching.filter((s) => s.difficulty === difficulty);
      const found = Array.from(new Set(mine.map((s) => s.category ?? "general")));
      const order = [
        ...CATEGORY_ORDER.filter((c) => found.includes(c)),
        ...found.filter((c) => !CATEGORY_ORDER.includes(c as StoryCategory)),
      ];
      return {
        difficulty,
        total: mine.length,
        categories: order.map((category) => ({
          category,
          stories: mine.filter((s) => (s.category ?? "general") === category),
        })),
      };
    });
  }, [matching]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 border-b border-gray-200 shrink-0">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stories"
          className="w-full text-sm text-black px-3 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {matching.length === 0 && (
          <p className="text-sm text-gray-400 px-2 py-3">
            {stories.length === 0 ? "No stories yet." : "Nothing matches that."}
          </p>
        )}

        {grouped.map(({ difficulty, total, categories }) =>
          total === 0 ? null : (
            <section key={difficulty} className="mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 px-2 mb-1 flex items-baseline gap-1.5">
                {difficulty}
                <span className="font-normal text-gray-300 tabular-nums">{total}</span>
              </h3>

              {categories.map(({ category, stories: inCategory }) => (
                <div key={category} className="mb-2">
                  <h4 className="text-[10px] uppercase tracking-wide text-gray-300 px-2 mb-0.5">
                    {categoryLabel(category)}
                  </h4>
                  <ul className="space-y-0.5">
                    {inCategory.map((story) => (
                      <li key={story._id}>
                        <button
                          type="button"
                          onClick={() => onOpen(story._id)}
                          aria-current={story._id === activeId ? "true" : undefined}
                          className={`w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 transition-colors ${
                            story._id === activeId
                              ? "bg-black text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <span
                            title={story.published ? "Published" : "Draft"}
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              story.published ? "bg-emerald-500" : "bg-gray-400"
                            }`}
                          />
                          <span className="text-base leading-none shrink-0">
                            {story.characterIcon}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium truncate">
                              {story.storyName}
                            </span>
                            <span
                              className={`block text-[11px] tabular-nums truncate ${
                                story._id === activeId ? "text-white/60" : "text-gray-400"
                              }`}
                            >
                              {story.totalParts} parts
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ),
        )}
      </div>

      {footer && <div className="shrink-0 border-t border-gray-200 p-2">{footer}</div>}
    </div>
  );
};

export default StoryRail;
