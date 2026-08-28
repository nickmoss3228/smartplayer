// pages/Game.tsx — the city builder.
//
// Thin page, same shape as pages/Room.tsx: fullscreen canvas below the fixed
// navbar, everything else layered as absolutely-positioned HUD chrome on
// top. City state (tiles, treasury, income, tax rates) is fetched from and
// mutated through the backend via useCityState.

import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoCashOutline, IoMusicalNotes, IoMusicalNotesOutline } from "react-icons/io5";
import { useCityState } from "../modules/city/useCityState";
import { useAmbientMusic } from "../modules/city/useAmbientMusic";
import { BuildMenu } from "../modules/city/ui/BuildMenu";
import { CityCreationModal } from "../modules/city/ui/CityCreationModal";
import { TaxPanel } from "../modules/city/ui/TaxPanel";

const CityCanvas = lazy(() =>
  import("../modules/city/CityCanvas").then((m) => ({ default: m.CityCanvas })),
);

function happinessEmoji(happiness: number): string {
  if (happiness >= 70) return "😄";
  if (happiness >= 40) return "😐";
  return "😟";
}

function happinessBarColor(happiness: number): string {
  if (happiness >= 70) return "bg-emerald-500";
  if (happiness >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

const REASON_MESSAGES: Record<string, string> = {
  "not-enough-cash": "Not enough cash for that.",
  "no-road-access": "Needs a connected road.",
  occupied: "Something's already built there.",
  "out-of-bounds": "That's outside the plot.",
  busy: "Hold on, still saving the last change.",
};

const Game = () => {
  const { t } = useTranslation();
  const city = useCityState();
  const music = useAmbientMusic();
  const [toast, setToast] = useState<string | null>(null);
  const [taxPanelOpen, setTaxPanelOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const handleTileClick = async (x: number, y: number) => {
    const result = city.bulldozeMode
      ? await city.bulldozeTile(x, y)
      : city.selectedBuildingId
        ? await city.placeTile(x, y, city.selectedBuildingId)
        : null;
    if (result && !result.ok && result.reason) {
      setToast(REASON_MESSAGES[result.reason] ?? "Can't do that there.");
    }
  };

  const handleSelectBuilding = (id: string) => {
    city.setBulldozeMode(false);
    city.setSelectedBuildingId((prev) => (prev === id ? null : id));
  };

  const handleToggleBulldoze = () => {
    city.setSelectedBuildingId(null);
    city.setBulldozeMode((prev) => !prev);
  };

  if (city.loading) {
    return (
      <div className="fixed inset-x-0 top-13 bottom-0 flex items-center justify-center bg-[#eaf7ff]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (city.error) {
    return (
      <div className="fixed inset-x-0 top-13 bottom-0 flex items-center justify-center bg-[#eaf7ff] px-6 text-center text-black/50">
        {city.error}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-0 top-13 bottom-0 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #bfe3ff 0%, #eaf7ff 60%, #eaf7ff 100%)" }}
    >
      {city.needsCreation ? (
        <CityCreationModal busy={city.busy} onCreate={city.createCity} />
      ) : (
        <>
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
              </div>
            }
          >
            <CityCanvas
              className="w-full h-full"
              tiles={city.tiles}
              connectedRoads={city.connectedRoads}
              selectedBuildingId={city.selectedBuildingId}
              bulldozeMode={city.bulldozeMode}
              onTileClick={handleTileClick}
              territoryId={city.city?.territoryId}
              happiness={city.happiness}
            />
          </Suspense>

          <div className="absolute left-3 top-3 flex flex-col gap-2 pointer-events-none">
            <div className="bg-white/70 backdrop-blur-md rounded-full pl-3 pr-3.5 py-1.5 shadow-sm border border-white/60 w-fit">
              <div className="text-[13px] font-bold text-black/80 leading-tight">
                {city.city?.name ?? t("city.title", "City Builder")}
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-md rounded-2xl px-3.5 py-2 shadow-sm border border-white/60 w-fit">
              <div className="text-lg font-bold text-black/85 leading-tight tabular-nums">
                ${Math.floor(city.treasury).toLocaleString()}
              </div>
              <div
                className={`text-[11px] font-semibold leading-tight tabular-nums ${
                  city.incomePerSec >= 0 ? "text-emerald-600" : "text-rose-500"
                }`}
              >
                {city.incomePerSec >= 0 ? "+" : ""}
                {city.incomePerSec.toFixed(1)}/s
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-md rounded-2xl px-3.5 py-2 shadow-sm border border-white/60 w-fit">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{happinessEmoji(city.happiness)}</span>
                <span className="text-xs font-bold text-black/70 tabular-nums">
                  {Math.round(city.happiness)}%
                </span>
              </div>
              <div className="w-24 h-1.5 rounded-full bg-black/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${happinessBarColor(city.happiness)}`}
                  style={{ width: `${Math.max(0, Math.min(100, city.happiness))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="absolute right-3 top-3 flex gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={music.toggle}
              title={music.playing ? "Mute music" : "Play music"}
              className={`h-11 w-11 rounded-full backdrop-blur shadow-sm flex items-center justify-center active:scale-95 transition-transform ${
                music.playing ? "bg-sky-600 text-white" : "bg-white/90 text-black/60"
              }`}
            >
              {music.playing ? <IoMusicalNotes size={20} /> : <IoMusicalNotesOutline size={20} />}
            </button>
            <button
              type="button"
              onClick={() => setTaxPanelOpen((v) => !v)}
              title="Tax rates"
              className={`h-11 w-11 rounded-full backdrop-blur shadow-sm flex items-center justify-center active:scale-95 transition-transform ${
                taxPanelOpen ? "bg-sky-600 text-white" : "bg-white/90 text-black/60"
              }`}
            >
              <IoCashOutline size={21} />
            </button>
          </div>
          <TaxPanel
            open={taxPanelOpen}
            taxRates={city.taxRates}
            onChange={city.setTaxRates}
            onClose={() => setTaxPanelOpen(false)}
          />

          <BuildMenu
            buildings={city.buildings}
            selectedBuildingId={city.selectedBuildingId}
            bulldozeMode={city.bulldozeMode}
            treasury={city.treasury}
            onSelect={handleSelectBuilding}
            onToggleBulldoze={handleToggleBulldoze}
          />
        </>
      )}

      {toast && (
        <div className="absolute bottom-28 inset-x-0 flex justify-center px-4 pointer-events-none z-50">
          <div className="bg-black/85 text-white text-sm rounded-full px-4 py-2 shadow-lg">{toast}</div>
        </div>
      )}
    </div>
  );
};

export default Game;
