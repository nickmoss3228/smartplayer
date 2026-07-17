import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
const TOKEN_KEY = "admin_token";

interface FeedbackItem {
  _id: string;
  name: string;
  message: string;
  createdAt: string;
}

const AdminPanel = () => {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(TOKEN_KEY)
  );
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [fetchError, setFetchError] = useState("");

  const fetchFeedback = useCallback(async (authToken: string) => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFeedback(data.feedback ?? []);
    } catch (err) {
      console.error(err);
      setFetchError("Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchFeedback(token);
  }, [token, fetchFeedback]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error ?? "Invalid code word.");
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
    } catch (err) {
      console.error(err);
      setLoginError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCode("");
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <form
          onSubmit={handleLogin}
          className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm"
        >
          <h1 className="text-xl font-bold text-black mb-4 text-center">
            Admin Access
          </h1>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code word"
            required
            className="w-full black text-black px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-black"
          />
          {loginError && (
            <p className="text-sm text-red-600 mb-3">{loginError}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Checking..." : "Enter"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-4 sm:px-8 pb-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-black">Feedback Messages</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Log out
          </button>
        </div>

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
                <span className="text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{item.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;