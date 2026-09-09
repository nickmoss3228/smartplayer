import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import {
  AdminStory,
  AdminStoryListItem,
  getStory,
  listStories,
  importStory,
} from "../../../services/adminStoryServices";
import { getStoryGroups, DifficultySlug, StoryGroup } from "../../../types/storyGroups";
import { assembleImportPayload } from "./assembleImportPayload";
import NewStoryForm from "./NewStoryForm";
import StoryEditor from "./StoryEditor";
import StoryRail from "./StoryRail";
import StoryVisibilityPanel from "./StoryVisibilityPanel";

const DIFFICULTIES: DifficultySlug[] = ["easy", "medium", "hard"];

const RAIL_KEY = "story_builder_rail_open";

const StoryBuilderTab = ({ token }: { token: string }) => {
  const { t } = useTranslation();
  const [stories, setStories] = useState<AdminStoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeStory, setActiveStory] = useState<AdminStory | null>(null);
  const [importingSlug, setImportingSlug] = useState<string | null>(null);
  const [importError, setImportError] = useState("");
  const [importNotice, setImportNotice] = useState("");
  // Whole-catalogue visibility, behind a toggle — see the note where it renders.
  const [showShelves, setShowShelves] = useState(false);
  // Collapsing the rail gives the whole width to the part you are building,
  // which matters most on the waveform. Remembered, because it is a working
  // preference rather than a per-story one.
  const [railOpen, setRailOpen] = useState(() => localStorage.getItem(RAIL_KEY) !== "0");

  useEffect(() => {
    localStorage.setItem(RAIL_KEY, railOpen ? "1" : "0");
  }, [railOpen]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStories(await listStories(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load stories.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Built-in (static-file) stories not yet imported into the builder — the
  // only ones worth offering an "Import" button for.
  const importable = useMemo(() => {
    const existingIds = new Set(stories.map((s) => `${s.difficulty}:${s.storyId}`));
    return DIFFICULTIES.flatMap((difficulty) =>
      getStoryGroups(difficulty, t)
        .filter((group) => !existingIds.has(`${difficulty}:${group.slug}`))
        .map((group) => ({ difficulty, group }))
    );
  }, [stories, t]);

  const openStory = async (id: string) => {
    try {
      setActiveStory(await getStory(token, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load story.");
    }
  };

  const handleCreated = (story: AdminStory) => {
    setShowNewForm(false);
    setActiveStory(story);
    load();
  };

  const handleBack = () => {
    setActiveStory(null);
    load();
  };

  // A story edited in the pane must not go stale in the rail beside it — the
  // name, the part count and the published pip all live in the list row.
  const handleStoryUpdated = (updated: AdminStory) => {
    setActiveStory(updated);
    const { parts: _parts, ...row } = updated;
    void _parts;
    setStories((prev) => prev.map((s) => (s._id === updated._id ? row : s)));
  };

  const handleImport = async (difficulty: DifficultySlug, group: StoryGroup) => {
    setImportingSlug(group.slug);
    setImportError("");
    setImportNotice("");
    try {
      const payload = await assembleImportPayload(token, difficulty, group);
      const { story, markersRestoredForParts } = await importStory(token, payload);
      if (markersRestoredForParts > 0) {
        setImportNotice(
          `Time markers restored on ${markersRestoredForParts} part${
            markersRestoredForParts === 1 ? "" : "s"
          } from the last time this story had them.`,
        );
      }
      setActiveStory(story); // open the new draft for review before publishing
      load();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImportingSlug(null);
    }
  };

  // The import affordance, folded into the foot of the rail. It used to sit
  // above the story list, always expanded, pushing the thing you came for below
  // the fold — it is setup, not daily work.
  const importPanel = importable.length > 0 && (
    <details className="group">
      <summary className="cursor-pointer list-none text-xs text-gray-500 hover:text-black px-2 py-1 select-none">
        <span className="group-open:hidden">Import {importable.length} built-in stories</span>
        <span className="hidden group-open:inline">Import built-in stories</span>
      </summary>
      <div className="px-2 pt-2 pb-1">
        <p className="text-[11px] text-gray-400 mb-2 leading-snug">
          Brings a story's audio, markers, vocabulary and quiz in as a <strong>draft</strong>.
          Nothing changes for students until you publish it.
        </p>
        {importError && <p className="text-red-600 text-xs mb-2">{importError}</p>}
        {importNotice && <p className="text-green-700 text-xs mb-2">{importNotice}</p>}
        <div className="flex flex-col gap-1">
          {importable.map(({ difficulty, group }) => (
            <button
              key={`${difficulty}:${group.slug}`}
              onClick={() => handleImport(difficulty, group)}
              disabled={importingSlug === group.slug}
              className="flex items-center gap-1.5 text-xs text-left text-gray-700 rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50"
            >
              <span>{group.coverEmoji}</span>
              <span className="flex-1 truncate">{group.title}</span>
              <span className="text-[10px] text-gray-400">{difficulty}</span>
              {importingSlug === group.slug && <span className="text-[10px]">…</span>}
            </button>
          ))}
        </div>
      </div>
    </details>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-black">Story Builder</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShelves((v) => !v)}
            className="text-sm rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-200"
          >
            {showShelves ? "Hide shelves" : "Shelves"}
          </button>
          {!showNewForm && (
            <button
              onClick={() => setShowNewForm(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg px-4 py-2"
            >
              New story
            </button>
          )}
        </div>
      </div>

      {showNewForm && (
        <div className="mb-4">
          <NewStoryForm token={token} onCreated={handleCreated} onCancel={() => setShowNewForm(false)} />
        </div>
      )}

      {/* Shelves — which stories students can actually see, built-ins included.
          Behind a toggle because it is a rare, whole-catalogue decision, and it
          used to render every built-in across three difficulties above the list
          you came for. */}
      {showShelves && (
        <div className="mb-4">
          <StoryVisibilityPanel token={token} stories={stories} />
        </div>
      )}

      {error && <p className="text-red-600 mb-3">{error}</p>}
      {loading && <p className="text-gray-500">Loading…</p>}

      {!loading && (
        <div className="flex gap-4 items-start">
          {/* The rail stays put. Opening a story used to replace this whole
              view, so there was no way to check a second story without throwing
              away where you were. */}
          <aside
            className={`shrink-0 bg-white rounded-lg border border-gray-200 sticky top-4 max-h-[calc(100vh-8rem)] flex flex-col transition-[width] ${
              railOpen ? "w-64" : "w-10"
            }`}
          >
            <button
              type="button"
              onClick={() => setRailOpen((open) => !open)}
              title={railOpen ? "Collapse the story list" : "Show the story list"}
              aria-expanded={railOpen}
              className={`flex items-center gap-1 text-gray-400 hover:text-black hover:bg-gray-50 shrink-0 ${
                railOpen
                  ? "self-end px-2 py-1.5 rounded-tr-lg"
                  : "flex-col py-2 rounded-t-lg"
              }`}
            >
              {railOpen ? (
                <IoChevronBack aria-hidden="true" />
              ) : (
                <IoChevronForward aria-hidden="true" />
              )}
              <span className={railOpen ? "sr-only" : "text-[10px] tabular-nums"}>
                {railOpen ? "Collapse the story list" : stories.length}
              </span>
            </button>

            {railOpen ? (
              <StoryRail
                stories={stories}
                activeId={activeStory?._id ?? null}
                onOpen={openStory}
                footer={importPanel}
              />
            ) : (
              <span
                className="text-[10px] uppercase tracking-widest text-gray-400 select-none mx-auto mt-2"
                style={{ writingMode: "vertical-rl" }}
              >
                Stories
              </span>
            )}
          </aside>

          <div className="flex-1 min-w-0">
            {activeStory ? (
              <StoryEditor
                token={token}
                story={activeStory}
                onStoryUpdated={handleStoryUpdated}
                onDeleted={handleBack}
                onBack={handleBack}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
                <p className="text-gray-500">
                  {stories.length === 0
                    ? "No stories yet — create one, or import a built-in from the list."
                    : "Pick a story on the left."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryBuilderTab;
