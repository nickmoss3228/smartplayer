import { useState } from "react";
import { AdminStory, Difficulty, createStory } from "../../../services/adminStoryServices";
import { MAX_PARTS, validPartCount } from "../../../types/content";
import { buttonPrimary, buttonSecondary } from "../../ui/buttonStyles";

interface NewStoryFormProps {
  token: string;
  onCreated: (story: AdminStory) => void;
  onCancel: () => void;
}

const LOCALES: { id: "en" | "ru"; label: string }[] = [
  { id: "en", label: "English" },
  { id: "ru", label: "Русский" },
];

const NewStoryForm = ({ token, onCreated, onCancel }: NewStoryFormProps) => {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [storyId, setStoryId] = useState("");
  const [storyName, setStoryName] = useState("");
  // What students read, per language. Asked for here so a new story never
  // reaches the shelf showing its internal name in place of a title.
  const [title, setTitle] = useState({ en: "", ru: "" });
  const [description, setDescription] = useState({ en: "", ru: "" });
  const [characterIcon, setCharacterIcon] = useState("📖");
  const [totalParts, setTotalParts] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parts = Number(totalParts);
    if (!validPartCount(parts)) {
      return setError(`Enter a whole number of parts from 1 to ${MAX_PARTS}.`);
    }

    setSubmitting(true);
    try {
      const story = await createStory(token, {
        difficulty,
        storyId: storyId.trim(),
        storyName: storyName.trim(),
        // The pre-localization fallback, for anything that still reads it.
        description: description.en.trim() || description.ru.trim(),
        localized: {
          title: { en: title.en.trim(), ru: title.ru.trim() },
          description: { en: description.en.trim(), ru: description.ru.trim() },
        },
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
    <form onSubmit={handleSubmit} className="bg-white rounded-card p-4 sm:p-6 border border-line space-y-5">
      <h2 className="text-xl font-bold text-ink">New story set</h2>


      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section aria-label="Set structure" className="space-y-5 rounded-tile border border-line bg-room p-4 sm:p-5">
          <h3 className="text-base font-bold text-ink">Set structure</h3>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Difficulty</label>
        <select
          aria-label="Difficulty" value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="w-full text-black px-3 py-2 border border-gray-300 rounded-[3px]"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Set id (slug, e.g. "mia")</label>
        <input
          type="text"
          aria-label="Set ID" value={storyId}
          onChange={(e) => setStoryId(e.target.value)}
          required
          className="w-full text-black px-3 py-2 border border-gray-300 rounded-[3px]"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Internal name <span className="text-gray-400">— what this panel calls it</span>
        </label>
        <input
          type="text"
          aria-label="Internal name" value={storyName}
          onChange={(e) => setStoryName(e.target.value)}
          required
          className="w-full text-black px-3 py-2 border border-gray-300 rounded-[3px]"
        />
      </div>

      <div className="flex gap-3">
        <div className="w-24">
          <label className="block text-xs text-gray-500 mb-1">Icon</label>
          <input
            type="text"
            aria-label="Character icon" value={characterIcon}
            onChange={(e) => setCharacterIcon(e.target.value)}
            className="w-full text-black px-3 py-2 border border-gray-300 rounded-[3px] text-center"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Number of parts to start with</label>
          <input
            type="number"
            min={1}
            max={MAX_PARTS}
            step={1}
            aria-label="Initial count" value={totalParts}
            onChange={(e) => setTotalParts(e.target.value)}
            required
            className="w-full text-black px-3 py-2 border border-gray-300 rounded-[3px]"
          />
          <p className="mt-1.5 text-xs text-dim">From 1 to {MAX_PARTS}. You can add more parts in the editor, up to {MAX_PARTS}.</p>
        </div>
      </div>

        </section>
        <section aria-label="Library card" className="space-y-5 rounded-tile border border-line p-4 sm:p-5">
          <h3 className="text-base font-bold text-ink">Library card</h3>
      <div className="grid gap-4">
        {LOCALES.map(({ id, label }) => (
          <fieldset key={id} className="border border-gray-200 rounded-[3px] p-3 space-y-3 min-w-0">
            <legend className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500 px-1">
              {label}
            </legend>
            <input
              type="text"
              aria-label={`${label} title`} value={title[id]}
              onChange={(e) => setTitle((t) => ({ ...t, [id]: e.target.value }))}
              placeholder="Title students see"
              className="w-full text-black px-3 py-2 border border-gray-300 rounded-[3px] text-sm"
            />
            <textarea
              aria-label={`${label} description`} value={description[id]}
              onChange={(e) => setDescription((d) => ({ ...d, [id]: e.target.value }))}
              placeholder="Description"
              rows={2}
              className="w-full text-black px-3 py-2 border border-gray-300 rounded-[3px] text-sm"
            />
          </fieldset>
        ))}
      </div>

        </section>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className={buttonPrimary}
        >
          {submitting ? "Creating..." : "Create set"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={buttonSecondary}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default NewStoryForm;
