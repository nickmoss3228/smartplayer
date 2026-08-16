import { useState, useEffect } from "react";
import FeedbackTab from "./FeedbackTab";
import PlayersTab from "./PlayersTab";
import StoryBuilderTab from "./StoryBuilder/StoryBuilderTab";
import AuditTab from "./AuditTab";
import { ADMIN_UNAUTHORIZED_EVENT } from "../../services/adminServices";
import { API_BASE as API_URL } from "../../services/apiClient";

const TOKEN_KEY = "admin_token";

type Tab = "feedback" | "players" | "story-builder" | "audit";

const TABS: { id: Tab; label: string }[] = [
  { id: "feedback", label: "Feedback" },
  { id: "players", label: "Players" },
  { id: "story-builder", label: "Story Builder" },
  { id: "audit", label: "Audit Log" },
];

const AdminPanel = () => {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(TOKEN_KEY)
  );
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("feedback");
  // Set by adminLogin's response so the header can show which code word is in
  // use — the same name the audit log attributes actions to.
  const [adminName, setAdminName] = useState<string | null>(null);


  // The 12h admin token expiring used to leave the panel rendered but broken.
  // parseOrThrow in adminServices fires this on any 401 so we can drop straight
  // back to the code-word form instead.
  useEffect(() => {
    const onExpired = () => {
      setToken(null);
      setCode("");
      setAdminName(null);
      setLoginError("Session expired. Enter the code word again.");
    };
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, onExpired);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, onExpired);
  }, []);

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
      if (res.status === 429) {
        // The login endpoint is throttled to 5 failed attempts per 15 minutes
        // (backend middleware/rateLimit.js) — say so rather than looking broken.
        setLoginError(data.error ?? "Too many attempts. Try again in 15 minutes.");
        return;
      }
      if (!res.ok) {
        setLoginError(data.error ?? "Invalid code word.");
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setAdminName(data.admin ?? null);
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
    setAdminName(null);
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
          <div>
            <h1 className="text-2xl font-bold text-black">Admin Panel</h1>
            {adminName && (
              <p className="text-xs text-gray-500 mt-0.5">
                Acting as <span className="font-semibold">{adminName}</span> — actions
                are recorded in the audit log
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Log out
          </button>
        </div>

        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-black border border-b-0 border-gray-200"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "feedback" && <FeedbackTab token={token} />}
        {activeTab === "players" && <PlayersTab token={token} />}
        {activeTab === "story-builder" && <StoryBuilderTab token={token} />}
        {activeTab === "audit" && <AuditTab token={token} />}
      </div>
    </div>
  );
};

export default AdminPanel;
  