import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RoomScene, RoomAchievementTrophy } from "../modules/room/RoomScene";
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
import { FloorSlotKey, WallSlotKey } from "../config/roomLayout";
import { ACHIEVEMENT_CATEGORIES, getEarnedTiers } from "../config/achievementsConfig";
import { fetchAchievements } from "../services/achievementServices";
import { getTotalListeningSeconds } from "../hooks/useListeningTimer";

const BitAwardIcon = CURRENCIES[0].icon;

const ROOM_SLOT_LABEL_KEYS: Record<ShopSlot, string> = {
  wallpaper: "room.slots.wallpaper",
  flooring: "room.slots.flooring",
  furniture1: "room.slots.furniture1",
  chair: "room.slots.chair",
  furniture2: "room.slots.furniture2",
  poster: "room.slots.poster",
  wardrobe: "room.slots.wardrobe",
  table: "room.slots.table",
  shelf: "room.slots.shelf",
  window: "room.slots.window",
};

const CHARACTER_SLOT_LABEL_KEYS: Record<CharacterSlot, string> = {
  hairstyle: "room.slots.hairstyle",
  outfit: "room.slots.outfit",
  hat: "room.slots.hat",
};

const ROOM_SHAPE_EMOJI: Record<SwatchShape, string> = {
  stripe: "🧱", dot: "🎀", solid: "🎨", plaid: "🏳️",
  wood: "🪵", tile: "◻️", carpet: "🟪", stone: "🪨",
  "desk-basic": "🖥️", "desk-office": "💻", "desk-executive": "🖥️",
  "chair-basic": "🪑", "chair-office": "🪑", "chair-ergonomic": "🪑",
  plant: "🌿", rug: "🧺", cactus: "🌵", bookshelf: "📚", lamp: "💡",
  "poster-stars": "✨", "poster-map": "🗺️", "poster-music": "🏆", "poster-abstract": "🖼️",
  wardrobe: "🗄️", table: "🍽️", shelf: "🗄️",
  "window-small": "🪟", "window-large": "🪟",
};

const CHARACTER_SHAPE_EMOJI: Record<CharacterSwatchShape, string> = {
  "hair-short": "💇", "hair-long": "💁", "hair-spiky": "🦔",
  "hair-ponytail": "🎀", "hair-buzz": "👨‍🦲",
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
  const { room, loading, error, buy, equip, toggleLights, moveFloorItem, moveWallItem } = useRoomState();
  const [arrangeMode, setArrangeMode] = useState(false);
  const {
    character,
    characterLoading,
    buy: buyCharacterItem,
    equip: equipCharacterItem,
    setSkinTone,
  } = useCharacter();
  // Items the player is previewing but hasn't bought yet — reported up by
  // ShopPanel's onPreviewChange, merged over the real (owned/equipped) state
  // below so the 3D scene shows the "what if I bought this" look live. Both
  // room decor and character outfits render in the same scene regardless of
  // which shop tab is active, so previewing a hat while browsing wallpaper
  // (or vice versa) still shows up.
  const [roomPreview, setRoomPreview] = useState<Partial<Record<ShopSlot, string>>>({});
  const [characterPreview, setCharacterPreview] = useState<Partial<Record<CharacterSlot, string>>>({});

  // Earned Dashboard achievements, shown as trophies in the scene — reuses
  // the exact same "highest earned tier per category" logic AchievementCard
  // already applies to the same fetched data, just rendered as 3D props
  // instead of medal dots.
  const [trophies, setTrophies] = useState<RoomAchievementTrophy[]>([]);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetchAchievements(token)
      .then((data) => {
        const valueMap: Record<string, number> = {
          listeningTime: getTotalListeningSeconds(),
          questionsAnswered: data.stats.questionsAnswered,
          studyStreak: data.stats.currentStreak,
          storiesListened: data.stats.uniqueStoriesCount,
          wordsLearned: data.stats.wordsLearned,
        };
        const earned = ACHIEVEMENT_CATEGORIES.flatMap((category) => {
          const value = valueMap[category.key] ?? 0;
          const earnedTiers = getEarnedTiers(category.tiers, value);
          const highest = earnedTiers[earnedTiers.length - 1];
          return highest ? [{ key: category.key, tier: highest.tier }] : [];
        });
        setTrophies(earned);
      })
      .catch((err) => console.error("Failed to load achievements for room trophies:", err));
  }, []);

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setArrangeMode((v) => !v)}
              title={t(arrangeMode ? "room.arrangeModeExit" : "room.arrangeModeEnter")}
              className={`text-xs font-semibold rounded-full px-3 py-1.5 cursor-pointer ${
                arrangeMode ? "bg-amber-500 text-white" : "bg-white/70 hover:bg-white"
              }`}
            >
              🔧 {t(arrangeMode ? "room.arrangeModeDone" : "room.arrangeModeStart")}
            </button>
            <button
              onClick={toggleLights}
              title={t(room.lightsOn ? "room.lightsOn" : "room.lightsOff")}
              className="text-sm bg-white/70 rounded-full px-3 py-1.5 cursor-pointer hover:bg-white"
            >
              {room.lightsOn ? "💡" : "🌙"}
            </button>
            <div className="flex items-center gap-1 text-sm font-bold text-amber-600 bg-white/70 rounded-full px-3 py-1.5">
              <BitAwardIcon size={14} />
              {bitAward}
            </div>
          </div>
        </div>
        {arrangeMode && (
          <p className="text-center text-xs text-black/50 px-3 pb-1">{t("room.arrangeModeHint")}</p>
        )}
        <div className="flex-1 min-h-0">
          <RoomScene
            placedItems={{ ...room.placedItems, ...roomPreview }}
            placement={room.placement}
            lightsOn={room.lightsOn}
            achievements={trophies}
            arrangeMode={arrangeMode}
            onMoveFloorItem={(slot: FloorSlotKey, x, z, rotation) => moveFloorItem(slot, x, z, rotation)}
            onMoveWallItem={(slot: WallSlotKey, along, height) => moveWallItem(slot, along, height)}
            rotateLabel={t("room.rotate")}
            character={{
              skinTone: character.skinTone,
              equipped: { ...character.equipped, ...characterPreview },
            }}
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

        {/* Both panels stay mounted (just hidden) rather than being torn down
            on tab switch, so an in-progress preview basket in one tab isn't
            wiped out by browsing the other — you can preview a hat and a
            wallpaper together and see the combined look in the scene. */}
        <div className={mode === "room" ? "flex-1 min-h-0 flex flex-col" : "hidden"}>
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
            onPreviewChange={setRoomPreview}
          />
        </div>
        <div className={mode === "character" ? "flex-1 min-h-0 flex flex-col" : "hidden"}>
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
            onPreviewChange={setCharacterPreview}
          />
        </div>
      </div>
    </div>
  );
};

export default Room;
