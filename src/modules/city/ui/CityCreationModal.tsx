// modules/city/ui/CityCreationModal.tsx
//
// The "write the name of the city, then choose your territory" onboarding
// step from the spec. Blocks the canvas until the player has a city — see
// Game.tsx, which renders this instead of CityCanvas while needsCreation.

import { useState } from "react";
import { TERRITORIES, DEFAULT_TERRITORY_ID } from "../../../config/territories";

interface CityCreationModalProps {
  busy: boolean;
  onCreate: (name: string, territoryId: string) => void;
}

export function CityCreationModal({ busy, onCreate }: CityCreationModalProps) {
  const [name, setName] = useState("");
  const [territoryId, setTerritoryId] = useState(DEFAULT_TERRITORY_ID);

  const trimmed = name.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || busy) return;
    onCreate(trimmed, territoryId);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center px-4 bg-white/30 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white/85 backdrop-blur-md border border-white/70 rounded-3xl shadow-2xl p-6"
      >
        <h1 className="text-xl font-bold text-black/85 mb-1">Found your city</h1>
        <p className="text-sm text-black/45 mb-5">
          Give it a name and pick a starting plot. $10,000 to build with.
        </p>

        <label className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-1.5">
          City name
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="e.g. Willowbrook"
          className="w-full px-4 py-3 bg-black/[0.03] border border-black/10 rounded-2xl text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 focus:bg-white transition-all mb-5"
        />

        <label className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-1.5">
          Territory
        </label>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {TERRITORIES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTerritoryId(t.id)}
              className={`text-left rounded-2xl border-2 p-3 transition-transform active:scale-95 ${
                territoryId === t.id ? "border-sky-500 bg-sky-50" : "border-black/10"
              }`}
            >
              <span
                className="block w-full h-8 rounded-lg mb-2"
                style={{ background: `#${t.baseColor.toString(16).padStart(6, "0")}` }}
              />
              <span className="block text-sm font-bold text-black/80">{t.name}</span>
              <span className="block text-xs text-black/45">{t.blurb}</span>
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={!trimmed || busy}
          className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-emerald-500 text-white font-bold rounded-2xl hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Founding..." : "Found city"}
        </button>
      </form>
    </div>
  );
}
