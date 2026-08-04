import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RoomScene } from "../modules/room/RoomScene";
import { ShopPanel } from "../modules/room/ShopPanel";
import { useRoomState } from "../modules/room/useRoomState";
import { useCharacter } from "../context/CharacterContext";
import { useWallet } from "../context/WalletContext";
import { CURRENCIES } from "../config/currencies";
import { SHOP_SLOTS, ShopItem, ShopSlot, SwatchShape, getItemsBySlot } from "../config/shopCatalog";
import {
  CHARACTER_SLOTS,
  CharacterItem,
  CharacterSlot,
  CharacterSwatchShape,
  getCharacterItemsBySlot,
} from "../config/characterCatalog";
import { SKIN_TONE_PRESETS } from "../modules/room/skinTonePresets";

const BitAwardIcon = CURRENCIES[0].icon;

const ROOM_SLOT_LABEL_KEYS: Record<ShopSlot, string> = {
  wallpaper: "room.slots.wallpaper",
  flooring: "room.slots.flooring",
  furniture1: "room.slots.furniture1",
  furniture2: "room.slots.furniture2",
  poster: "room.slots.poster",
  wardrobe: "room.slots.wardrobe",
  table: "room.slots.table",
  shelf: "room.slots.shelf",
};

const CHARACTER_SLOT_LABEL_KEYS: Record<CharacterSlot, string> = {
  hairstyle: "room.slots.hairstyle",
  outfit: "room.slots.outfit",
  hat: "room.slots.hat",
};

const ROOM_SHAPE_EMOJI: Record<SwatchShape, string> = {
  stripe: "🧱", dot: "🎀", solid: "🎨", plaid: "🏳️",
  wood: "🪵", tile: "◻️", carpet: "🟪", stone: "🪨",
  bed: "🛏️", bunkbed: "🛌", canopybed: "👑",
  plant: "🌿", rug: "🧺", cactus: "🌵", bookshelf: "📚", lamp: "💡",
  "poster-stars": "✨", "poster-map": "🗺️", "poster-music": "🎵", "poster-abstract": "🖼️",
  wardrobe: "🚪", table: "🍽️", shelf: "🗄️",
};

const CHARACTER_SHAPE_EMOJI: Record<CharacterSwatchShape, string> = {
  "hair-short": "💇", "hair-long": "💁", "hair-spiky": "🦔",
  "outfit-tee": "👕", "outfit-hoodie": "🧥", "outfit-overalls": "🥻",
  "hat-cap": "🧢", "hat-beanie": "🎩", "hat-wizard": "🪄",
};

function RoomSwatchPreview({ item }: { item: ShopItem }) {
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
      style={{ backgroundColor: item.swatch.color }}
    >
      <span>{ROOM_SHAPE_EMOJI[item.swatch.shape]}</span>
    </div>
  );
}

function CharacterSwatchPreview({ item }: { item: CharacterItem }) {
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
      style={{ backgroundColor: item.swatch.color }}
    >
      <span>{CHARACTER_SHAPE_EMOJI[item.swatch.shape]}</span>
    </div>
  );
}

const Room = () => {
  const { t } = useTranslation();
  const { wallet } = useWallet();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"room" | "character">(
    searchParams.get("tab") === "character" ? "character" : "room",
  );
  const { room, loading, error, buy, equip } = useRoomState();
  const {
    character,
    characterLoading,
    buy: buyCharacterItem,
    equip: equipCharacterItem,
    setSkinTone,
  } = useCharacter();

  if (loading || characterLoading) {
    return (
      <div className="flex justify-center items-center min-h-dvh pt-14">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (error || !room || !character) {
    return (
      <div className="flex justify-center items-center min-h-dvh pt-14 px-6 text-center text-black/50">
        {t("room.loadFailed")}
      </div>
    );
  }

  const bitAward = wallet?.bitAward ?? 0;

  return (
    <div className="flex flex-col landscape:flex-row h-dvh pt-13 overflow-hidden bg-gradient-to-br from-sky-50 to-amber-50">
      {/* Room view */}
      <div className="flex-1 landscape:w-3/5 landscape:flex-none min-h-0 relative flex flex-col">
        <div className="flex items-center justify-between gap-2 px-3 py-2 shrink-0">
          <button
            disabled
            title={t("room.upgradeComingSoon")}
            className="flex items-center gap-1.5 text-xs font-semibold text-black/40 bg-white/70 rounded-full px-3 py-1.5 cursor-not-allowed"
          >
            🏠 {t("room.upgradeBanner")}
          </button>
          <div className="flex items-center gap-1 text-sm font-bold text-amber-600 bg-white/70 rounded-full px-3 py-1.5">
            <BitAwardIcon size={14} />
            {bitAward}
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <RoomScene
            placedItems={room.placedItems}
            character={{ skinTone: character.skinTone, equipped: character.equipped }}
          />
        </div>
      </div>

      {/* Shop */}
      <div className="h-[40dvh] landscape:h-full landscape:w-2/5 landscape:flex-none shrink-0 border-t landscape:border-t-0 landscape:border-l border-black/5 flex flex-col">
        <div className="flex gap-1.5 px-3 pt-2 shrink-0">
          {(["room", "character"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                mode === m ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t(m === "room" ? "room.modeRoom" : "room.modeCharacter")}
            </button>
          ))}
        </div>

        {mode === "room" ? (
          <ShopPanel
            slots={SHOP_SLOTS}
            slotLabelKeys={ROOM_SLOT_LABEL_KEYS}
            getItemsBySlot={getItemsBySlot}
            ownedItemIds={room.ownedItemIds}
            equippedBySlot={room.placedItems}
            bitAward={bitAward}
            onBuy={buy}
            onEquip={equip}
            renderSwatch={(item) => <RoomSwatchPreview item={item} />}
          />
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-black/5 shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="text-[11px] font-semibold text-black/40 shrink-0">{t("room.skinTone")}</span>
              {SKIN_TONE_PRESETS.map((tone) => (
                <button
                  key={tone}
                  onClick={() => setSkinTone(tone)}
                  className={`w-6 h-6 rounded-full border-2 shrink-0 cursor-pointer ${
                    character.skinTone === tone ? "border-black" : "border-black/10"
                  }`}
                  style={{ backgroundColor: tone }}
                  aria-label={tone}
                />
              ))}
            </div>
            <ShopPanel
              slots={CHARACTER_SLOTS}
              slotLabelKeys={CHARACTER_SLOT_LABEL_KEYS}
              getItemsBySlot={getCharacterItemsBySlot}
              ownedItemIds={character.ownedItemIds}
              equippedBySlot={character.equipped}
              bitAward={bitAward}
              onBuy={buyCharacterItem}
              onEquip={equipCharacterItem}
              renderSwatch={(item) => <CharacterSwatchPreview item={item} />}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Room;
