import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

const DIFFICULTIES: DifficultySlug[] = ["easy", "medium", "hard"];

const StoryBuilderTab = ({ token }: { token: string }) => {
  const { t } = useTranslation();
  const [stories, setStories] = useState<AdminStoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeStory, setActiveStory] = useState<AdminStory | null>(null);
  const [importingSlug, setImportingSlug] = useState<string | null>(null);
  const [importError, setImportError] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultySlug | "all">("all");

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

  const visibleStories = useMemo(
    () =>
      difficultyFilter === "all"
        ? stories
        : stories.filter((s) => s.difficulty === difficultyFilter),
    [stories, difficultyFilter]
  );

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

  const handleImport = async (difficulty: DifficultySlug, group: StoryGroup) => {
    setImportingSlug(group.slug);
    setImportError("");
    try {
      const payload = await assembleImportPayload(token, difficulty, group);
      const story = await importStory(token, payload);
      setActiveStory(story); // open the new draft for review before publishing
      load();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImportingSlug(null);
    }
  };

  if (activeStory) {
    return (
      <StoryEditor
        token={token}
        story={activeStory}
        onStoryUpdated={setActiveStory}
        onDeleted={handleBack}
        onBack={handleBack}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-black">Story Builder</h2>
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg px-4 py-2"
          >
            New story
          </button>
        )}
      </div>

      {showNewForm && (
        <div className="mb-4">
          <NewStoryForm token={token} onCreated={handleCreated} onCancel={() => setShowNewForm(false)} />
        </div>
      )}

      {importable.length > 0 && (
        <div className="mb-6 bg-gray-50 rounded-lg border border-gray-200 p-3">
          <h3 className="text-sm font-semibold text-black mb-1">Import built-in stories</h3>
          <p className="text-xs text-gray-500 mb-3">
            Brings a story's audio, markers, vocabulary, and quiz into the builder as a{" "}
            <strong>draft</strong> — nothing changes for players until you review it and hit
            Publish. Deleting an imported draft/story reverts to the built-in version.
          </p>
          {importError && <p className="text-red-600 text-sm mb-2">{importError}</p>}
          <div className="flex flex-wrap gap-2">
            {importable.map(({ difficulty, group }) => (
              <button
                key={`${difficulty}:${group.slug}`}
                onClick={() => handleImport(difficulty, group)}
                disabled={importingSlug === group.slug}
                className="flex items-center gap-2 text-sm text-black bg-white border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-100 disabled:opacity-50"
              >
                <span>{group.coverEmoji}</span>
                {group.title}
                <span className="text-xs text-gray-400">({difficulty})</span>
                {importingSlug === group.slug && <span className="text-xs">Importing...</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && stories.length === 0 && !error && (
        <p className="text-gray-500">No stories yet — create or import one above.</p>
      )}

      {!loading && stories.length > 0 && (
        <div className="flex gap-2 mb-3">
          {(["all", ...DIFFICULTIES] as const).map((option) => (
            <button
              key={option}
              onClick={() => setDifficultyFilter(option)}
              className={`text-xs font-semibold rounded-full px-3 py-1 capitalize transition-colors ${
                difficultyFilter === option
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {option === "all"
                ? `All (${stories.length})`
                : `${option} (${stories.filter((s) => s.difficulty === option).length})`}
            </button>
          ))}
        </div>
      )}

      {!loading && visibleStories.length === 0 && stories.length > 0 && (
        <p className="text-gray-500">No stories at this difficulty.</p>
      )}

      <StoryList stories={visibleStories} onOpen={openStory} />
    </div>
  );
};

const StoryList = ({
  stories,
  onOpen,
}: {
  stories: AdminStoryListItem[];
  onOpen: (id: string) => void;
}) => (
  <div className="space-y-2">
    {stories.map((story) => (
      <button
        key={story._id}
        onClick={() => onOpen(story._id)}
        className="w-full flex items-center gap-3 bg-white rounded-lg shadow p-3 border border-gray-200 hover:bg-gray-50 text-left"
      >
        <span className="text-xl">{story.characterIcon}</span>
        <div className="flex-1">
          <div className="font-semibold text-black">{story.storyName}</div>
          <div className="text-xs text-gray-500">
            {story.difficulty} · {story.totalParts} parts
          </div>
        </div>
        <span
          className={`text-xs rounded-full px-2 py-0.5 ${
            story.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {story.published ? "Published" : "Draft"}
        </span>
      </button>
    ))}
  </div>
);

export default StoryBuilderTab;
