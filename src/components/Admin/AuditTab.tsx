import { useCallback, useEffect, useState } from "react";
import { fetchAuditLog, AdminAuditEntry } from "../../services/adminServices";

// Read-only view of the admin audit log. Every mutating admin action is
// recorded server-side by middleware/auditLog.js; GETs (including this one)
// are deliberately not recorded, so browsing the log never pollutes it.

const OUTCOME_STYLES: Record<AdminAuditEntry["outcome"], string> = {
  success: "bg-green-100 text-green-700",
  client_error: "bg-amber-100 text-amber-700",
  server_error: "bg-red-100 text-red-700",
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

function AuditRow({ entry }: { entry: AdminAuditEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        onClick={() => setExpanded((prev) => !prev)}
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
      >
        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
          {formatTime(entry.createdAt)}
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
            className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
              OUTCOME_STYLES[entry.outcome]
            }`}
          >
            {entry.statusCode}
          </span>
        </td>
        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
          {entry.durationMs != null ? `${entry.durationMs}ms` : "—"}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50 border-b border-gray-100">
          <td colSpan={6} className="px-3 py-3">
            <div className="grid gap-1 text-xs text-gray-600 mb-2">
              <div>
                <span className="text-gray-400">Request:</span> {entry.method} {entry.path}
              </div>
              <div>
                <span className="text-gray-400">IP:</span> {entry.ip ?? "—"}
              </div>
              <div>
                <span className="text-gray-400">Session:</span>{" "}
                {entry.actor.sessionId ?? "—"}
              </div>
              {entry.userAgent && (
                <div className="truncate">
                  <span className="text-gray-400">Agent:</span> {entry.userAgent}
                </div>
              )}
            </div>
            {/* Redacted server-side: code words, passwords and tokens are
                replaced before the row is written, and file buffers are
                summarised down to name/size/mimetype. */}
            <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-x-auto text-gray-700">
              {JSON.stringify(entry.summary, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

const AuditTab = ({ token }: { token: string }) => {
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
      setError(err instanceof Error ? err.message : "Failed to load audit log.");
    } finally {
      setLoading(false);
    }
  }, [token, page, action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-black">Admin audit log</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Every mutating admin action. Attribution comes from which code word was
            used, not a verified identity.
          </p>
        </div>
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="text-xs text-black border border-gray-300 rounded-lg px-2 py-1.5"
        >
          <option value="">All actions</option>
          {actions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          No entries yet — the log fills as admin actions are performed.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-200">
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Target</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Took</th>
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
          className="px-3 py-1.5 text-xs rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs text-gray-400">Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore || loading}
          className="px-3 py-1.5 text-xs rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AuditTab;
