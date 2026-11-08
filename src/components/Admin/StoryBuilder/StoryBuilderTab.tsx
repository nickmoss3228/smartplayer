import { useCallback, useEffect, useRef, useState } from "react";
import { IoChevronForward, IoAddOutline } from "react-icons/io5";
import {
  AdminStory,
  AdminStoryListItem,
  getStory,
  listStories,
} from "../../../services/adminStoryServices";
import NewStoryForm from "./NewStoryForm";
import StoryEditor from "./StoryEditor";
import StoryRail from "./StoryRail";
import StoryVisibilityPanel from "./StoryVisibilityPanel";
import ContentLibrary from "./ContentLibrary";
import StudentPlayerPreview from "./StudentPlayerPreview";
import { buttonPrimary } from "../../ui/buttonStyles";

/**
 * The Story Builder: a library of story sets, the new-set form, and the
 * editor (editing desk, production board, set settings, review & publish).
 */
const StoryBuilderTab = ({ token }: { token: string }) => {
  const [stories, setStories] = useState<AdminStoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"library" | "create" | "editor">("library");
  const [previewPart, setPreviewPart] = useState<number | null>(null);
  const openRequest = useRef(0);
  const [activeStory, setActiveStory] = useState<AdminStory | null>(null);
  // Whole-catalogue visibility, behind a toggle — see the note where it renders.
  const [showShelves, setShowShelves] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

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

  // The set switcher is a dropdown: Escape or a click anywhere else closes it.
  useEffect(() => {
    if (!railOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setRailOpen(false); };
    const onDown = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest("#studio-set-switcher, [aria-controls='studio-set-switcher']")) setRailOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [railOpen]);

  const openStory = async (id: string) => {
    const request = ++openRequest.current;
    try {
      const story = await getStory(token, id);
      if (request !== openRequest.current) return;
      setActiveStory(story);
      setView("editor");
      setRailOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load story.");
    }
  };

  const handleCreated = (story: AdminStory) => {
    setActiveStory(story);
    setView("editor");
    load();
  };

  const handleBack = () => {
    openRequest.current += 1;
    setActiveStory(null);
    setView("library");
    load();
  };

  // A story edited in the pane must not go stale in the rail beside it — the
  // name, the part count and the published pip all live in the list row.
  const handleStoryUpdated = (updated: AdminStory) => {
    setActiveStory(current => current?._id === updated._id ? updated : current);
    const { parts: _parts, ...row } = updated;
    void _parts;
    setStories((prev) => prev.map((s) => (s._id === updated._id ? row : s)));
  };

  return (
    <div>
      {/* Outside the editor: the library's own bar. Inside it, StoryEditor
          draws one breadcrumb header instead, so the waveform starts higher. */}
      {view !== "editor" && <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold tracking-tight text-ink">Story sets</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowShelves((v) => !v)}
            className="text-sm rounded-[3px] px-3 py-2 text-gray-600 hover:bg-gray-200"
          >
            {showShelves ? "Hide shelves" : "Shelves"}
          </button>
          {view !== "create" && (
            <button
              onClick={() => setView("create")}
              className={buttonPrimary}
            >
              <IoAddOutline size={18} aria-hidden="true" /> New story set
            </button>
          )}
        </div>
      </div>}

      {/* Back to the set you left, from the new-set form. */}
      {view !== "editor" && activeStory && <button type="button" onClick={() => setView("editor")} className="mb-4 inline-flex min-h-9 max-w-full items-center gap-2 truncate text-sm font-semibold text-ink hover:underline">
        Continue editing «{activeStory.storyName}»<IoChevronForward aria-hidden="true" />
      </button>}

      {view === "create" && (
        <div className="mb-4">
          <NewStoryForm token={token} onCreated={handleCreated} onCancel={() => setView(activeStory ? "editor" : "library")} />
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

      {view === "library" && !loading && <ContentLibrary stories={stories} onOpen={openStory} onCreate={() => setView("create")} />}

      {view === "editor" && activeStory && (
        <div className="min-w-0">
          <StoryEditor
            key={activeStory._id}
            token={token}
            story={activeStory}
            onStoryUpdated={handleStoryUpdated}
            onDeleted={handleBack}
            onBack={handleBack}
            switcherOpen={railOpen}
            onToggleSwitcher={() => setRailOpen(open => !open)}
            switcher={<StoryRail stories={stories} activeId={activeStory._id} onOpen={openStory} />}
            onPreview={setPreviewPart}
            previewOpen={previewPart !== null}
          />
        </div>
      )}
      {activeStory && previewPart !== null && (
        <StudentPlayerPreview story={activeStory} initialPart={previewPart} onClose={() => setPreviewPart(null)} />
      )}
    </div>
  );
};

export default StoryBuilderTab;
