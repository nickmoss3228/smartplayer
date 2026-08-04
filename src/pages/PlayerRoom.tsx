import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { RoomScene } from "../modules/room/RoomScene";
import { usePlayerRoom } from "../modules/players/usePlayerRoom";
import { useCharacterPortrait } from "../modules/room/useCharacterPortrait";

const PlayerRoom = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { data, loading, error } = usePlayerRoom(userId);
  const portrait = useCharacterPortrait(data?.character);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-dvh pt-14">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex justify-center items-center min-h-dvh pt-14 px-6 text-center text-black/50">
        {t("players.roomLoadFailed")}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh pt-13 overflow-hidden bg-gradient-to-br from-sky-50 to-amber-50">
      <div className="flex items-center gap-3 px-3 py-2 shrink-0">
        <button
          onClick={() => navigate("/players")}
          title={t("players.back")}
          className="flex items-center gap-1 text-xs font-semibold text-black/60 bg-white/70 hover:bg-white rounded-full px-3 py-1.5 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          {t("players.back")}
        </button>
        <div className="flex items-center gap-2">
          <img
            src={portrait}
            alt={data.nickname}
            className="w-7 h-7 rounded-full object-cover bg-white"
          />
          <span className="text-sm font-bold text-black/80">
            {data.nickname}
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <RoomScene
          placedItems={data.room.placedItems}
          placement={data.room.placement}
          lightsOn={data.room.lightsOn}
          // getPlayerRoom doesn't expose another user's achievement stats
          // (privacy — same reasoning as the rest of this read-only view),
          // so a visited room never shows trophies, only the owner's own does.
          achievements={[]}
          // Read-only view — arrange mode (and its rotate/drag affordances)
          // is only for your own room.
          arrangeMode={false}
          onMoveFloorItem={() => {}}
          onMoveWallItem={() => {}}
          rotateLabel=""
          character={{ skinTone: data.character.skinTone, equipped: data.character.equipped }}
        />
      </div>
    </div>
  );
};

export default PlayerRoom;
