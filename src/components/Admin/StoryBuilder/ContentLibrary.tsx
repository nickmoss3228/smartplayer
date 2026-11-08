import { useMemo, useState } from "react";
import { IoBookOutline, IoChevronForward } from "react-icons/io5";
import type { AdminStoryListItem } from "../../../services/adminStoryServices";
import { buttonSecondary } from "../../ui/buttonStyles";

interface ContentLibraryProps {
  stories: AdminStoryListItem[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}

/** Every story set, searchable, grouped by level. */
export default function ContentLibrary({ stories, onOpen, onCreate }: ContentLibraryProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories.filter((story) =>
      !q || [story.storyName, story.storyId, story.localized?.title.en, story.localized?.title.ru]
        .some((value) => value?.toLowerCase().includes(q)));
  }, [stories, query]);

  return (
    <section aria-label="Story library" className="space-y-5">
      <label className="block max-w-md text-sm text-dim">
        <span className="sr-only">Search stories</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Search stories"
          className="min-h-11 w-full rounded-[3px] border border-line bg-white px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal" />
      </label>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-6 sm:p-10">
          <p className="mb-4 text-dim">{query.trim() ? "Nothing matches this search." : "No story sets yet."}</p>
          {!query.trim() && <button type="button" className={buttonSecondary} onClick={onCreate}>Create a set</button>}
        </div>
      ) : (["easy", "medium", "hard"] as const).map((difficulty) => {
        const rows = filtered.filter((story) => story.difficulty === difficulty);
        if (!rows.length) return null;
        return (
          <section key={difficulty} aria-label={`${difficulty} stories`}>
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-dim">{difficulty}</h3>
            <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
              {rows.map((story) => (
                <button key={story._id} type="button" onClick={() => onOpen(story._id)}
                  className="flex min-h-20 w-full items-center gap-3 px-4 py-4 text-left hover:bg-room focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal sm:gap-5 sm:px-5">
                  <IoBookOutline size={24} className="shrink-0 text-dim" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-ink">{story.storyName}</span>
                    <span className="block text-xs text-dim">{story.totalParts} parts{story.category === "news" ? " · News & Interesting Things" : ""}</span>
                  </span>
                  <span className={`rounded-chip px-2 py-1 text-xs ${story.published ? "bg-green-100 text-green-800" : "bg-room text-dim"}`}>{story.published ? "Published" : "Draft"}</span>
                  <IoChevronForward size={18} className="shrink-0 text-dim" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}
