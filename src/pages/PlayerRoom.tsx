// pages/PlayerRoom.tsx — read-only visit to another player's Dream School.
//
// Kept at the same route and filename so existing links from the players list
// keep working; it renders the new isometric campus instead of the dollhouse.
//
// Read-only in the literal sense: SchoolCanvas is given interactive={false},
// which makes the people ignore taps and the chalkboard ignore them too. Pan
// and zoom stay on, because looking around IS the visit. What is deliberately
// missing is their vocabulary — the bubbles fall back to generic chatter, since
// which words somebody has learned is theirs, not a thing to browse.

import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { usePlayerSchool } from "../modules/players/usePlayerSchool";
import { MAX_STAGE, getStage } from "../config/schoolCatalog";

const SchoolCanvas = lazy(() =>
  import("../modules/school/SchoolCanvas").then((m) => ({ default: m.SchoolCanvas })),
);

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

  const stage = getStage(school.stage);

  return (
    <div className="fixed inset-x-0 top-13 bottom-0 overflow-hidden bg-[#d8ebf6]">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
          </div>
        }
      >
        <SchoolCanvas
          className="w-full h-full"
          school={school}
          character={character}
          learnedWords={[]}
          interactive={false}
        />
      </Suspense>

      <button
        onClick={() => navigate("/players")}
        title={t("players.back")}
        className="absolute left-3 top-3 flex items-center gap-1 text-xs font-semibold text-black/70 bg-white/90 backdrop-blur rounded-full pl-2 pr-3 py-2 shadow-sm active:scale-95 transition-transform"
      >
        <ChevronLeftIcon className="w-4 h-4" />
        {t("players.back")}
      </button>

      <div className="absolute right-3 top-3 bg-white/90 backdrop-blur rounded-full px-3.5 py-1.5 shadow-sm text-right pointer-events-none">
        <div className="text-[13px] font-bold text-black/80 leading-tight">{nickname}</div>
        <div className="text-[10px] font-semibold text-black/40 leading-tight">
          {t(`school.stages.${stage.id}.name`, stage.name)} · {t("school.stageOf", { current: stage.index + 1, total: MAX_STAGE + 1 })}
        </div>
      </div>
    </div>
  );
};

export default PlayerRoom;
