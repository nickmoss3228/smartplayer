import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoPlayOutline, IoAddOutline, IoExpandOutline, IoContractOutline, IoArrowBack, IoBookOutline, IoChevronDown, IoChevronForward } from "react-icons/io5";
import type { ReactNode } from "react";
import {
  AdminStory,
  StoryPart,
  setStoryPublished,
  addPart,
} from "../../../services/adminStoryServices";
import PartMatrix from "./PartMatrix";
import { ELEMENTS, ElementId, storyReadiness, partVerdict } from "./partStatus";
import { MAX_PARTS } from "../../../types/content";
import PartAudioMarkerEditor from "./PartAudioMarkerEditor";
import PartComicEditor from "./PartComicEditor";
import StorySettings from "./StorySettings";
import PartVocabWordsEditor from "./PartVocabWordsEditor";
import PartQuizEditor from "./PartQuizEditor";
import PartIntroEditor from "./PartIntroEditor";
import PartTranscriptEditor from "./PartTranscriptEditor";
import PartTranslationEditor from "./PartTranslationEditor";
import PartPanelQuizEditor from "./PartPanelQuizEditor";

interface StoryEditorProps {
  token: string;
  story: AdminStory;
  onStoryUpdated: (story: AdminStory) => void;
  onDeleted: () => void;
  onBack: () => void;
  /** The list of other sets, opened from beside the title. */
  switcher: ReactNode;
  switcherOpen: boolean;
  onToggleSwitcher: () => void;
  onPreview: (partNumber: number) => void;
  previewOpen?: boolean;
}

/** The set's views and a part's tools, as underline tabs on one line. */
const viewTab = (active: boolean) =>
  `-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold transition-colors ${
    active ? "border-ink text-ink" : "border-transparent text-dim hover:text-ink"
  }`;

// Part 1 of a paid story is what a non-owner always hears before deciding to
// buy — always in full; the first three parts are free on any story
// (freeAllowanceFor in backend/src/config/priceCatalog.js). The builder marks
// it so the shop window gets made deliberately rather than by accident.
const PREVIEW_PART = 1;

/** Audio and markers are edited in one place, so two grid columns open the same
 *  panel. Everything else is one column, one editor. */
const PANEL_FOR: Record<
  ElementId,
  "audio" | "comics" | "intro" | "transcript" | "vocabulary" | "phrasal" | "quiz" | "panels"
> = {
  audio: "audio",
  markers: "audio",
  comic: "comics",
  intro: "intro",
  transcript: "transcript",
  vocab: "vocabulary",
  phrasal: "phrasal",
  quiz: "quiz",
  panels: "panels",
};

// Per-part tabs within one "editing story X" view — the admin can jump
// between parts/steps freely rather than following a forced linear wizard.
const StoryEditor = ({ token, story, onStoryUpdated, onDeleted, onBack, switcher, switcherOpen, onToggleSwitcher, onPreview, previewOpen = false }: StoryEditorProps) => {
  const { t } = useTranslation("studio");
  const kind = "part";
  const itemName = (n: number) => t("common.partN", { n });
  const elementName = (id: ElementId) => t(`common.elements.${id}`);
  const visibleElements = ELEMENTS;
  const [partNumber, setPartNumber] = useState(story.parts[0]?.partNumber ?? 1);
  const [workspace, setWorkspace] = useState<"desk" | "overview" | "settings" | "review">("desk");
  const [focused, setFocused] = useState(false);
  const deskRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (workspace !== "desk" || previewOpen) {
      deskRef.current?.querySelectorAll<HTMLMediaElement>("audio, video").forEach(media => media.pause());
    }
  }, [workspace, previewOpen]);
  const latestStory = useRef(story);
  latestStory.current = story;
  const pick = (number: number, tool: ElementId = element) => {
    setPartNumber(number);
    setElement(tool);
    setWorkspace("desk");
  };
  const control = "inline-flex min-h-10 items-center justify-center gap-2 rounded-[3px] border border-line-strong bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-room disabled:opacity-50";
  // The desk and the overview share the same active part and tool.
  const [element, setElement] = useState<ElementId>("audio");
  const step = PANEL_FOR[element];
  const [publishing, setPublishing] = useState(false);
  const [addingPart, setAddingPart] = useState(false);
  const [error, setError] = useState("");

  const part = story.parts.find((p) => p.partNumber === partNumber) as StoryPart;

  const handlePartUpdated = (updatedPart: StoryPart) => {
    const updated = {
      ...latestStory.current,
      parts: latestStory.current.parts.map((p) => (p.partNumber === updatedPart.partNumber ? updatedPart : p)),
    };
    latestStory.current = updated;
    onStoryUpdated(updated);
  };

  // One rule for "done", shared with the grid and the publish gate — see
  // partStatus.ts. A story is something people buy, so a part is finished when
  // it has every required element, not when it has audio.
  const readiness = storyReadiness(story);
  const partStatusNow = readiness.parts.find((status) => status.partNumber === partNumber);

  const handleTogglePublish = async () => {
    // Publishing an incomplete story puts a half-made product on the shelf, and
    // for a paid story that means selling someone a part with no quiz. Asking
    // once is cheap; finding out from a customer is not. Unpublishing is never
    // gated — taking something down is always allowed.
    if (!story.published && !readiness.complete) {
      const owed = readiness.gaps
        .map((g) => `${g.parts.length} × ${elementName(g.element.id).toLowerCase()}`)
        .join(", ");
      const ok = confirm(t(`shell.editor.publishConfirm.${kind}`, { ready: readiness.sellableCount, total: readiness.total, owed }));
      if (!ok) return;
    }
    setPublishing(true);
    setError("");
    try {
      const updated = await setStoryPublished(token, story._id, !story.published);
      onStoryUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shell.editor.publishError"));
    } finally {
      setPublishing(false);
    }
  };

  const handleAddPart = async () => {
    setAddingPart(true);
    setError("");
    try {
      const updated = await addPart(token, story._id);
      onStoryUpdated(updated);
      // Jump straight to the new part so it's obvious it was added.
      pick(updated.parts[updated.parts.length - 1].partNumber, "audio");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shell.editor.addPartError"));
    } finally {
      setAddingPart(false);
    }
  };

  return (
    <section className="min-w-0" aria-label={t("shell.editor.setEditorAria")}>
      {/* One header for the whole set: where you are (breadcrumb), what it is
          (title, level, readiness, published) and what you can do (preview,
          publish). It replaces three stacked bars: "Content types", "Library"
          and a second copy of the set's name. */}
      <header className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <nav aria-label={t("shell.editor.breadcrumb")} className="mb-1 flex flex-wrap items-center gap-1 text-xs text-dim">
            <button type="button" onClick={onBack} className="min-h-8 hover:text-ink hover:underline">{t("shell.tab.stories.title")}</button>
            <IoChevronForward aria-hidden="true" />
          </nav>
          <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
            <IoBookOutline className="shrink-0" size={22} aria-hidden="true" />
            <h2 className="min-w-0 break-words text-2xl font-extrabold tracking-tight text-ink">{story.storyName}</h2>
            <button type="button" onClick={onToggleSwitcher} aria-expanded={switcherOpen} aria-controls="studio-set-switcher" title={t("shell.editor.switchTitle")}
              className="inline-flex min-h-8 items-center gap-1 rounded-[3px] px-2 text-xs font-semibold text-dim hover:bg-white hover:text-ink">
              {t("shell.editor.switchSet")}<IoChevronDown aria-hidden="true" className={switcherOpen ? "rotate-180" : ""} />
            </button>
            {switcherOpen && <div id="studio-set-switcher" className="absolute left-0 top-full z-30 mt-2 max-h-96 w-[min(28rem,90vw)] overflow-y-auto rounded-card border border-line bg-white shadow-lg">
              {switcher}
            </div>}
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-room px-2 py-0.5 font-semibold uppercase tracking-wide text-dim">{t(`common.difficulty.${story.difficulty}`)}</span>
            <span className={`rounded-full px-2 py-0.5 font-semibold ${readiness.complete ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
              {t(`shell.editor.readyChip.${kind}`, { ready: readiness.sellableCount, total: readiness.total })}
            </span>
            <span className={`rounded-full px-2 py-0.5 font-semibold ${story.published ? "bg-emerald-50 text-emerald-800" : "bg-room text-dim"}`}>{story.published ? t("common.published") : t("common.draft")}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onPreview(partNumber)} disabled={!part?.audioUrl} title={part?.audioUrl ? t(`shell.editor.previewTitle.${kind}`, { n: partNumber }) : t(`shell.editor.noAudioYet.${kind}`, { n: partNumber })} className={control}><IoPlayOutline aria-hidden="true" />{t("common.studentPreview")}</button>
          {workspace !== "review" && <button type="button" onClick={() => setWorkspace("review")} className="min-h-10 rounded-[3px] bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90">{t("shell.editor.reviewPublish")}</button>}
        </div>
      </header>
      <nav aria-label={t("shell.editor.workspaceAria")} className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {([["desk", "editPart"], ["overview", "overview"], ["settings", "settings"], ["review", "review"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={workspace === value} onClick={() => setWorkspace(value)} className={viewTab(workspace === value)}>{t(`shell.editor.tabs.${label}`)}</button>)}
      </nav>
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
      <div hidden={workspace !== "settings"} data-testid="set-settings">
        <StorySettings token={token} story={story} onStoryUpdated={onStoryUpdated} onDeleted={onDeleted} />
      </div>
      <div hidden={workspace !== "overview"} className="min-w-0 rounded-card border border-line bg-white p-4 sm:p-6" data-testid="production-board">
        <h3 className="text-lg font-bold text-ink">{t("shell.editor.overviewTitle")}</h3>
        <p className="mb-5 mt-1 text-sm text-dim">{t(`shell.editor.overviewHint.${kind}`)}</p>
        <PartMatrix readiness={readiness} activePart={partNumber} activeElement={element} previewPart={PREVIEW_PART} onPick={pick} onAddPart={handleAddPart} addingPart={addingPart} atLimit={story.parts.length >= MAX_PARTS} elements={visibleElements} kind={kind} />
      </div>
      <div hidden={workspace !== "review"} className="rounded-card border border-line bg-white p-4 sm:p-6" data-testid="publish-review">
        <h3 className="text-lg font-bold text-ink">{t("shell.editor.reviewPublish")}</h3>
        <p className="mb-5 mt-1 text-sm text-dim">{t(`shell.editor.reviewHint.${kind}`, { ready: readiness.sellableCount, total: readiness.total })} {story.published ? t("shell.editor.isPublished") : t("shell.editor.isDraft")}</p>
        {readiness.gaps.length > 0 ? <div className="mb-6 space-y-4">{readiness.gaps.map(({element: missing, parts}) => <div key={missing.id}>
          <h4 className="mb-2 text-sm font-semibold text-ink">{elementName(missing.id)}</h4>
          <div className="flex flex-wrap gap-2">{parts.map(number => <button key={number} type="button" onClick={() => pick(number, missing.id)} className={control}>{itemName(number)}<IoArrowBack className="rotate-180" aria-hidden="true" /></button>)}</div>
        </div>)}</div> : <p className="mb-6 text-sm text-green-700">{t("shell.editor.allReady")}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onPreview(partNumber)} disabled={!part?.audioUrl} className={control}><IoPlayOutline aria-hidden="true" />{t("common.studentPreview")}</button>
          <button type="button" onClick={handleTogglePublish} disabled={publishing} className="min-h-10 rounded-[3px] bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{publishing ? t("shell.editor.updating") : story.published ? t("shell.editor.unpublish") : t("shell.editor.publish")}</button>
        </div>
      </div>
      <div ref={deskRef} hidden={workspace !== "desk"} data-testid="editing-desk">
        <div className={focused ? "min-w-0" : "grid min-w-0 gap-5 lg:grid-cols-[180px_minmax(0,1fr)]"}>
          <aside hidden={focused} className="min-w-0" aria-label={t(`shell.editor.asideAria.${kind}`)}>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-ink">{t(`shell.editor.asideTitle.${kind}`)}</h3><span className="text-xs tabular-nums text-dim">{readiness.total}</span></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1 lg:max-h-[65vh] lg:overflow-y-auto">
              {readiness.parts.map(status => <button key={status.partNumber} type="button" onClick={() => pick(status.partNumber)} aria-pressed={partNumber === status.partNumber} className={`flex min-h-14 items-start gap-2.5 rounded-tile border px-3 py-2.5 text-left text-ink ${partNumber === status.partNumber ? "border-ink bg-room" : "border-line bg-white hover:border-line-strong"}`}>
                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${status.sellable ? "bg-emerald-500" : status.empty ? "bg-line-strong" : "bg-amber-500"}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{itemName(status.partNumber)}</span>
                  <span className={`block text-xs ${status.sellable ? "text-emerald-800" : "text-dim"}`}>{partVerdict(status, t)}</span>
                  {status.partNumber === PREVIEW_PART && <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wide text-dim">{t("shell.editor.freePreview")}</span>}
                </span>
              </button>)}
            </div>
            <button type="button" onClick={handleAddPart} disabled={addingPart || story.parts.length >= MAX_PARTS} title={story.parts.length >= MAX_PARTS ? t(`shell.editor.limitTitle.${kind}`, { max: MAX_PARTS }) : undefined} className={control + " mt-3 w-full"}><IoAddOutline aria-hidden="true" />{addingPart ? t("shell.editor.adding") : story.parts.length >= MAX_PARTS ? t("shell.editor.mostItems", { max: MAX_PARTS }) : t(`shell.editor.addItem.${kind}`)}</button>
          </aside>
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-ink"><span className="text-dim">{itemName(partNumber)} · </span>{step === "audio" ? t("shell.editor.audioMarkers") : element === "transcript" ? t("shell.editor.privateScriptTranslation") : elementName(element)}</h3>
              <button type="button" onClick={() => setFocused(value => !value)} aria-pressed={focused} className={control}>{focused ? <IoContractOutline aria-hidden="true" /> : <IoExpandOutline aria-hidden="true" />}{focused ? t("shell.editor.exitFocus") : t("shell.editor.focusMode")}</button>
            </div>
            <nav hidden={focused} aria-label={t("shell.editor.toolsAria")} className="mb-3 flex flex-wrap gap-x-1 border-b border-line">
              {visibleElements.filter(entry => entry.id !== "markers").map(entry => {
                // A dot marks a tool this part has nothing in yet. Audio's tab
                // also owns the markers, so either one missing marks it.
                const cell = partStatusNow?.cells[entry.id];
                const owed = entry.id === "audio"
                  ? Boolean(partStatusNow?.missing.some(m => m.id === "audio" || m.id === "markers"))
                  : cell === "empty" || cell === "partial";
                return <button key={entry.id} type="button" aria-pressed={PANEL_FOR[entry.id] === step} onClick={() => setElement(entry.id)} className={viewTab(PANEL_FOR[entry.id] === step) + " gap-1.5"}>
                  {entry.id === "audio" ? t("shell.editor.audioMarkers") : entry.id === "transcript" ? t("shell.editor.privateScript") : elementName(entry.id)}
                  {owed && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title={t("shell.editor.nothingYet")} />}
                </button>;
              })}
            </nav>
            <div className="min-w-0 rounded-card border border-line bg-white p-3 sm:p-5" data-testid="active-part-tool">
      {part && step === "audio" && (
        // Keyed per part so switching parts remounts it. The marker editor
        // holds real local state — an undo stack, a debounced save, a decoded
        // waveform — and a reset effect that tried to keep that in step with
        // the prop would fight its own autosave every time one landed.
        <PartAudioMarkerEditor
          key={`${story._id}:${part.partNumber}`}
          token={token}
          story={story}
          part={part}
          onPartUpdated={handlePartUpdated}
          active={workspace === "desk" && !previewOpen}
          layout="desk"
        />
      )}
      {part && step === "comics" && (
        <PartComicEditor
          token={token}
          story={story}
          part={part}
          onPartUpdated={handlePartUpdated}
        />
      )}
      {part && step === "intro" && (
        // Keyed per part: the form holds an unsaved draft and a measured
        // length, both of which belong to one part only.
        <PartIntroEditor
          key={`${story._id}:${part.partNumber}`}
          token={token}
          story={story}
          part={part}
          onPartUpdated={handlePartUpdated}
        />
      )}
      {part && step === "transcript" && (
        // Keyed per part: the draft and the anchors belong to one part only.
        <>
          <PartTranscriptEditor
            key={`${story._id}:${part.partNumber}`}
            token={token}
            story={story}
            part={part}
            onPartUpdated={handlePartUpdated}
          />
          <PartTranslationEditor
            key={`${story._id}:${part.partNumber}:translation`}
            token={token}
            story={story}
            part={part}
            onPartUpdated={handlePartUpdated}
          />
        </>
      )}
      {part && step === "vocabulary" && (
        <PartVocabWordsEditor
          token={token}
          story={story}
          part={part}
          kind="vocab"
          onPartUpdated={handlePartUpdated}
        />
      )}
      {part && step === "phrasal" && (
        <PartVocabWordsEditor
          token={token}
          story={story}
          part={part}
          kind="phrasal"
          onPartUpdated={handlePartUpdated}
        />
      )}
      {part && step === "quiz" && (
        <PartQuizEditor token={token} story={story} part={part} onPartUpdated={handlePartUpdated} />
      )}
      {part && step === "panels" && (
        // Keyed per part: panels, matches and the audio being measured all
        // belong to one part's page and one part's track.
        <PartPanelQuizEditor
          key={`${story._id}:${part.partNumber}`}
          token={token}
          story={story}
          part={part}
          onPartUpdated={handlePartUpdated}
        />
      )}

            </div>
            <div className="mt-4 flex flex-wrap justify-between gap-2">
              <button type="button" disabled={story.parts.findIndex(entry => entry.partNumber === partNumber) <= 0} onClick={() => pick(story.parts[story.parts.findIndex(entry => entry.partNumber === partNumber) - 1].partNumber)} className={control}>{t(`shell.editor.previous.${kind}`)}</button>
              <button type="button" disabled={story.parts.findIndex(entry => entry.partNumber === partNumber) >= story.parts.length - 1} onClick={() => pick(story.parts[story.parts.findIndex(entry => entry.partNumber === partNumber) + 1].partNumber)} className={control}>{t(`shell.editor.next.${kind}`)}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoryEditor;
