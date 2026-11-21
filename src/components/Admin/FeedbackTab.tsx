import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchFeedback,
  deleteFeedback,
  AdminFeedbackItem,
} from "../../services/adminServices";

const FeedbackTab = ({ token }: { token: string }) => {
  const { t, i18n } = useTranslation("studio");
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
      setFetchError(t("feedback.loadError"));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

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
      setFetchError(t("feedback.deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-black mb-4">{t("feedback.title")}</h2>

      {loading && <p className="text-gray-500">{t("common.loading")}</p>}
      {fetchError && <p className="text-red-600">{fetchError}</p>}
      {!loading && feedback.length === 0 && !fetchError && (
        <p className="text-gray-500">{t("feedback.empty")}</p>
      )}

      <div className="space-y-3">
        {feedback.map((item) => (
          <div
            key={item._id}
            className="bg-white rounded-[3px] shadow p-4 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-black">{item.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleString(i18n.language)}
                </span>
                <button
                  onClick={() => handleDelete(item._id)}
                  disabled={deletingId === item._id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {deletingId === item._id
                    ? t("feedback.deleting")
                    : t("feedback.delete")}
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
