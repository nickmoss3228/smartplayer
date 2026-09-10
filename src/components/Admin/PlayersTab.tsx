import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminPlayers,
  setPlayerBanned,
  logoutAllPlayerSessions,
  grantCurrency,
  AdminPlayer,
  AdminPlayerSharing,
} from "../../services/adminServices";
import PlayerProgressModal from "./PlayerProgressModal";

const DEBOUNCE_MS = 350;

// Three fields, one per currency. The backend has always accepted all three
// (POST /api/admin/grant-currency), but this form hardcoded bitWord and
// bitPhrase to 0, so only bitAward could ever be granted — which made the two
// Dream School currencies that gate furniture and actions untestable without
// curl.
const GRANT_FIELDS = [
  { key: "bitAward" as const, label: "Award", accent: "text-amber-600", ring: "focus:border-amber-400" },
  { key: "bitWord" as const, label: "Word", accent: "text-sky-600", ring: "focus:border-sky-400" },
  { key: "bitPhrase" as const, label: "Phrase", accent: "text-emerald-600", ring: "focus:border-emerald-400" },
];

type GrantAmounts = { bitAward: number; bitWord: number; bitPhrase: number };

// Three bands, not a raw number. A score of 47 invites the reader to treat the
// arithmetic as meaningful precision, which it is not — it is a heuristic whose
// weights were chosen by judgement (see sharingScore in backend
// config/sessions.js). Bands say only what the score can honestly support:
// ignore this, glance at this, look at this.
const SHARING_BANDS = [
  { min: 60, label: "Likely shared", className: "bg-red-100 text-red-700" },
  { min: 30, label: "Possibly shared", className: "bg-amber-100 text-amber-700" },
];

/**
 * The evidence behind the band, in plain terms, so an admin can judge it
 * rather than defer to it. Nothing here is a full IP — the backend only ever
 * stores /24 and /48 prefixes, and does not send even those.
 */
function SharingBadge({ sharing }: { sharing?: AdminPlayerSharing }) {
  // Absent on accounts that predate the session layer, and on any response
  // from a backend that hasn't deployed it yet.
  if (!sharing) return null;

  const band = SHARING_BANDS.find((b) => sharing.score >= b.min);
  if (!band) return null;

  const detail = [
    sharing.concurrentNetworks > 1
      ? `${sharing.activeNow} sessions active on ${sharing.concurrentNetworks} networks`
      : null,
    sharing.blockedLogins > 0 ? `${sharing.blockedLogins} logins hit the device cap` : null,
    `${sharing.distinctNetworks} networks seen recently`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      // A hover title rather than a modal: this is a hint an admin glances at
      // on the way to a decision, not a report they sit down to read.
      title={`${detail}\n\nA signal, not proof — students in one computer lab share a network legitimately.`}
      className={`text-xs rounded-full px-2 py-0.5 cursor-help ${band.className}`}
    >
      {band.label}
    </span>
  );
}

function GrantCurrencyForm({
  onGrant,
}: {
  onGrant: (amounts: GrantAmounts) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({
    bitAward: "0",
    bitWord: "0",
    bitPhrase: "0",
  });
  const [submitting, setSubmitting] = useState(false);

  const reset = () => setValues({ bitAward: "0", bitWord: "0", bitPhrase: "0" });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-amber-600 hover:text-amber-800 whitespace-nowrap"
      >
        Grant currency
      </button>
    );
  }

  const amounts: GrantAmounts = {
    bitAward: Number(values.bitAward) || 0,
    bitWord: Number(values.bitWord) || 0,
    bitPhrase: Number(values.bitPhrase) || 0,
  };
  // The server rejects an all-zero grant, so disable rather than round-trip it.
  const nothingToGrant = !amounts.bitAward && !amounts.bitWord && !amounts.bitPhrase;

  return (
    <form
      className="flex items-center gap-1.5 flex-wrap"
      onSubmit={async (e) => {
        e.preventDefault();
        if (nothingToGrant) return;
        setSubmitting(true);
        try {
          await onGrant(amounts);
          setOpen(false);
          reset();
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {GRANT_FIELDS.map((f, i) => (
        <label key={f.key} className="flex items-center gap-1">
          <span className={`text-[10px] font-semibold ${f.accent}`}>{f.label}</span>
          <input
            type="number"
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            className={`w-14 text-black px-1.5 py-0.5 border border-gray-300 rounded text-xs ${f.ring} outline-none`}
            autoFocus={i === 0}
          />
        </label>
      ))}
      <button
        type="submit"
        disabled={submitting || nothingToGrant}
        className="text-xs text-white bg-amber-500 hover:bg-amber-600 rounded px-2 py-0.5 disabled:opacity-50"
      >
        {submitting ? "..." : "Send"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          reset();
        }}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
    </form>
  );
}

const PlayersTab = ({ token }: { token: string }) => {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progressUserId, setProgressUserId] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage: number, q: string) => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchAdminPlayers(token, { q, page: nextPage });
        setPlayers((prev) => (nextPage === 1 ? data.players : [...prev, ...data.players]));
        setPage(data.page);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error(err);
        setError("Could not load players.");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => load(1, query), DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [query, load]);

  const handleToggleBan = async (player: AdminPlayer) => {
    try {
      const updated = await setPlayerBanned(token, player.id, !player.banned);
      setPlayers((prev) =>
        prev.map((p) => (p.id === player.id ? { ...p, banned: updated.banned } : p))
      );
    } catch (err) {
      console.error(err);
      setError("Could not update ban status.");
    }
  };

  const handleLogoutAll = async (player: AdminPlayer) => {
    // Confirmed because it is invisible and irreversible from here: every one
    // of this player's devices is signed out, and there is no undo beyond
    // asking them to log back in.
    if (!window.confirm(`Sign out all devices for ${player.nickname}?`)) return;
    try {
      await logoutAllPlayerSessions(token, player.id);
      // Sessions are gone, so nothing can be active and no login can currently
      // be blocked. Reflected locally rather than refetching the page, which
      // would reset the admin's scroll position mid-review.
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id
            ? { ...p, sharing: { ...p.sharing, activeNow: 0, concurrentNetworks: 0 } }
            : p
        )
      );
    } catch (err) {
      console.error(err);
      setError("Could not sign out that player's devices.");
    }
  };

  const handleGrant = async (
    playerId: string,
    amounts: { bitAward: number; bitWord: number; bitPhrase: number }
  ) => {
    try {
      const wallet = await grantCurrency(token, { userId: playerId, ...amounts });
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, wallet } : p)));
    } catch (err) {
      console.error(err);
      setError("Could not grant currency.");
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-black mb-4">Players</h2>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by username, nickname, or email..."
        className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black"
      />

      {error && <p className="text-red-600 mb-2">{error}</p>}
      {loading && players.length === 0 && <p className="text-gray-500">Loading...</p>}
      {!loading && players.length === 0 && !error && (
        <p className="text-gray-500">No players found.</p>
      )}

      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className="bg-white rounded-lg shadow p-3 border border-gray-200 flex flex-wrap items-center gap-3"
          >
            <div className="flex-1 min-w-[160px]">
              <div className="font-semibold text-black flex items-center gap-2">
                {player.nickname}
                {player.banned && (
                  <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5">
                    Banned
                  </span>
                )}
                <SharingBadge sharing={player.sharing} />
              </div>
              <div className="text-xs text-gray-500">{player.email}</div>
            </div>

            <div className="text-xs whitespace-nowrap flex items-center gap-2">
              <span className="text-amber-600 font-semibold">{player.wallet.bitAward}</span>
              <span className="text-sky-600 font-semibold">{player.wallet.bitWord}</span>
              <span className="text-emerald-600 font-semibold">{player.wallet.bitPhrase}</span>
            </div>

            <GrantCurrencyForm onGrant={(amounts) => handleGrant(player.id, amounts)} />

            <button
              onClick={() => setProgressUserId(player.id)}
              className="text-xs text-gray-600 hover:text-black"
            >
              View progress
            </button>

            <button
              onClick={() => handleLogoutAll(player)}
              className="text-xs text-gray-600 hover:text-black whitespace-nowrap"
            >
              Sign out devices
            </button>

            <button
              onClick={() => handleToggleBan(player)}
              className={`text-xs rounded px-2 py-1 whitespace-nowrap ${
                player.banned
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  : "bg-red-50 text-red-600 hover:bg-red-100"
              }`}
            >
              {player.banned ? "Unban" : "Ban"}
            </button>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => load(page + 1, query)}
            disabled={loading}
            className="text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}

      {progressUserId && (
        <PlayerProgressModal
          token={token}
          userId={progressUserId}
          onClose={() => setProgressUserId(null)}
        />
      )}
    </div>
  );
};

export default PlayersTab;
