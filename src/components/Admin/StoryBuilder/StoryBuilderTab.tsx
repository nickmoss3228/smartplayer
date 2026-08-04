import { useCallback, useEffect, useState } from "react";
import {
  AdminStory,
  AdminStoryListItem,
  getStory,
  listStories,
} from "../../../services/adminStoryServices";
import NewStoryForm from "./NewStoryForm";
import StoryEditor from "./StoryEditor";

const StoryBuilderTab = ({ token }: { token: string }) => {
  const [stories, setStories] = useState<AdminStoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeStory, setActiveStory] = useState<AdminStory | null>(null);

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

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && stories.length === 0 && !error && (
        <p className="text-gray-500">No stories yet — create one above.</p>
      )}

      <div className="space-y-2">
        {stories.map((story) => (
          <button
            key={story._id}
            onClick={() => openStory(story._id)}
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
    </div>
  );
};

export default StoryBuilderTab;
