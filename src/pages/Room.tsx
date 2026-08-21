// pages/Room.tsx — the Dream School.
//
// Replaces the 3D office-decorating room entirely (see docs/room-game-concept.md).
// The route and filename stay "Room" so the navbar icon, App.tsx's lazy import
// and every existing link keep working; only what it renders changed.
//
// The old page pulled in all of three.js through RoomScene. This one is inline
// SVG, so the lazy chunk that used to cost hundreds of kilobytes is now mostly
// this component plus its catalogue.

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoDiamondOutline, IoBookmarkOutline, IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { SchoolScene } from "../modules/school/SchoolScene";
import { SchoolShop } from "../modules/school/SchoolShop";
import { useSchoolState } from "../modules/school/useSchoolState";
import { useCharacter } from "../context/CharacterContext";
import { getSchoolRoom, SCHOOL_ROOMS } from "../config/schoolCatalog";

const Room = () => {
  const { t } = useTranslation();
  const { character, characterLoading } = useCharacter();
  const {
    school,
    wallet,
    loading,
    error,
    unlockRoom,
    buyItem,
    placeItem,
    buyAction,
    focusRoom,
  } = useSchoolState();

  // One in-flight mutation at a time. Every purchase is a server round-trip
  // that returns an authoritative wallet, so letting two overlap would show a
  // stale balance between them.
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const focusedRoom = useMemo(
    () => (school ? getSchoolRoom(school.focusedRoomId) : null),
    [school],
  );

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    if (busy) return;
    setBusy(true);
    const result = await fn();
    if (!result.ok && result.message) setToast(result.message);
    setBusy(false);
  };

  if (loading || characterLoading) {
    return (
      <div className="flex justify-center items-center min-h-dvh pt-14">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="flex justify-center items-center min-h-dvh pt-14 px-6 text-center text-black/50">
        {error ?? t("school.loadFailed")}
      </div>
    );
  }

  const unlockedCount = school.unlockedRoomIds.length;

  return (
    <div className="min-h-dvh pt-13 bg-gradient-to-br from-indigo-50 via-violet-50 to-rose-50">
      <div className="mx-auto max-w-6xl px-3 py-3 flex flex-col lg:flex-row gap-4">
        {/* ── Dollhouse ─────────────────────────────────────────────────── */}
        <div className="lg:flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div>
              <h1 className="text-lg font-bold text-black">{t("school.title")}</h1>
              <p className="text-xs text-black/50">
                {t("school.roomsOpen", { count: unlockedCount, total: SCHOOL_ROOMS.length })}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-600 rounded-full px-2.5 py-1">
                <IoDiamondOutline size={13} />
                {wallet.bitAward}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-sky-50 text-sky-600 rounded-full px-2.5 py-1">
                <IoBookmarkOutline size={13} />
                {wallet.bitWord}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-600 rounded-full px-2.5 py-1">
                <IoChatbubbleEllipsesOutline size={13} />
                {wallet.bitPhrase}
              </span>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-violet-200/70 shadow-sm bg-white">
            <SchoolScene
              unlockedRoomIds={school.unlockedRoomIds}
              placed={school.placed}
              ownedActionIds={school.ownedActionIds}
              focusedRoomId={school.focusedRoomId}
              character={character}
              onSelectRoom={(roomId) => run(() => focusRoom(roomId))}
              lockedLabel={(room) => `${room.unlockPriceBitAward} ${t("school.currency.bitAward")}`}
            />
          </div>

          <p className="text-[11px] text-black/40 mt-2 text-center">
            {t("school.hint")}
          </p>
        </div>

        {/* ── Shop ──────────────────────────────────────────────────────── */}
        <div className="lg:w-80 shrink-0">
          <SchoolShop
            school={school}
            wallet={wallet}
            focusedRoom={focusedRoom}
            busy={busy}
            onUnlockRoom={(id) => run(() => unlockRoom(id))}
            onBuyItem={(id) => run(() => buyItem(id))}
            onPlaceItem={(id) => run(() => placeItem(id))}
            onBuyAction={(id) => run(() => buyAction(id))}
            labels={{
              rooms: t("school.shop.rooms"),
              furniture: t("school.shop.furniture"),
              actions: t("school.shop.actions"),
              owned: t("school.shop.owned"),
              inUse: t("school.shop.inUse"),
              use: t("school.shop.use"),
              locked: t("school.shop.locked"),
              unlock: t("school.shop.unlock"),
              buy: t("school.shop.buy"),
              cantAfford: t("school.shop.cantAfford"),
              pickRoom: t("school.shop.pickRoom"),
            }}
          />

          {focusedRoom && (
            <p className="text-[11px] text-black/40 mt-2 px-1">
              {t("school.focusedHint", { room: focusedRoom.name })}
            </p>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 inset-x-0 flex justify-center px-4 pointer-events-none z-50">
          <div className="bg-black/85 text-white text-sm rounded-full px-4 py-2 shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
};

export default Room;
