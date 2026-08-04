import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { usePlayerSearch, SEARCH_MIN_LENGTH } from "../modules/players/usePlayerSearch";
import { PlayerListItem } from "../services/profileServices";
import { useCharacterPortrait } from "../modules/room/useCharacterPortrait";

function PlayerCard({
  player,
  onClick,
}: {
  player: PlayerListItem;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const portrait = useCharacterPortrait(player.character);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 bg-white/70 hover:bg-white rounded-2xl p-4 shadow-sm transition-colors"
    >
      <div className="relative">
        <img
          src={portrait}
          alt={player.nickname}
          className="w-16 h-16 rounded-full object-cover bg-white"
        />
        <span
          title={t(player.online ? "players.online" : "players.offline")}
          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
            player.online ? "bg-green-500" : "bg-gray-300"
          }`}
        />
      </div>
      <span className="text-sm font-semibold text-black/80 truncate max-w-full">
        {player.nickname}
      </span>
      <span className="text-xs font-medium text-amber-600">
        {t("players.visit")}
      </span>
    </button>
  );
}

const Players = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { query, setQuery, players, loading, error, searched } = usePlayerSearch();

  const showHint = query.trim().length < SEARCH_MIN_LENGTH;
  const showEmpty = !showHint && searched && !loading && !error && players.length === 0;

  return (
    <div className="min-h-dvh pt-16 pb-10 px-4 bg-gradient-to-br from-sky-50 to-amber-50">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-bold text-black/80 mb-4">
          {t("players.title")}
        </h1>

        <div className="relative mb-6">
          <MagnifyingGlassIcon className="w-5 h-5 text-black/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("players.searchPlaceholder")}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 shadow-sm border border-black/5 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
            autoFocus
          />
        </div>

        {showHint && (
          <p className="text-center text-black/40 text-sm mt-6">
            {t("players.searchHint")}
          </p>
        )}

        {!showHint && loading && (
          <div className="flex justify-center mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        )}

        {!showHint && error && (
          <p className="text-center text-black/50 text-sm mt-6">
            {t("players.loadFailed")}
          </p>
        )}

        {showEmpty && (
          <p className="text-center text-black/40 text-sm mt-6">
            {t("players.noResults")}
          </p>
        )}

        {!showHint && !loading && !error && players.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onClick={() => navigate(`/players/${player.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Players;
