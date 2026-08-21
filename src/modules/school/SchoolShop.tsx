// modules/school/SchoolShop.tsx
//
// Three tabs, one per currency, because the plan gave each currency a distinct
// job and the shop should make that legible rather than hiding it behind a
// single mixed list:
//
//   Rooms     bitAward   — the long save
//   Furniture bitWord    — the steady spend, scoped to the focused room
//   Actions   bitPhrase  — the cheap flourish, scoped to the focused room
//
// Affordability is computed from the wallet the server last returned, so a
// button is only enabled when the purchase will actually succeed.

import { useMemo, useState } from "react";
import { IoDiamondOutline, IoBookmarkOutline, IoChatbubbleEllipsesOutline, IoCheckmarkCircle } from "react-icons/io5";
import { SpritePreview } from "./sprites";
import {
  SCHOOL_ROOMS,
  SCHOOL_SLOTS,
  SchoolRoom,
  SchoolSlotId,
  getActionsByRoom,
  getItemsBySlot,
  placementKey,
} from "../../config/schoolCatalog";
import { SchoolState, WalletBalances } from "../../services/schoolServices";

type Tab = "rooms" | "furniture" | "actions";

interface SchoolShopProps {
  school: SchoolState;
  wallet: WalletBalances;
  focusedRoom: SchoolRoom | null;
  busy: boolean;
  onUnlockRoom: (roomId: string) => void;
  onBuyItem: (itemId: string) => void;
  onPlaceItem: (itemId: string) => void;
  onBuyAction: (actionId: string) => void;
  labels: {
    rooms: string;
    furniture: string;
    actions: string;
    owned: string;
    inUse: string;
    use: string;
    locked: string;
    unlock: string;
    buy: string;
    cantAfford: string;
    pickRoom: string;
  };
}

const TAB_META: Record<Tab, { icon: typeof IoDiamondOutline; accent: string }> = {
  rooms: { icon: IoDiamondOutline, accent: "text-amber-600" },
  furniture: { icon: IoBookmarkOutline, accent: "text-sky-600" },
  actions: { icon: IoChatbubbleEllipsesOutline, accent: "text-emerald-600" },
};

const Price = ({
  amount,
  Icon,
  className,
}: {
  amount: number;
  Icon: typeof IoDiamondOutline;
  className: string;
}) => (
  <span className={`inline-flex items-center gap-1 text-xs font-bold ${className}`}>
    <Icon size={13} />
    {amount}
  </span>
);

export const SchoolShop = ({
  school,
  wallet,
  focusedRoom,
  busy,
  onUnlockRoom,
  onBuyItem,
  onPlaceItem,
  onBuyAction,
  labels,
}: SchoolShopProps) => {
  const [tab, setTab] = useState<Tab>("rooms");

  const unlocked = useMemo(() => new Set(school.unlockedRoomIds), [school.unlockedRoomIds]);
  const ownedItems = useMemo(() => new Set(school.ownedItemIds), [school.ownedItemIds]);
  const ownedActions = useMemo(() => new Set(school.ownedActionIds), [school.ownedActionIds]);

  const lockedRooms = SCHOOL_ROOMS.filter((r) => !unlocked.has(r.id));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-200">
        {(Object.keys(TAB_META) as Tab[]).map((key) => {
          const { icon: Icon, accent } = TAB_META[key];
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                active ? `${accent} border-b-2 border-current bg-gray-50` : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon size={15} />
              {labels[key]}
            </button>
          );
        })}
      </div>

      <div className="p-3 max-h-[26rem] overflow-y-auto">
        {/* ── Rooms ─────────────────────────────────────────────────────── */}
        {tab === "rooms" && (
          <div className="space-y-2">
            {lockedRooms.length === 0 && (
              <p className="text-sm text-gray-500 py-6 text-center">
                Every room is open. The school is complete.
              </p>
            )}
            {lockedRooms.map((room) => {
              const afford = wallet.bitAward >= room.unlockPriceBitAward;
              return (
                <div
                  key={room.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-black truncate">{room.name}</div>
                    <Price amount={room.unlockPriceBitAward} Icon={IoDiamondOutline} className="text-amber-600" />
                  </div>
                  <button
                    type="button"
                    disabled={!afford || busy}
                    onClick={() => onUnlockRoom(room.id)}
                    className="text-xs font-semibold rounded-lg px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {afford ? labels.unlock : labels.cantAfford}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Furniture ─────────────────────────────────────────────────── */}
        {tab === "furniture" && (
          <>
            {!focusedRoom ? (
              <p className="text-sm text-gray-500 py-6 text-center">{labels.pickRoom}</p>
            ) : (
              <div className="space-y-4">
                {focusedRoom.slots.map((slotId: SchoolSlotId) => {
                  const placedId = school.placed[placementKey(focusedRoom.id, slotId)];
                  return (
                    <div key={slotId}>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                        {SCHOOL_SLOTS[slotId].label}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {getItemsBySlot(slotId).map((item) => {
                          const owned = ownedItems.has(item.id);
                          const inUse = placedId === item.id;
                          const afford = wallet.bitWord >= item.priceBitWord;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={busy || (!owned && !afford)}
                              onClick={() => (owned ? onPlaceItem(item.id) : onBuyItem(item.id))}
                              title={item.name}
                              className={`relative rounded-xl border p-2 flex flex-col items-center gap-1 transition-colors ${
                                inUse
                                  ? "border-sky-500 bg-sky-50"
                                  : "border-gray-200 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                              }`}
                            >
                              {inUse && (
                                <IoCheckmarkCircle
                                  size={15}
                                  className="absolute top-1 right-1 text-sky-500"
                                />
                              )}
                              <SpritePreview
                                slot={slotId}
                                palette={item.palette}
                                variant={item.variant}
                                size={40}
                              />
                              <span className="text-[10px] font-medium text-gray-600 leading-tight text-center line-clamp-2">
                                {item.name}
                              </span>
                              {owned ? (
                                <span className="text-[10px] font-semibold text-sky-600">
                                  {inUse ? labels.inUse : labels.use}
                                </span>
                              ) : (
                                <Price
                                  amount={item.priceBitWord}
                                  Icon={IoBookmarkOutline}
                                  className="text-sky-600"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        {tab === "actions" && (
          <>
            {!focusedRoom ? (
              <p className="text-sm text-gray-500 py-6 text-center">{labels.pickRoom}</p>
            ) : (
              <div className="space-y-2">
                {getActionsByRoom(focusedRoom.id).map((action) => {
                  const owned = ownedActions.has(action.id);
                  const afford = wallet.bitPhrase >= action.priceBitPhrase;
                  return (
                    <div
                      key={action.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-black truncate">{action.name}</div>
                        {!owned && (
                          <Price
                            amount={action.priceBitPhrase}
                            Icon={IoChatbubbleEllipsesOutline}
                            className="text-emerald-600"
                          />
                        )}
                      </div>
                      {owned ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 shrink-0">
                          <IoCheckmarkCircle size={15} />
                          {labels.owned}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!afford || busy}
                          onClick={() => onBuyAction(action.id)}
                          className="text-xs font-semibold rounded-lg px-3 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                          {afford ? labels.buy : labels.cantAfford}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
