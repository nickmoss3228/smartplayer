import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchAuditLog, AdminAuditEntry } from "../../services/adminServices";

// Read-only view of the admin audit log. Every mutating admin action is
// recorded server-side by middleware/auditLog.js; GETs (including this one)
// are deliberately not recorded, so browsing the log never pollutes it.

const OUTCOME_STYLES: Record<AdminAuditEntry["outcome"], string> = {
  success: "bg-green-100 text-green-700",
  client_error: "bg-amber-100 text-amber-700",
  server_error: "bg-red-100 text-red-700",
};

const formatTime = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

function AuditRow({ entry }: { entry: AdminAuditEntry }) {
  const { t, i18n } = useTranslation("studio");
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        onClick={() => setExpanded((prev) => !prev)}
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
      >
        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
          {formatTime(entry.createdAt, i18n.language)}
        </td>
        <td className="px-3 py-2 font-semibold text-black">{entry.actor.name}</td>
        <td className="px-3 py-2 text-black">{entry.action}</td>
        <td className="px-3 py-2 text-gray-600">
          {entry.targetType ? (
            <span title={entry.targetId ?? ""}>
              {entry.targetType}:{(entry.targetId ?? "").slice(0, 10)}
              {(entry.targetId ?? "").length > 10 ? "…" : ""}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
        <td className="px-3 py-2">
          <span
            className={`px-1.5 py-0.5 rounded-[3px] text-xs font-semibold ${
              OUTCOME_STYLES[entry.outcome]
            }`}
          >
            {entry.statusCode}
          </span>
        </td>
        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
          {entry.durationMs != null ? t("audit.ms", { n: entry.durationMs }) : "—"}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50 border-b border-gray-100">
          <td colSpan={6} className="px-3 py-3">
            <div className="grid gap-1 text-xs text-gray-600 mb-2">
              <div>
                <span className="text-gray-400">{t("audit.detail.request")}</span> {entry.method} {entry.path}
              </div>
              <div>
                <span className="text-gray-400">{t("audit.detail.ip")}</span> {entry.ip ?? "—"}
              </div>
              <div>
                <span className="text-gray-400">{t("audit.detail.session")}</span>{" "}
                {entry.actor.sessionId ?? "—"}
              </div>
              {entry.userAgent && (
                <div className="truncate">
                  <span className="text-gray-400">{t("audit.detail.agent")}</span> {entry.userAgent}
                </div>
              )}
            </div>
            {/* Redacted server-side: code words, passwords and tokens are
                replaced before the row is written, and file buffers are
                summarised down to name/size/mimetype. */}
            <pre className="text-xs bg-white border border-gray-200 rounded-[3px] p-2 overflow-x-auto text-gray-700">
              {JSON.stringify(entry.summary, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

const AuditTab = ({ token }: { token: string }) => {
  const { t } = useTranslation("studio");
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAuditLog(token, { page, action });
      setEntries(data.entries);
      setHasMore(data.hasMore);
      // The distinct list comes from the whole collection, not the current
      // page, so keep it even while a filter is narrowing the rows.
      if (data.actions?.length) setActions(data.actions);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("audit.loadError"));
    } finally {
      setLoading(false);
    }
  }, [token, page, action, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-white rounded-[3px] border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-black">{t("audit.title")}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {t("audit.hint")}
          </p>
        </div>
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="text-xs text-black border border-gray-300 rounded-[3px] px-2 py-1.5"
        >
          <option value="">{t("audit.allActions")}</option>
          {actions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400 py-6 text-center">{t("audit.loading")}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          {t("audit.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-200">
                <th className="px-3 py-2 font-medium">{t("audit.cols.time")}</th>
                <th className="px-3 py-2 font-medium">{t("audit.cols.actor")}</th>
                <th className="px-3 py-2 font-medium">{t("audit.cols.action")}</th>
                <th className="px-3 py-2 font-medium">{t("audit.cols.target")}</th>
                <th className="px-3 py-2 font-medium">{t("audit.cols.status")}</th>
                <th className="px-3 py-2 font-medium">{t("audit.cols.took")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <AuditRow key={entry._id} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          className="px-3 py-1.5 text-xs rounded-[3px] text-gray-600 hover:bg-gray-100 disabled:opacity-40"
        >
          {t("audit.previous")}
        </button>
        <span className="text-xs text-gray-400">{t("audit.page", { page })}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore || loading}
          className="px-3 py-1.5 text-xs rounded-[3px] text-gray-600 hover:bg-gray-100 disabled:opacity-40"
        >
          {t("audit.next")}
        </button>
      </div>
    </div>
  );
};

export default AuditTab;
