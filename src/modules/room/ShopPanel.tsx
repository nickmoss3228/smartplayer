import { ReactNode, useEffect, useState } from "react";
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
// this same tabbed-tile-grid/preview-basket UI, just with different slot
// unions, catalogs, and swatch rendering supplied by the caller.
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
  // Reports the caller's currently-previewed (unowned, not-yet-bought) item
  // per slot so the 3D scene can render it live without actually buying it.
  // Keyed by slot so at most one preview exists per slot, same shape as
  // equippedBySlot/placedItems.
  onPreviewChange?: (bySlot: Partial<Record<TSlot, string>>) => void;
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
  onPreviewChange,
}: ShopPanelProps<TSlot, TItem>) {
  const { t } = useTranslation();
  const [activeSlot, setActiveSlot] = useState<TSlot>(slots[0]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // The "basket" — unowned items the player has tapped to preview live in the
  // scene, at most one per slot, not yet purchased.
  const [previewItems, setPreviewItems] = useState<TItem[]>([]);
  const [buyingAll, setBuyingAll] = useState(false);

  const items = getItemsBySlot(activeSlot);
  const previewTotal = previewItems.reduce((sum, i) => sum + i.priceBitAward, 0);

  useEffect(() => {
    onPreviewChange?.(
      Object.fromEntries(previewItems.map((i) => [i.slot, i.id])) as Partial<Record<TSlot, string>>,
    );
    // Only the ids/slots matter to the caller — re-run whenever the basket
    // contents actually change, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewItems]);

  // Unowned items are tapped to toggle a live preview instead of buying
  // immediately — tapping the same item again removes it from the basket.
  // Only one preview per slot: picking a new item in an already-previewed
  // slot swaps it out.
  const togglePreview = (item: TItem) => {
    setErrorMsg(null);
    setPreviewItems((prev) => {
      if (prev.some((p) => p.id === item.id)) {
        return prev.filter((p) => p.id !== item.id);
      }
      return [...prev.filter((p) => p.slot !== item.slot), item];
    });
  };

  const removeFromPreview = (itemId: string) => {
    setPreviewItems((prev) => prev.filter((p) => p.id !== itemId));
  };

  const buyAllPreviewed = async () => {
    setErrorMsg(null);
    setBuyingAll(true);
    for (const item of previewItems) {
      setPendingId(item.id);
      const result = await onBuy(item.id);
      if (!result.ok) {
        setErrorMsg(result.message ?? t("room.purchaseFailed"));
        setPendingId(null);
        setBuyingAll(false);
        return; // stop here — leave the rest in the basket so the user can retry
      }
      setPreviewItems((prev) => prev.filter((p) => p.id !== item.id));
    }
    setPendingId(null);
    setBuyingAll(false);
  };

  // Owned items are never re-purchased — tapping one just swaps it back into
  // its slot (free, instant). Unowned items toggle the live preview instead.
  const handleTileTap = async (item: TItem, owned: boolean, equipped: boolean) => {
    if (!owned) {
      togglePreview(item);
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

      <div className="flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-3 sm:grid-cols-4 gap-3 content-start [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const owned = ownedItemIds.includes(item.id);
          const equipped = equippedBySlot[item.slot] === item.id;
          const affordable = bitAward >= item.priceBitAward;
          const previewing = !owned && previewItems.some((p) => p.id === item.id);

          return (
            <button
              key={item.id}
              onClick={() => handleTileTap(item, owned, equipped)}
              disabled={equipped || pendingId === item.id}
              className={`relative flex flex-col items-center gap-1 rounded-2xl p-2 border transition-all cursor-pointer disabled:cursor-default ${
                equipped
                  ? "border-emerald-400 ring-2 ring-emerald-300 bg-emerald-50"
                  : previewing
                  ? "border-amber-400 border-dashed ring-2 ring-amber-200 bg-amber-50"
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
              {previewing && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                  👁
                </span>
              )}
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="mx-3 mb-2 rounded-lg bg-red-50 text-red-600 text-xs px-3 py-2 shrink-0">
          {errorMsg}
        </div>
      )}

      {previewItems.length > 0 && (
        <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-semibold text-amber-700">
              {t("room.basketTitle", { count: previewItems.length })}
            </span>
            <span className="flex items-center gap-0.5 text-xs font-bold text-amber-700">
              <BitAwardIcon size={12} /> {previewTotal}
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {previewItems.map((item) => (
              <span
                key={item.id}
                className="flex items-center gap-1 bg-white border border-amber-200 rounded-full pl-2 pr-1 py-1 text-[11px] font-medium text-black/70 whitespace-nowrap shrink-0"
              >
                {item.name}
                <button
                  onClick={() => removeFromPreview(item.id)}
                  aria-label={t("room.clearPreviewItem")}
                  className="w-4 h-4 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={buyAllPreviewed}
            disabled={buyingAll || bitAward < previewTotal}
            className="w-full py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-40 cursor-pointer hover:opacity-90"
          >
            {bitAward < previewTotal ? t("room.insufficientFunds") : t("room.buyAllPreview")}
          </button>
        </div>
      )}
    </div>
  );
}
