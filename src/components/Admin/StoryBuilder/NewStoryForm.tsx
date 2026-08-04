import { useState } from "react";
import { AdminStory, Difficulty, createStory } from "../../../services/adminStoryServices";

interface NewStoryFormProps {
  token: string;
  onCreated: (story: AdminStory) => void;
  onCancel: () => void;
}

const MAX_PARTS = 20;

const NewStoryForm = ({ token, onCreated, onCancel }: NewStoryFormProps) => {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [storyId, setStoryId] = useState("");
  const [storyName, setStoryName] = useState("");
  const [description, setDescription] = useState("");
  const [characterIcon, setCharacterIcon] = useState("📖");
  const [totalParts, setTotalParts] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parts = Number(totalParts);
    if (!Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS) {
      return setError(`Number of parts must be between 1 and ${MAX_PARTS}.`);
    }

    setSubmitting(true);
    try {
      const story = await createStory(token, {
        difficulty,
        storyId: storyId.trim(),
        storyName: storyName.trim(),
        description: description.trim(),
        characterIcon,
        totalParts: parts,
      });
      onCreated(story);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create story.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 border border-gray-200 space-y-3 max-w-lg">
      <h2 className="font-semibold text-black">New story</h2>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Difficulty</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Story id (slug, e.g. "mia")</label>
        <input
          type="text"
          value={storyId}
          onChange={(e) => setStoryId(e.target.value)}
          required
          className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Story name</label>
        <input
          type="text"
          value={storyName}
          onChange={(e) => setStoryName(e.target.value)}
          required
          className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="flex gap-3">
        <div className="w-24">
          <label className="block text-xs text-gray-500 mb-1">Icon</label>
          <input
            type="text"
            value={characterIcon}
            onChange={(e) => setCharacterIcon(e.target.value)}
            className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg text-center"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Number of parts (max {MAX_PARTS})</label>
          <input
            type="number"
            min={1}
            max={MAX_PARTS}
            value={totalParts}
            onChange={(e) => setTotalParts(e.target.value)}
            required
            className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create story"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-black px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default NewStoryForm;
