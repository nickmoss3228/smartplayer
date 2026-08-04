import { useState } from "react";
import {
  AdminStory,
  StoryPart,
  deleteStory,
  setStoryPublished,
  addPart,
} from "../../../services/adminStoryServices";
import PartAudioMarkerEditor from "./PartAudioMarkerEditor";
import PartVocabWordsEditor from "./PartVocabWordsEditor";
import PartQuizEditor from "./PartQuizEditor";

interface StoryEditorProps {
  token: string;
  story: AdminStory;
  onStoryUpdated: (story: AdminStory) => void;
  onDeleted: () => void;
  onBack: () => void;
}

type Step = "audio" | "vocabulary" | "phrasal" | "quiz";

const MAX_PARTS = 20;

const STEPS: { id: Step; label: string }[] = [
  { id: "audio", label: "Audio & Markers" },
  { id: "vocabulary", label: "Vocabulary" },
  { id: "phrasal", label: "Phrasal Verbs" },
  { id: "quiz", label: "Quiz" },
];

// Per-part tabs within one "editing story X" view — the admin can jump
// between parts/steps freely rather than following a forced linear wizard.
const StoryEditor = ({ token, story, onStoryUpdated, onDeleted, onBack }: StoryEditorProps) => {
  const [partNumber, setPartNumber] = useState(1);
  const [step, setStep] = useState<Step>("audio");
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingPart, setAddingPart] = useState(false);
  const [error, setError] = useState("");

  const part = story.parts.find((p) => p.partNumber === partNumber) as StoryPart;

  const handlePartUpdated = (updatedPart: StoryPart) => {
    onStoryUpdated({
      ...story,
      parts: story.parts.map((p) => (p.partNumber === updatedPart.partNumber ? updatedPart : p)),
    });
  };

  const partsReady = story.parts.filter((p) => p.audioUrl && p.timeMarkers.length > 0).length;

  const handleTogglePublish = async () => {
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
            className={`text-sm rounded-lg px-4 py-2 disabled:opacity-50 ${
              story.published
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-amber-500 text-white hover:bg-amber-600"
            }`}
          >
            {publishing ? "..." : story.published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-bold text-black">
          {story.characterIcon} {story.storyName}
        </h2>
        <p className="text-sm text-gray-500">
          {story.difficulty} · {partsReady}/{story.totalParts} parts have audio + markers ·{" "}
          {story.published ? "Published" : "Draft"}
        </p>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="flex flex-wrap gap-1 mb-4">
        {story.parts.map((p) => (
          <button
            key={p.partNumber}
            onClick={() => setPartNumber(p.partNumber)}
            className={`text-xs rounded-full px-3 py-1.5 ${
              p.partNumber === partNumber
                ? "bg-black text-white"
                : p.audioUrl && p.timeMarkers.length > 0
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Part {p.partNumber}
          </button>
        ))}
        <button
          onClick={handleAddPart}
          disabled={addingPart || story.parts.length >= MAX_PARTS}
          title={
            story.parts.length >= MAX_PARTS
              ? `A story can have at most ${MAX_PARTS} parts.`
              : "Add another part to this story"
          }
          className="text-xs text-gray-600 bg-white border border-dashed border-gray-300 rounded-full px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
        >
          {addingPart ? "Adding..." : "+ Add part"}
        </button>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={`px-3 py-2 text-sm font-semibold rounded-t-lg ${
              step === s.id
                ? "bg-white text-black border border-b-0 border-gray-200"
                : "text-gray-500 hover:text-black"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {part && step === "audio" && (
        <PartAudioMarkerEditor token={token} story={story} part={part} onPartUpdated={handlePartUpdated} />
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
