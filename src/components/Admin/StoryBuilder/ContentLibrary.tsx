import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoBookOutline, IoChevronForward } from "react-icons/io5";
import type { AdminStoryListItem } from "../../../services/adminStoryServices";
import { buttonSecondary } from "../../ui/buttonStyles";

interface ContentLibraryProps {
  stories: AdminStoryListItem[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}

export default function ContentLibrary({ stories, onOpen, onCreate }: ContentLibraryProps) {
  const { t } = useTranslation("studio");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories.filter((story) =>
      !q || [story.storyName, story.storyId, story.localized?.title.en, story.localized?.title.ru]
        .some((value) => value?.toLowerCase().includes(q)));
  }, [stories, query]);

  return (
    <section aria-label={t("shell.library.aria")} className="space-y-5">
      <label className="block max-w-md text-sm text-dim">
        <span className="sr-only">{t("shell.library.searchLabel")}</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder={t("shell.library.searchStory")}
          className="min-h-11 w-full rounded-[3px] border border-line bg-white px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal" />
      </label>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-6 sm:p-10">
          <p className="mb-4 text-dim">{query.trim() ? t("shell.library.noMatch") : t("shell.library.emptyStory")}</p>
          {!query.trim() && <button type="button" className={buttonSecondary} onClick={onCreate}>{t("shell.library.create")}</button>}
        </div>
      ) : (["easy", "medium", "hard"] as const).map((difficulty) => {
        const rows = filtered.filter((story) => story.difficulty === difficulty);
        if (!rows.length) return null;
        return (
          <section key={difficulty} aria-label={t("shell.library.sectionAria.story", { level: t(`common.difficulty.${difficulty}`) })}>
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-dim">{t(`common.difficulty.${difficulty}`)}</h3>
            <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
              {rows.map((story) => (
                <button key={story._id} type="button" onClick={() => onOpen(story._id)}
                  className="flex min-h-20 w-full items-center gap-3 px-4 py-4 text-left hover:bg-room focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal sm:gap-5 sm:px-5">
                  <span className="grid h-14 w-11 shrink-0 place-items-center overflow-hidden rounded-tile border border-line bg-room" aria-hidden="true">
                    {story.coverUrl ? <img src={story.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                      : <IoBookOutline size={20} className="text-dim" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-ink">{story.storyName}</span>
                    {story.localized?.title?.en && story.localized.title.en !== story.storyName && <span className="block truncate text-sm text-dim">{story.localized.title.en}</span>}
                    <span className="block text-xs text-dim">{t("common.parts", { count: story.totalParts })}{story.category === "news" ? ` · ${t("shell.library.news")}` : ""}</span>
                  </span>
                  <span className={`rounded-chip px-2 py-1 text-xs ${story.published ? "bg-green-100 text-green-800" : "bg-room text-dim"}`}>{story.published ? t("common.published") : t("common.draft")}</span>
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
