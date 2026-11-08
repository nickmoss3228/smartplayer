import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IoChevronForward, IoAddOutline, IoArrowBack } from "react-icons/io5";
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

const StoryBuilderTab = ({ token }: { token: string }) => {
  const { t } = useTranslation("studio");
  const [stories, setStories] = useState<AdminStoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const openRequest = useRef(0);
  const [activeStory, setActiveStory] = useState<AdminStory | null>(null);
  // Where you are lives in the URL (?set=<id>, ?new, &preview=<part>), so the
  // browser's Back button walks back through it — out of the student preview
  // to the set, then out of the set to the library — instead of leaving the
  // admin panel, and a reload keeps the set open.
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const setId = params.get("set");
  const creating = params.has("new");
  const previewParam = Number(params.get("preview"));
  const previewPart = setId && Number.isInteger(previewParam) && previewParam > 0 ? previewParam : null;
  const view: "library" | "create" | "editor" = creating ? "create" : setId && activeStory ? "editor" : "library";
  // True while the preview's history entry is ours to pop with Back.
  const previewPushed = useRef(false);
  const activeId = useRef<string | null>(null);
  activeId.current = activeStory?._id ?? null;
  // Whole-catalogue visibility, behind a toggle — see the note where it renders.
  const [showShelves, setShowShelves] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStories(await listStories(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shell.tab.loadError"));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

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

  // The URL names a set we have not loaded (a click, Back/Forward, a reload).
  useEffect(() => {
    if (!setId || activeId.current === setId) return;
    const request = ++openRequest.current;
    (async () => {
      try {
        const story = await getStory(token, setId);
        if (request !== openRequest.current) return;
        setActiveStory(story);
        setRailOpen(false);
      } catch (err) {
        if (request === openRequest.current) setError(err instanceof Error ? err.message : t("shell.tab.loadOneError"));
      }
    })();
  }, [setId, token, t]);

  useEffect(() => {
    if (previewPart === null) previewPushed.current = false;
  }, [previewPart]);

  const openStory = (id: string) => {
    setError("");
    setRailOpen(false);
    setParams({ set: id });
  };

  const handleCreated = (story: AdminStory) => {
    setActiveStory(story);
    // Replaces the "new" entry: Back from the new set goes to the library.
    setParams({ set: story._id }, { replace: true });
    load();
  };

  const handleBack = () => {
    openRequest.current += 1;
    setActiveStory(null);
    setParams({});
    load();
  };

  const handleDeleted = () => {
    openRequest.current += 1;
    setActiveStory(null);
    setParams({}, { replace: true });
    load();
  };

  const openPreview = (part: number) => {
    if (!activeStory) return;
    previewPushed.current = true;
    setParams({ set: activeStory._id, preview: String(part) });
  };

  const closePreview = () => {
    if (previewPushed.current) {
      previewPushed.current = false;
      navigate(-1);
    } else if (setId) {
      setParams({ set: setId }, { replace: true });
    }
  };

  // A story edited in the pane must not go stale in the rail beside it — the
  // name, the part count and the published pip all live in the list row.
  const handleStoryUpdated = (updated: AdminStory) => {
    setActiveStory(current => current?._id === updated._id ? updated : current);
    const { parts: _parts, ...row } = updated;
    void _parts;
    setStories((prev) => prev.map((s) => (s._id === updated._id ? row : s)));
  };

  if (setId && !activeStory) {
    return error
      ? <div className="space-y-3"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={handleBack} className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-ink hover:underline"><IoArrowBack aria-hidden="true" />{t("shell.tab.backToLibrary")}</button></div>
      : <p className="text-dim">{t("shell.tab.opening")}</p>;
  }

  return (
    <div>
      {/* Outside the editor: the library's own bar. Inside it, StoryEditor
          draws one breadcrumb header instead, so the waveform starts higher. */}
      {view !== "editor" && <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold tracking-tight text-ink">{t("shell.tab.stories.title")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowShelves((v) => !v)}
            className="text-sm rounded-[3px] px-3 py-2 text-gray-600 hover:bg-gray-200"
          >
            {showShelves ? t("shell.tab.hideShelves") : t("shell.tab.shelves")}
          </button>
          {view !== "create" && (
            <button
              onClick={() => setParams({ new: "1" })}
              className={buttonPrimary}
            >
              <IoAddOutline size={18} aria-hidden="true" /> {t("shell.tab.newStory")}
            </button>
          )}
        </div>
      </div>}

      {/* Back to the set you left, from the library or the new-set form. The
          "New" button above already covers creating, so it is not repeated. */}
      {view !== "editor" && activeStory && <button type="button" onClick={() => setParams({ set: activeStory._id })} className="mb-4 inline-flex min-h-9 max-w-full items-center gap-2 truncate text-sm font-semibold text-ink hover:underline">
        {t("shell.tab.continueEditing", { name: activeStory.storyName })}<IoChevronForward aria-hidden="true" />
      </button>}

      {view === "create" && (
        <div className="mb-4">
          <NewStoryForm token={token} onCreated={handleCreated} onCancel={() => setParams(activeStory ? { set: activeStory._id } : {}, { replace: true })} />
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
      {loading && <p className="text-gray-500">{t("common.loading")}</p>}

      {view === "library" && !loading && <ContentLibrary stories={stories} onOpen={openStory} onCreate={() => setParams({ new: "1" })} />}

      {view === "editor" && activeStory && (
        <div className="min-w-0">
          <StoryEditor
            key={activeStory._id}
            token={token}
            story={activeStory}
            onStoryUpdated={handleStoryUpdated}
            onDeleted={handleDeleted}
            onBack={handleBack}
            switcherOpen={railOpen}
            onToggleSwitcher={() => setRailOpen(open => !open)}
            switcher={<StoryRail stories={stories} activeId={activeStory._id} onOpen={openStory} />}
            onPreview={openPreview}
            previewOpen={previewPart !== null}
          />
        </div>
      )}
      {view === "editor" && activeStory && previewPart !== null && (
        <StudentPlayerPreview key={`${activeStory._id}:${previewPart}`} story={activeStory} initialPart={previewPart} onClose={closePreview} />
      )}
    </div>
  );
};

export default StoryBuilderTab;
