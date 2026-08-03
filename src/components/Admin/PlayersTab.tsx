import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminPlayers,
  setPlayerBanned,
  grantCurrency,
  AdminPlayer,
} from "../../services/adminServices";
import PlayerProgressModal from "./PlayerProgressModal";

const DEBOUNCE_MS = 350;

function GrantCurrencyForm({
  onGrant,
}: {
  onGrant: (amounts: { bitAward: number; bitWord: number; bitPhrase: number }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [bitAward, setBitAward] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-amber-600 hover:text-amber-800"
      >
        Grant currency
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
          await onGrant({ bitAward: Number(bitAward) || 0, bitWord: 0, bitPhrase: 0 });
          setOpen(false);
          setBitAward("0");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <input
        type="number"
        value={bitAward}
        onChange={(e) => setBitAward(e.target.value)}
        className="w-16 text-black px-1.5 py-0.5 border border-gray-300 rounded text-xs"
        autoFocus
      />
      <button
        type="submit"
        disabled={submitting}
        className="text-xs text-white bg-amber-500 hover:bg-amber-600 rounded px-2 py-0.5 disabled:opacity-50"
      >
        {submitting ? "..." : "Send"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
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
              </div>
              <div className="text-xs text-gray-500">{player.email}</div>
            </div>

            <div className="text-xs text-gray-500 whitespace-nowrap">
              {player.wallet.bitAward} BitAward
            </div>

            <GrantCurrencyForm onGrant={(amounts) => handleGrant(player.id, amounts)} />

            <button
              onClick={() => setProgressUserId(player.id)}
              className="text-xs text-gray-600 hover:text-black"
            >
              View progress
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
