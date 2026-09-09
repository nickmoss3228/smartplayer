import { useState } from "react";
import {
  AdminStory,
  StoryPart,
  deleteStory,
  setStoryPublished,
  addPart,
  updateStoryMeta,
} from "../../../services/adminStoryServices";
import PartMatrix from "./PartMatrix";
import { ELEMENTS, ElementId, storyReadiness } from "./partStatus";
import PartAudioMarkerEditor from "./PartAudioMarkerEditor";
import PartComicEditor from "./PartComicEditor";
import StoryCoverEditor from "./StoryCoverEditor";
import type { StoryCategory } from "../../../types/storyGroups";
import PartVocabWordsEditor from "./PartVocabWordsEditor";
import PartQuizEditor from "./PartQuizEditor";

interface StoryEditorProps {
  token: string;
  story: AdminStory;
  onStoryUpdated: (story: AdminStory) => void;
  onDeleted: () => void;
  onBack: () => void;
}

const MAX_PARTS = 20;

// Part 1 of a paid story is what a non-owner hears before deciding to buy
// (PAID_PREVIEW_PARTS in backend/src/config/priceCatalog.js). The builder marks
// it so the shop window gets made deliberately rather than by accident.
const PREVIEW_PART = 1;

/** Audio and markers are edited in one place, so two grid columns open the same
 *  panel. Everything else is one column, one editor. */
const PANEL_FOR: Record<ElementId, "audio" | "comics" | "vocabulary" | "phrasal" | "quiz"> = {
  audio: "audio",
  markers: "audio",
  comic: "comics",
  vocab: "vocabulary",
  phrasal: "phrasal",
  quiz: "quiz",
};

// Per-part tabs within one "editing story X" view — the admin can jump
// between parts/steps freely rather than following a forced linear wizard.
const StoryEditor = ({ token, story, onStoryUpdated, onDeleted, onBack }: StoryEditorProps) => {
  const [partNumber, setPartNumber] = useState(1);
  // Which CELL is open, not which tab — the grid is the navigation now.
  const [element, setElement] = useState<ElementId>("audio");
  const step = PANEL_FOR[element];
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingPart, setAddingPart] = useState(false);
  const [error, setError] = useState("");

  const [editingMeta, setEditingMeta] = useState(false);
  const [editName, setEditName] = useState(story.storyName);
  const [editDescription, setEditDescription] = useState(story.description);
  const [editIcon, setEditIcon] = useState(story.characterIcon);
  const [editCategory, setEditCategory] = useState<StoryCategory>(story.category ?? "general");
  const [savingMeta, setSavingMeta] = useState(false);

  const part = story.parts.find((p) => p.partNumber === partNumber) as StoryPart;

  const handlePartUpdated = (updatedPart: StoryPart) => {
    onStoryUpdated({
      ...story,
      parts: story.parts.map((p) => (p.partNumber === updatedPart.partNumber ? updatedPart : p)),
    });
  };

  // One rule for "done", shared with the grid and the publish gate — see
  // partStatus.ts. A story is something people buy, so a part is finished when
  // it has every required element, not when it has audio.
  const readiness = storyReadiness(story);

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
      setPartNumber(updated.parts[updated.parts.length - 1].partNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add a part.");
    } finally {
      setAddingPart(false);
    }
  };

  const handleStartEditMeta = () => {
    setEditName(story.storyName);
    setEditDescription(story.description);
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
        description: editDescription.trim(),
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-black">
          &larr; Back to stories
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={handleTogglePublish}
            disabled={publishing}
            title={
              story.published
                ? "Take this story off the shelves"
                : readiness.complete
                  ? "Put this story on the shelves"
                  : `${readiness.total - readiness.sellableCount} parts are not ready to sell`
            }
            className={`text-sm rounded-lg px-4 py-2 disabled:opacity-50 ${
              story.published
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : readiness.complete
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-white text-amber-700 border border-amber-400 hover:bg-amber-50"
            }`}
          >
            {publishing
              ? "…"
              : story.published
                ? "Unpublish"
                : readiness.complete
                  ? "Publish"
                  : `Publish ${readiness.sellableCount}/${readiness.total}`}
          </button>
        </div>
      </div>

      <div className="mb-4">
        {editingMeta ? (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2 max-w-md">
            <div className="flex gap-2">
              <input
                type="text"
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                className="w-16 text-black text-center px-2 py-1.5 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Story name"
                className="flex-1 text-black px-3 py-1.5 border border-gray-300 rounded-lg"
              />
              {/* Which shelf the story sits on in the students' list. A
                  published story REPLACES its built-in entry outright, so
                  without setting this a news story silently moves under
                  "Stories" the moment it goes live. */}
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as StoryCategory)}
                className="text-black text-sm px-2 py-1.5 border border-gray-300 rounded-lg bg-white"
                title="Which section of the story list this appears under"
              >
                <option value="general">Stories</option>
                <option value="news">News &amp; Interesting Things</option>
              </select>
            </div>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description"
              rows={2}
              className="w-full text-black px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveMeta}
                disabled={savingMeta}
                className="text-sm bg-black text-white rounded-lg px-4 py-1.5 disabled:opacity-50"
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
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-black">
              {story.characterIcon} {story.storyName}
            </h2>
            <button
              onClick={handleStartEditMeta}
              className="text-xs text-gray-400 hover:text-black"
              title="Rename or edit this story"
            >
              Edit
            </button>
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
            {readiness.sellableCount}/{readiness.total} parts sellable
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
          <div className="mt-2 bg-gray-50 rounded-lg border border-gray-200 p-3">
            <StoryCoverEditor token={token} story={story} onStoryUpdated={onStoryUpdated} />
          </div>
        </details>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {/* Parts down, elements across. Replaces both the part row and the step
          row: one click lands on a cell, and the same grid is the report on
          what the story still owes. */}
      <div className="mb-4 bg-white rounded-lg border border-gray-200 p-3">
        <PartMatrix
          readiness={readiness}
          activePart={partNumber}
          activeElement={element}
          previewPart={PREVIEW_PART}
          onPick={(nextPart, nextElement) => {
            setPartNumber(nextPart);
            setElement(nextElement);
          }}
          onAddPart={handleAddPart}
          addingPart={addingPart}
          canAddPart={story.parts.length < MAX_PARTS}
          maxParts={MAX_PARTS}
        />
      </div>

      {/* Which cell is open, said in words — the grid shows where you are, this
          says what you are looking at. */}
      <div className="flex items-baseline gap-2 mb-3 pb-2 border-b border-gray-200">
        <h3 className="text-sm font-bold text-black">Part {partNumber}</h3>
        <span className="text-xs text-gray-500">
          {ELEMENTS.find((e) => e.id === element)?.label}
        </span>
        {element === "markers" && (
          <span className="text-xs text-gray-400">— set on the waveform below</span>
        )}
      </div>

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
        />
      )}
      {part && step === "comics" && (
        <PartComicEditor
          token={token}
          story={story}
          part={part}
          onPartUpdated={handlePartUpdated}
          onStoryUpdated={onStoryUpdated}
        />
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
    </div>
  );
};

export default StoryEditor;
