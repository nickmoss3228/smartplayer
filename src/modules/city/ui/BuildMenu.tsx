// modules/city/ui/BuildMenu.tsx
//
// The build palette: one horizontally-scrolling strip of glass pills, one
// per catalog entry, plus a bulldoze toggle. Deliberately flat (no
// category tabs) — eleven buildings is few enough to scan in one row, and a
// colour swatch on each pill already carries the zone-colour grouping.

import { BuildingDef } from "../../../config/cityCatalog";
import { IoTrashOutline } from "react-icons/io5";

interface BuildMenuProps {
  buildings: BuildingDef[];
  selectedBuildingId: string | null;
  bulldozeMode: boolean;
  treasury: number;
  onSelect: (id: string) => void;
  onToggleBulldoze: () => void;
}

export function BuildMenu({
  buildings,
  selectedBuildingId,
  bulldozeMode,
  treasury,
  onSelect,
  onToggleBulldoze,
}: BuildMenuProps) {
  return (
    <div className="absolute inset-x-0 bottom-4 flex justify-center px-3 pointer-events-none">
      <div className="pointer-events-auto max-w-full overflow-x-auto bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-lg p-2 flex items-center gap-1.5">
        {buildings.map((building) => {
          const affordable = treasury >= building.cost;
          const selected = !bulldozeMode && selectedBuildingId === building.id;
          return (
            <button
              key={building.id}
              type="button"
              onClick={() => onSelect(building.id)}
              disabled={!affordable}
              title={building.name}
              className={`shrink-0 flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-transform active:scale-95 ${
                selected ? "bg-white shadow-md scale-105" : "hover:bg-white/60"
              } ${!affordable ? "opacity-35" : ""}`}
            >
              <span
                className="w-6 h-6 rounded-full border-2 border-white shadow"
                style={{ background: `#${building.zoneColor.toString(16).padStart(6, "0")}` }}
              />
              <span className="text-[10px] font-bold text-black/70 leading-tight whitespace-nowrap">
                {building.name}
              </span>
              <span className="text-[10px] font-semibold text-black/40 leading-tight">
                ${building.cost}
              </span>
            </button>
          );
        })}

        <div className="w-px self-stretch bg-black/10 mx-0.5" />

        <button
          type="button"
          onClick={onToggleBulldoze}
          title="Bulldoze"
          className={`shrink-0 flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-transform active:scale-95 ${
            bulldozeMode ? "bg-rose-500 text-white shadow-md scale-105" : "hover:bg-white/60 text-black/70"
          }`}
        >
          <IoTrashOutline size={20} />
          <span className="text-[10px] font-bold leading-tight">Bulldoze</span>
        </button>
      </div>
    </div>
  );
}
