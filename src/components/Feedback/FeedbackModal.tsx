import { useState } from "react";
import { useTranslation } from "react-i18next";

interface FeedbackModalProps {
  onClose: () => void;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const FeedbackModal = ({ onClose }: FeedbackModalProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    setStatus("sending");
    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("sent");
      setTimeout(onClose, 1200);
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-black mb-4">
          {t("feedback.title", "Leave feedback")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("feedback.name", "Name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder={t("feedback.namePlaceholder", "Your name") as string}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("feedback.message", "Message")}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
              placeholder={t("feedback.messagePlaceholder", "Bug report or suggestion...") as string}
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-red-600">
              {t("feedback.error", "Something went wrong. Try again.")}
            </p>
          )}
          {status === "sent" && (
            <p className="text-sm text-green-600">
              {t("feedback.success", "Thank you for your feedback!")}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {t("feedback.cancel", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={status === "sending" || status === "sent"}
              className="px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {status === "sending"
                ? t("feedback.sending", "Sending...")
                : t("feedback.submit", "Submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;