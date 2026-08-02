import { useTranslation } from "react-i18next";
import { RoomScene } from "../modules/room/RoomScene";
import { ShopPanel } from "../modules/room/ShopPanel";
import { useRoomState } from "../modules/room/useRoomState";
import { CURRENCIES } from "../config/currencies";

const BitAwardIcon = CURRENCIES[0].icon;

const Room = () => {
  const { t } = useTranslation();
  const { room, bitAward, loading, error, buy, equip } = useRoomState();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-dvh pt-14">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex justify-center items-center min-h-dvh pt-14 px-6 text-center text-black/50">
        {t("room.loadFailed")}
      </div>
    );
  }

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
          <RoomScene placedItems={room.placedItems} />
        </div>
      </div>

      {/* Shop */}
      <div className="h-[40dvh] landscape:h-full landscape:w-2/5 landscape:flex-none shrink-0 border-t landscape:border-t-0 landscape:border-l border-black/5">
        <ShopPanel room={room} bitAward={bitAward} onBuy={buy} onEquip={equip} />
      </div>
    </div>
  );
};

export default Room;
