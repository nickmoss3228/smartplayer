import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { CURRENCIES } from "../../config/currencies";

const BitAwardIcon = CURRENCIES[0].icon;

interface CosmeticItem {
  id: string;
  name: string;
  priceBitAward: number;
}

// Generic over which catalog it's shopping — Room decor (ShopSlot/ShopItem)
// and Character customization (CharacterSlot/CharacterItem) both plug into
// this same tabbed-tile-grid/buy-confirm UI, just with different slot unions,
// catalogs, and swatch rendering supplied by the caller.
interface ShopPanelProps<TSlot extends string, TItem extends CosmeticItem & { slot: TSlot }> {
  slots: TSlot[];
  slotLabelKeys: Record<TSlot, string>;
  getItemsBySlot: (slot: TSlot) => TItem[];
  ownedItemIds: string[];
  equippedBySlot: Record<TSlot, string | null>;
  bitAward: number;
  onBuy: (itemId: string) => Promise<{ ok: boolean; message?: string }>;
  onEquip: (itemId: string) => Promise<{ ok: boolean; message?: string }>;
  renderSwatch: (item: TItem) => ReactNode;
}

export function ShopPanel<TSlot extends string, TItem extends CosmeticItem & { slot: TSlot }>({
  slots,
  slotLabelKeys,
  getItemsBySlot,
  ownedItemIds,
  equippedBySlot,
  bitAward,
  onBuy,
  onEquip,
  renderSwatch,
}: ShopPanelProps<TSlot, TItem>) {
  const { t } = useTranslation();
  const [activeSlot, setActiveSlot] = useState<TSlot>(slots[0]);
  const [confirmItem, setConfirmItem] = useState<TItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const items = getItemsBySlot(activeSlot);

  const openConfirm = (item: TItem) => {
    setErrorMsg(null);
    setConfirmItem(item);
  };

  const confirmPurchase = async () => {
    if (!confirmItem) return;
    setPendingId(confirmItem.id);
    const result = await onBuy(confirmItem.id);
    setPendingId(null);
    if (result.ok) {
      setConfirmItem(null);
    } else {
      setErrorMsg(result.message ?? t("room.purchaseFailed"));
    }
  };

  // Owned items are never re-purchased — tapping one just swaps it back into
  // its slot (free, instant). Only unowned items go through the buy-confirm flow.
  const handleTileTap = async (item: TItem, owned: boolean, equipped: boolean) => {
    if (!owned) {
      openConfirm(item);
      return;
    }
    if (equipped) return;
    setErrorMsg(null);
    setPendingId(item.id);
    const result = await onEquip(item.id);
    setPendingId(null);
    if (!result.ok) {
      setErrorMsg(result.message ?? t("room.equipFailed"));
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex gap-1.5 overflow-x-auto px-3 pt-2 pb-2 border-b border-black/5 shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slots.map((slot) => (
          <button
            key={slot}
            onClick={() => setActiveSlot(slot)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeSlot === slot ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t(slotLabelKeys[slot])}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-3 sm:grid-cols-4 gap-3 content-start [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const owned = ownedItemIds.includes(item.id);
          const equipped = equippedBySlot[item.slot] === item.id;
          const affordable = bitAward >= item.priceBitAward;

          return (
            <button
              key={item.id}
              onClick={() => handleTileTap(item, owned, equipped)}
              disabled={equipped || pendingId === item.id}
              className={`relative flex flex-col items-center gap-1 rounded-2xl p-2 border transition-all cursor-pointer disabled:cursor-default ${
                equipped
                  ? "border-emerald-400 ring-2 ring-emerald-300 bg-emerald-50"
                  : owned
                  ? "border-black/10 bg-white hover:border-black/30"
                  : affordable
                  ? "border-black/10 bg-white hover:border-black/30"
                  : "border-black/5 bg-gray-50 opacity-60"
              } ${pendingId === item.id ? "opacity-50" : ""}`}
            >
              {renderSwatch(item)}
              <span className="text-[11px] font-medium text-black/70 text-center leading-tight line-clamp-1">
                {item.name}
              </span>
              {!owned && (
                <span
                  className={`flex items-center gap-0.5 text-[11px] font-bold ${
                    affordable ? "text-amber-600" : "text-black/30"
                  }`}
                >
                  <BitAwardIcon size={11} />
                  {item.priceBitAward}
                </span>
              )}
              {owned && !equipped && (
                <span className="text-[11px] font-semibold text-emerald-600">
                  {t("room.equip")}
                </span>
              )}
              {equipped && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {errorMsg && !confirmItem && (
        <div className="mx-3 mb-2 rounded-lg bg-red-50 text-red-600 text-xs px-3 py-2 shrink-0">
          {errorMsg}
        </div>
      )}

      {confirmItem && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmItem(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-black/50 mb-1">{t("room.confirmBuyTitle")}</p>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-1.5">
              {confirmItem.name}
              <span className="text-amber-600 flex items-center gap-0.5 text-base">
                <BitAwardIcon size={16} /> {confirmItem.priceBitAward}
              </span>
            </h3>
            {bitAward < confirmItem.priceBitAward && (
              <p className="text-sm text-red-500 mb-3">{t("room.insufficientFunds")}</p>
            )}
            {errorMsg && (
              <p className="text-sm text-red-500 mb-3">{errorMsg}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium cursor-pointer hover:bg-gray-50"
              >
                {t("room.cancel")}
              </button>
              <button
                onClick={confirmPurchase}
                disabled={bitAward < confirmItem.priceBitAward || pendingId === confirmItem.id}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-40 cursor-pointer hover:opacity-90"
              >
                {t("room.confirmBuy")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
