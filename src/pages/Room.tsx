// pages/Room.tsx — the Dream School.
//
// Replaces the 3D office-decorating room entirely (see docs/room-game-concept.md).
// The route and filename stay "Room" so the navbar icon, App.tsx's lazy import
// and every existing link keep working; only what it renders changed.
//
// Two layouts, not one responsive compromise:
//
//   mobile   the building fills the screen edge to edge — no title, no coin
//            row, no hint text. Pinch to zoom, drag to pan, tap a room to
//            focus it, and one button on the right opens the shop as a sheet.
//            Balances live in that sheet, since the header that used to show
//            them is gone.
//   desktop  the previous two-column layout, where there is room for a header
//            and a permanently visible shop.

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IoDiamondOutline,
  IoBookmarkOutline,
  IoChatbubbleEllipsesOutline,
  IoCartOutline,
  IoClose,
} from "react-icons/io5";
import { SchoolScene } from "../modules/school/SchoolScene";
import { SchoolShop } from "../modules/school/SchoolShop";
import { PanZoom } from "../modules/school/PanZoom";
import { useSchoolState } from "../modules/school/useSchoolState";
import { useCharacter } from "../context/CharacterContext";
import { getSchoolRoom, SCHOOL_ROOMS } from "../config/schoolCatalog";

const WALLET_CHIPS = [
  { key: "bitAward" as const, Icon: IoDiamondOutline, cls: "bg-amber-50 text-amber-600" },
  { key: "bitWord" as const, Icon: IoBookmarkOutline, cls: "bg-sky-50 text-sky-600" },
  { key: "bitPhrase" as const, Icon: IoChatbubbleEllipsesOutline, cls: "bg-emerald-50 text-emerald-600" },
];

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
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  // The sheet covers the building, so a page behind it must not scroll under
  // the finger while the shop list is being scrolled.
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

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

  const shopLabels = {
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
  };

  const shop = (
    <SchoolShop
      school={school}
      wallet={wallet}
      focusedRoom={focusedRoom}
      busy={busy}
      onUnlockRoom={(id) => run(() => unlockRoom(id))}
      onBuyItem={(id) => run(() => buyItem(id))}
      onPlaceItem={(id) => run(() => placeItem(id))}
      onBuyAction={(id) => run(() => buyAction(id))}
      labels={shopLabels}
    />
  );

  const walletRow = (
    <div className="flex items-center gap-1.5">
      {WALLET_CHIPS.map(({ key, Icon, cls }) => (
        <span
          key={key}
          className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1 ${cls}`}
        >
          <Icon size={13} />
          {wallet[key]}
        </span>
      ))}
    </div>
  );

  const scene = (
    <SchoolScene
      unlockedRoomIds={school.unlockedRoomIds}
      placed={school.placed}
      ownedActionIds={school.ownedActionIds}
      focusedRoomId={school.focusedRoomId}
      character={character}
      onSelectRoom={(roomId) => run(() => focusRoom(roomId))}
      lockedLabel={(room) => `${room.unlockPriceBitAward} ${t("school.currency.bitAward")}`}
    />
  );

  return (
    <>
      {/* ── Mobile: the building, fullscreen ───────────────────────────── */}
      <div className="lg:hidden fixed left-0 right-0 bottom-0 top-13 bg-gradient-to-br from-indigo-50 via-violet-50 to-rose-50">
        <PanZoom className="w-full h-full">
          <div className="w-full h-full flex items-center justify-center">
            <SchoolScene
              unlockedRoomIds={school.unlockedRoomIds}
              placed={school.placed}
              ownedActionIds={school.ownedActionIds}
              focusedRoomId={school.focusedRoomId}
              character={character}
              onSelectRoom={(roomId) => run(() => focusRoom(roomId))}
              lockedLabel={(room) => `${room.unlockPriceBitAward} ${t("school.currency.bitAward")}`}
              className="w-full h-full"
            />
          </div>
        </PanZoom>

        {/* the one control: opens the shop for whichever room is focused */}
        {!sheetOpen && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={t("school.shop.open")}
            className="absolute right-3 bottom-6 h-13 w-13 rounded-full bg-violet-600 text-white shadow-lg shadow-violet-900/25 flex items-center justify-center active:scale-95 transition-transform"
          >
            <IoCartOutline size={22} />
          </button>
        )}
      </div>

      {/* ── Mobile: shop sheet ─────────────────────────────────────────── */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <button
            type="button"
            aria-label={t("school.shop.close")}
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative bg-white rounded-t-2xl shadow-2xl max-h-[80dvh] flex flex-col">
            <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0">
              {/* The header that used to carry balances is gone on mobile, so
                  they live here — you cannot judge a price without them. */}
              {walletRow}
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label={t("school.shop.close")}
                className="ml-auto text-gray-400 hover:text-gray-600 p-1"
              >
                <IoClose size={22} />
              </button>
            </div>
            {focusedRoom && (
              <div className="px-3 pb-2 text-[11px] text-black/45 shrink-0">
                {t("school.focusedHint", { room: focusedRoom.name })}
              </div>
            )}
            <div className="overflow-y-auto px-3 pb-4">{shop}</div>
          </div>
        </div>
      )}

      {/* ── Desktop ────────────────────────────────────────────────────── */}
      <div className="hidden lg:block min-h-dvh pt-13 bg-gradient-to-br from-indigo-50 via-violet-50 to-rose-50">
        <div className="mx-auto max-w-6xl px-3 py-3 flex gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div>
                <h1 className="text-lg font-bold text-black">{t("school.title")}</h1>
                <p className="text-xs text-black/50">
                  {t("school.roomsOpen", {
                    count: school.unlockedRoomIds.length,
                    total: SCHOOL_ROOMS.length,
                  })}
                </p>
              </div>
              {walletRow}
            </div>

            <div className="rounded-2xl overflow-hidden border border-violet-200/70 shadow-sm bg-white">
              {scene}
            </div>

            <p className="text-[11px] text-black/40 mt-2 text-center">{t("school.hint")}</p>
          </div>

          <div className="w-80 shrink-0">
            {shop}
            {focusedRoom && (
              <p className="text-[11px] text-black/40 mt-2 px-1">
                {t("school.focusedHint", { room: focusedRoom.name })}
              </p>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 inset-x-0 flex justify-center px-4 pointer-events-none z-50">
          <div className="bg-black/85 text-white text-sm rounded-full px-4 py-2 shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </>
  );
};

export default Room;
