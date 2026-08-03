import { useState, useEffect, useCallback } from "react";
import {
  fetchFeedback,
  deleteFeedback,
  AdminFeedbackItem,
} from "../../services/adminServices";

const FeedbackTab = ({ token }: { token: string }) => {
  const [feedback, setFeedback] = useState<AdminFeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      setFeedback(await fetchFeedback(token));
    } catch (err) {
      console.error(err);
      setFetchError("Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteFeedback(token, id);
      setFeedback((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error(err);
      setFetchError("Could not delete message.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-black mb-4">Feedback Messages</h2>

      {loading && <p className="text-gray-500">Loading...</p>}
      {fetchError && <p className="text-red-600">{fetchError}</p>}
      {!loading && feedback.length === 0 && !fetchError && (
        <p className="text-gray-500">No messages yet.</p>
      )}

      <div className="space-y-3">
        {feedback.map((item) => (
          <div
            key={item._id}
            className="bg-white rounded-lg shadow p-4 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-black">{item.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
                <button
                  onClick={() => handleDelete(item._id)}
                  disabled={deletingId === item._id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {deletingId === item._id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{item.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeedbackTab;
