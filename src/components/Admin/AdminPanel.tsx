import { useState, useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import FeedbackTab from "./FeedbackTab";
import PlayersTab from "./PlayersTab";
import StoryBuilderTab from "./StoryBuilder/StoryBuilderTab";
import AuditTab from "./AuditTab";
import { ADMIN_UNAUTHORIZED_EVENT } from "../../services/adminServices";
import { API_BASE as API_URL } from "../../services/apiClient";

const TOKEN_KEY = "admin_token";

type Tab = "feedback" | "players" | "story-builder" | "audit";

const TABS: { id: Tab; labelKey: string }[] = [
  { id: "feedback", labelKey: "admin.tabs.feedback" },
  { id: "players", labelKey: "admin.tabs.players" },
  { id: "story-builder", labelKey: "admin.tabs.storyBuilder" },
  { id: "audit", labelKey: "admin.tabs.audit" },
];

/** `initialTab` lets /admin/studio (the old Content Studio link) open the Story Builder directly. */
const AdminPanel = ({ initialTab = "feedback" }: { initialTab?: Tab }) => {
  const { t } = useTranslation("studio");
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(TOKEN_KEY)
  );
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    // A Story Builder link (?set=… or ?new) opens on the Story Builder tab.
    const search = new URLSearchParams(window.location.search);
    return search.has("set") || search.has("new") ? "story-builder" : initialTab;
  });
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
      setLoginError(t("admin.login.expired"));
    };
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, onExpired);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, onExpired);
  }, [t]);

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
        setLoginError(data.error ?? t("admin.login.tooMany"));
        return;
      }
      if (!res.ok) {
        setLoginError(data.error ?? t("admin.login.invalid"));
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setAdminName(data.admin ?? null);
    } catch (err) {
      console.error(err);
      setLoginError(t("admin.login.failed"));
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
        {/* See the note on the same tag in the authenticated return below. */}
        <meta name="robots" content="noindex, nofollow" />
        <form
          onSubmit={handleLogin}
          className="bg-white rounded-[3px] shadow-lg p-8 w-full max-w-sm"
        >
          <h1 className="text-xl font-bold text-black mb-4 text-center">
            {t("admin.login.title")}
          </h1>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("admin.login.placeholder")}
            required
            className="w-full black text-black px-3 py-2 border border-gray-300 rounded-[3px] mb-3 focus:outline-none focus:ring-2 focus:ring-black"
          />
          {loginError && (
            <p className="text-sm text-red-600 mb-3">{loginError}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-[3px] hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? t("admin.login.checking") : t("admin.login.enter")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-4 sm:px-8 pb-10">
      {/* /admin is listed as a public route in App.tsx, so it is reachable and
          therefore indexable. robots.txt disallows it, but Disallow only stops
          crawling — a URL linked from anywhere else can still be indexed
          without ever being fetched, and the resulting result line advertises
          that an admin panel exists here. This tag is what actually keeps it
          out of an index. React 19 hoists it into <head> on its own. */}
      <meta name="robots" content="noindex, nofollow" />
      {/* Wide on purpose. max-w-4xl is right for a settings page and wrong for
          a tool: the Story Builder is a two-pane workspace with a waveform in
          it, and 896px squeezed that into a third of a desktop screen. */}
      <div className="max-w-[1500px] mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black">{t("admin.title")}</h1>
            {adminName && (
              <p className="text-xs text-gray-500 mt-0.5">
                <Trans t={t} i18nKey="admin.actingAs" values={{ name: adminName }} components={{ b: <span className="font-semibold" /> }} />
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm rounded-[3px] text-gray-600 hover:bg-gray-200 transition-colors"
          >
            {t("admin.logOut")}
          </button>
        </div>

        <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-[3px] transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-black border border-b-0 border-gray-200"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              {t(tab.labelKey)}
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
