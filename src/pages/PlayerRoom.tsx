// pages/PlayerRoom.tsx — read-only visit to another player's Dream School.
//
// Kept at the same route and filename so existing links from the players list
// keep working; it renders the new dollhouse instead of the old 3D room.
//
// Read-only in the literal sense: SchoolScene is given no onSelectRoom, which
// makes every cell non-interactive. There is nothing to disable defensively
// because there is no control to press — the visitor sees exactly the rooms
// and furniture the owner has bought, which is what §11 of the plan asked for.

import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { SchoolScene } from "../modules/school/SchoolScene";
import { usePlayerSchool } from "../modules/players/usePlayerSchool";
import { SCHOOL_ROOMS } from "../config/schoolCatalog";

const PlayerRoom = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { school, character, nickname, loading, error } = usePlayerSchool(userId);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-dvh pt-14">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="flex justify-center items-center min-h-dvh pt-14 px-6 text-center text-black/50">
        {t("players.roomLoadFailed")}
      </div>
    );
  }

  return (
    <div className="min-h-dvh pt-13 bg-gradient-to-br from-indigo-50 via-violet-50 to-rose-50">
      <div className="mx-auto max-w-5xl px-3 py-3">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <button
            onClick={() => navigate("/players")}
            title={t("players.back")}
            className="flex items-center gap-1 text-xs font-semibold text-black/60 bg-white/70 hover:bg-white rounded-full px-3 py-1.5 transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            {t("players.back")}
          </button>
          <span className="text-sm font-bold text-black/80">{nickname}</span>
          <span className="text-xs text-black/45 ml-auto">
            {t("school.roomsOpen", {
              count: school.unlockedRoomIds.length,
              total: SCHOOL_ROOMS.length,
            })}
          </span>
        </div>

        <div className="rounded-2xl overflow-hidden border border-violet-200/70 shadow-sm bg-white">
          <SchoolScene
            unlockedRoomIds={school.unlockedRoomIds}
            placed={school.placed}
            ownedActionIds={school.ownedActionIds}
            focusedRoomId={school.focusedRoomId}
            character={character}
            // No onSelectRoom: this is a snapshot, not a playable board.
            lockedLabel={() => t("school.lockedShort")}
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerRoom;
