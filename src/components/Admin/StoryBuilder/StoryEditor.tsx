import { useEffect, useRef, useState } from "react";
import { IoPlayOutline, IoAddOutline, IoExpandOutline, IoContractOutline, IoArrowBack, IoBookOutline, IoChevronDown, IoChevronForward } from "react-icons/io5";
import type { ReactNode } from "react";
import {
  AdminStory,
  StoryPart,
  deleteStory,
  setStoryPublished,
  addPart,
  updateStoryMeta,
} from "../../../services/adminStoryServices";
import PartMatrix from "./PartMatrix";
import { ELEMENTS, ElementId, storyReadiness, partVerdict } from "./partStatus";
import { MAX_PARTS } from "../../../types/content";
import PartAudioMarkerEditor from "./PartAudioMarkerEditor";
import PartComicEditor from "./PartComicEditor";
import StoryCoverEditor from "./StoryCoverEditor";
import StoryPricingPanel from "./StoryPricingPanel";
import CastEditor from "./CastEditor";
import type { StoryCategory } from "../../../types/storyGroups";
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

const LOCALE_COLUMNS: { id: "en" | "ru"; label: string }[] = [
  { id: "en", label: "English" },
  { id: "ru", label: "Русский" },
];

/** The story's per-language text as an editable copy, blanks where none is set. */
const localizedDraft = (story: AdminStory) => ({
  title: { en: story.localized?.title?.en ?? "", ru: story.localized?.title?.ru ?? "" },
  description: {
    en: story.localized?.description?.en ?? "",
    ru: story.localized?.description?.ru ?? "",
  },
});

// Per-part tabs within one "editing story X" view — the admin can jump
// between parts/steps freely rather than following a forced linear wizard.
const StoryEditor = ({ token, story, onStoryUpdated, onDeleted, onBack, switcher, switcherOpen, onToggleSwitcher, onPreview, previewOpen = false }: StoryEditorProps) => {
  const itemLabel = "Part";
  const elements = ELEMENTS;
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
  const [deleting, setDeleting] = useState(false);
  const [addingPart, setAddingPart] = useState(false);
  const [error, setError] = useState("");

  const [editingMeta, setEditingMeta] = useState(false);
  const [editName, setEditName] = useState(story.storyName);
  const [editLocalized, setEditLocalized] = useState(() => localizedDraft(story));
  const [editIcon, setEditIcon] = useState(story.characterIcon);
  const [editCategory, setEditCategory] = useState<StoryCategory>(story.category ?? "general");
  const [savingMeta, setSavingMeta] = useState(false);

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
        .map((g) => `${g.parts.length} × ${g.element.label.toLowerCase()}`)
        .join(", ");
      const ok = confirm(
        `Only ${readiness.sellableCount} of ${readiness.total} parts are ready to sell.

` +
          `Still missing: ${owed}.

` +
          `Publish anyway? Students will see the story with those gaps in it.`,
      );
      if (!ok) return;
    }
    setPublishing(true);
    setError("");
    try {
      const updated = await setStoryPublished(token, story._id, !story.published);
      onStoryUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update publish status.");
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
      setError(err instanceof Error ? err.message : "Failed to add a part.");
    } finally {
      setAddingPart(false);
    }
  };

  const handleStartEditMeta = () => {
    setEditName(story.storyName);
    setEditLocalized(localizedDraft(story));
    setEditIcon(story.characterIcon);
    setEditCategory(story.category ?? "general");
    setError("");
    setEditingMeta(true);
  };

  const handleSaveMeta = async () => {
    if (!editName.trim()) {
      setError("Name can't be empty.");
      return;
    }
    setSavingMeta(true);
    setError("");
    try {
      const updated = await updateStoryMeta(token, story._id, {
        storyName: editName.trim(),
        localized: editLocalized,
        characterIcon: editIcon.trim() || "📖",
        category: editCategory,
      });
      onStoryUpdated(updated);
      setEditingMeta(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSavingMeta(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${story.storyName}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await deleteStory(token, story._id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete story.");
      setDeleting(false);
    }
  };

  return (
    <section className="min-w-0" aria-label="Set editor">
      {/* One header for the whole set: where you are (breadcrumb), what it is
          (title, level, readiness, published) and what you can do (preview,
          publish). It replaces three stacked bars: "Content types", "Library"
          and a second copy of the set's name. */}
      <header className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 text-xs text-dim">
            <button type="button" onClick={onBack} className="min-h-8 hover:text-ink hover:underline">Story sets</button>
            <IoChevronForward aria-hidden="true" />
          </nav>
          <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
            <IoBookOutline className="shrink-0" size={22} aria-hidden="true" />
            <h2 className="min-w-0 break-words text-2xl font-extrabold tracking-tight text-ink">{story.storyName}</h2>
            <button type="button" onClick={onToggleSwitcher} aria-expanded={switcherOpen} aria-controls="studio-set-switcher" title="Open another set"
              className="inline-flex min-h-8 items-center gap-1 rounded-[3px] px-2 text-xs font-semibold text-dim hover:bg-white hover:text-ink">
              Switch set<IoChevronDown aria-hidden="true" className={switcherOpen ? "rotate-180" : ""} />
            </button>
            {switcherOpen && <div id="studio-set-switcher" className="absolute left-0 top-full z-30 mt-2 max-h-96 w-[min(28rem,90vw)] overflow-y-auto rounded-card border border-line bg-white shadow-lg">
              {switcher}
            </div>}
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-room px-2 py-0.5 font-semibold uppercase tracking-wide text-dim">{story.difficulty}</span>
            <span className={`rounded-full px-2 py-0.5 font-semibold ${readiness.complete ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
              {readiness.sellableCount}/{readiness.total} parts ready
            </span>
            <span className={`rounded-full px-2 py-0.5 font-semibold ${story.published ? "bg-emerald-50 text-emerald-800" : "bg-room text-dim"}`}>{story.published ? "Published" : "Draft"}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onPreview(partNumber)} disabled={!part?.audioUrl} className={control}><IoPlayOutline aria-hidden="true" />Student preview</button>
          <button type="button" onClick={() => setWorkspace("review")} aria-pressed={workspace === "review"} className="min-h-10 rounded-[3px] bg-ink px-4 py-2 text-sm font-semibold text-white">Review &amp; publish</button>
        </div>
      </header>
      <nav aria-label="Set workspace" className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {([["desk", "Editing desk"], ["overview", "Production board"], ["settings", "Set settings"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={workspace === value} onClick={() => setWorkspace(value)} className={viewTab(workspace === value)}>{label}</button>)}
      </nav>
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
      <div hidden={workspace !== "settings"} className="rounded-card border border-line bg-white p-4 sm:p-6" data-testid="set-settings">
        <h3 className="mb-4 text-lg font-bold text-ink">Set settings</h3>
      <div className="mb-4">
        {editingMeta ? (
          <div className="bg-gray-50 rounded-[3px] border border-gray-200 p-3 space-y-3 max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                aria-label="Character icon" value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                className="w-16 text-black text-center px-2 py-1.5 border border-gray-300 rounded-[3px]"
              />
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Internal name"
                title="What this panel calls the story. Students see the titles below."
                aria-label="Internal name" className="min-w-40 flex-1 text-black px-3 py-1.5 border border-gray-300 rounded-[3px]"
              />
              {/* Which shelf the story sits on in the students' list. A
                  published story REPLACES its built-in entry outright, so
                  without setting this a news story silently moves under
                  "Stories" the moment it goes live. */}
              <select
                aria-label="Category" value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as StoryCategory)}
                className="text-black text-sm px-2 py-1.5 border border-gray-300 rounded-[3px] bg-white"
                title="Which section of the story list this appears under"
              >
                <option value="general">Stories</option>
                <option value="news">News &amp; Interesting Things</option>
              </select>
            </div>
            {/* What students read on the story list and the level page, per
                language. An empty field falls back to the internal name — which
                is how an English reader ended up looking at a Russian title. */}
            <div className="grid gap-3 md:grid-cols-2">
              {LOCALE_COLUMNS.map(({ id, label }) => (
                <fieldset key={id} className="bg-white rounded-[3px] border border-gray-200 p-2 space-y-2 min-w-0">
                  <legend className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500 px-1">
                    {label}
                  </legend>
                  <input
                    type="text"
                    value={editLocalized.title[id]}
                    onChange={(e) =>
                      setEditLocalized((l) => ({ ...l, title: { ...l.title, [id]: e.target.value } }))
                    }
                    aria-label={`${label} title`} placeholder={`Title — empty shows "${editName.trim() || story.storyName}"`}
                    className="w-full text-black px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm"
                  />
                  <textarea
                    value={editLocalized.description[id]}
                    onChange={(e) =>
                      setEditLocalized((l) => ({
                        ...l,
                        description: { ...l.description, [id]: e.target.value },
                      }))
                    }
                    aria-label={`${label} description`} placeholder="Description — on the story card, and on each part's preview card that has none of its own"
                    rows={3}
                    className="w-full text-black px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm"
                  />
                </fieldset>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSaveMeta}
                disabled={savingMeta}
                className="text-sm bg-black text-white rounded-[3px] px-4 py-1.5 disabled:opacity-50"
              >
                {savingMeta ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditingMeta(false)}
                disabled={savingMeta}
                className="text-sm text-gray-500 hover:text-black px-2"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-black">
                {story.characterIcon} {story.storyName}
              </h2>
              <button
                onClick={handleStartEditMeta}
                className="text-xs text-gray-400 hover:text-black"
                title="Rename, or edit what students read"
              >
                Edit
              </button>
            </div>
            <p className="text-xs text-gray-500 flex flex-wrap gap-x-3">
              {LOCALE_COLUMNS.map(({ id }) => {
                const title = story.localized?.title?.[id]?.trim();
                return (
                  <span key={id}>
                    <span className="font-mono uppercase text-gray-400">{id}</span>{" "}
                    {title ? (
                      title
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartEditMeta}
                        className="text-amber-700 underline hover:no-underline"
                        title={`Readers in this language see "${story.storyName}"`}
                      >
                        no title yet
                      </button>
                    )}
                  </span>
                );
              })}
            </p>
          </div>
        )}
        <p className="text-sm text-gray-500 flex flex-wrap items-center gap-x-2">
          <span>{story.difficulty}</span>
          <span aria-hidden="true">·</span>
          <span
            className={
              readiness.complete
                ? "text-emerald-700 font-medium"
                : "text-amber-700 font-medium"
            }
          >
            {readiness.sellableCount}/{readiness.total} parts ready
          </span>
          <span aria-hidden="true">·</span>
          <span>{story.published ? "Published" : "Draft"}</span>
        </p>

        {/* What is outstanding across the whole story, read down the columns
            rather than along the rows. "I never did the quizzes" is the thing
            the old part chips could not say. */}
        {readiness.gaps.length > 0 && (
          <p className="mt-1.5 text-xs text-gray-500">
            Still needed:{" "}
            {readiness.gaps.map(({ element, parts }, i) => (
              <span key={element.id}>
                {i > 0 && <span className="text-gray-300"> · </span>}
                <span className="text-amber-700 font-medium">{element.label.toLowerCase()}</span>
                <span className="text-gray-400"> on {parts.length === 1 ? "part" : "parts"} {parts.join(", ")}</span>
              </span>
            ))}
          </p>
        )}

        {/* Story-level, so it sits with the name rather than in the grid below —
            a story has one card whatever its part count. Collapsed, because it is
            set once and the grid is what the page is for. */}
        <details className="mt-3 group">
          <summary className="cursor-pointer list-none text-xs text-gray-500 hover:text-black select-none inline-flex items-center gap-1">
            <span className="text-gray-400 group-open:rotate-90 transition-transform">▸</span>
            Card image{story.coverUrl ? "" : " — none set"}
          </summary>
          <div className="mt-2 bg-gray-50 rounded-[3px] border border-gray-200 p-3">
            <StoryCoverEditor token={token} story={story} onStoryUpdated={onStoryUpdated} />
          </div>
        </details>

        {/* The characters on the level page — story-level, like the card. */}
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-xs text-gray-500 hover:text-black select-none inline-flex items-center gap-1">
            <span className="text-gray-400 group-open:rotate-90 transition-transform">▸</span>
            Cast — {story.cast?.length ? `${story.cast.length} character${story.cast.length === 1 ? "" : "s"}` : "none yet"}
          </summary>
          <div className="mt-2 bg-gray-50 rounded-[3px] border border-gray-200 p-3">
            <CastEditor token={token} story={story} onStoryUpdated={onStoryUpdated} />
          </div>
        </details>

        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-xs text-gray-500 hover:text-black select-none inline-flex items-center gap-1">
            <span className="text-gray-400 group-open:rotate-90 transition-transform">▸</span>
            Pricing &amp; access{story.paid === false ? " — free" : ""}
          </summary>
          <div className="mt-2">
            <StoryPricingPanel token={token} story={story} onStoryUpdated={onStoryUpdated} />
          </div>
        </details>
      </div>


        <details className="mt-6 border-t border-line pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-red-700">Delete set</summary>
          <p className="my-3 text-sm text-dim">Permanently delete this set and its parts.</p>
          <button type="button" onClick={handleDelete} disabled={deleting} className={control + " text-red-700"}>{deleting ? "Deleting…" : "Delete set"}</button>
        </details>
      </div>
      <div hidden={workspace !== "overview"} className="min-w-0 rounded-card border border-line bg-white p-4 sm:p-6" data-testid="production-board">
        <h3 className="text-lg font-bold text-ink">Production board</h3>
        <p className="mb-5 mt-1 text-sm text-dim">Open any cell to edit that {itemLabel.toLowerCase()}. Required and optional tools keep their existing readiness rules.</p>
        <PartMatrix readiness={readiness} activePart={partNumber} activeElement={element} previewPart={PREVIEW_PART} onPick={pick} onAddPart={handleAddPart} addingPart={addingPart} atLimit={story.parts.length >= MAX_PARTS} elements={elements} itemLabel={itemLabel} />
      </div>
      <div hidden={workspace !== "review"} className="rounded-card border border-line bg-white p-4 sm:p-6" data-testid="publish-review">
        <h3 className="text-lg font-bold text-ink">Review &amp; publish</h3>
        <p className="mb-5 mt-1 text-sm text-dim">{readiness.sellableCount} of {readiness.total} parts ready. {story.published ? "This set is published." : "This set is a draft."}</p>
        {readiness.gaps.length > 0 ? <div className="mb-6 space-y-4">{readiness.gaps.map(({element: missing, parts}) => <div key={missing.id}>
          <h4 className="mb-2 text-sm font-semibold text-ink">{missing.label}</h4>
          <div className="flex flex-wrap gap-2">{parts.map(number => <button key={number} type="button" onClick={() => pick(number, missing.id)} className={control}>{itemLabel} {number}<IoArrowBack className="rotate-180" aria-hidden="true" /></button>)}</div>
        </div>)}</div> : <p className="mb-6 text-sm text-green-700">All required elements are ready.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onPreview(partNumber)} disabled={!part?.audioUrl} className={control}><IoPlayOutline aria-hidden="true" />Student preview</button>
          <button type="button" onClick={handleTogglePublish} disabled={publishing} className="min-h-10 rounded-[3px] bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{publishing ? "Updating…" : story.published ? "Unpublish" : "Publish"}</button>
        </div>
      </div>
      <div ref={deskRef} hidden={workspace !== "desk"} data-testid="editing-desk">
        <div className={focused ? "min-w-0" : "grid min-w-0 gap-5 lg:grid-cols-[180px_minmax(0,1fr)]"}>
          <aside hidden={focused} className="min-w-0" aria-label="Story parts">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-ink">Parts</h3><span className="text-xs tabular-nums text-dim">{readiness.total}</span></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1 lg:max-h-[65vh] lg:overflow-y-auto">
              {readiness.parts.map(status => <button key={status.partNumber} type="button" onClick={() => pick(status.partNumber)} aria-pressed={partNumber === status.partNumber} className={`flex min-h-14 items-start gap-2.5 rounded-tile border px-3 py-2.5 text-left text-ink ${partNumber === status.partNumber ? "border-ink bg-room" : "border-line bg-white hover:border-line-strong"}`}>
                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${status.sellable ? "bg-emerald-500" : status.empty ? "bg-line-strong" : "bg-amber-500"}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{itemLabel} {status.partNumber}</span>
                  <span className={`block text-xs ${status.sellable ? "text-emerald-800" : "text-dim"}`}>{partVerdict(status)}</span>
                  {status.partNumber === PREVIEW_PART && <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wide text-dim">Free preview</span>}
                </span>
              </button>)}
            </div>
            <button type="button" onClick={handleAddPart} disabled={addingPart || story.parts.length >= MAX_PARTS} title={story.parts.length >= MAX_PARTS ? `A set has at most ${MAX_PARTS} ${itemLabel.toLowerCase()}s` : undefined} className={control + " mt-3 w-full"}><IoAddOutline aria-hidden="true" />{addingPart ? "Adding…" : story.parts.length >= MAX_PARTS ? `${MAX_PARTS} is the most` : `Add ${itemLabel.toLowerCase()}`}</button>
          </aside>
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-ink"><span className="text-dim">{itemLabel} {partNumber} · </span>{step === "audio" ? "Audio & markers" : element === "transcript" ? "Private script & translation" : elements.find(entry => entry.id === element)?.label}</h3>
              <button type="button" onClick={() => setFocused(value => !value)} aria-pressed={focused} className={control}>{focused ? <IoContractOutline aria-hidden="true" /> : <IoExpandOutline aria-hidden="true" />}{focused ? "Exit focus" : "Focus mode"}</button>
            </div>
            <nav hidden={focused} aria-label="Part editing tools" className="mb-3 flex flex-wrap gap-x-1 border-b border-line">
              {elements.filter(entry => entry.id !== "markers").map(entry => {
                // A dot marks a tool this part has nothing in yet. Audio's tab
                // also owns the markers, so either one missing marks it.
                const cell = partStatusNow?.cells[entry.id];
                const owed = entry.id === "audio"
                  ? Boolean(partStatusNow?.missing.some(m => m.id === "audio" || m.id === "markers"))
                  : cell === "empty" || cell === "partial";
                return <button key={entry.id} type="button" aria-pressed={PANEL_FOR[entry.id] === step} onClick={() => setElement(entry.id)} className={viewTab(PANEL_FOR[entry.id] === step) + " gap-1.5"}>
                  {entry.id === "audio" ? "Audio & markers" : entry.id === "transcript" ? "Private script" : entry.label}
                  {owed && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Nothing here yet for this part" />}
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
              <button type="button" disabled={story.parts.findIndex(entry => entry.partNumber === partNumber) <= 0} onClick={() => pick(story.parts[story.parts.findIndex(entry => entry.partNumber === partNumber) - 1].partNumber)} className={control}>Previous {itemLabel.toLowerCase()}</button>
              <button type="button" disabled={story.parts.findIndex(entry => entry.partNumber === partNumber) >= story.parts.length - 1} onClick={() => pick(story.parts[story.parts.findIndex(entry => entry.partNumber === partNumber) + 1].partNumber)} className={control}>Next {itemLabel.toLowerCase()}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoryEditor;
