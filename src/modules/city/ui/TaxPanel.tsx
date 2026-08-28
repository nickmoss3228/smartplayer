// modules/city/ui/TaxPanel.tsx
//
// Two sliders, one per taxable category (residential, business — services
// are flat upkeep and parks/roads earn nothing, so there's nothing to tax
// there). "The player can change taxes" from the spec.

import { CityTaxRates } from "../../../services/cityService";

interface TaxPanelProps {
  open: boolean;
  taxRates: CityTaxRates;
  onChange: (patch: Partial<CityTaxRates>) => void;
  onClose: () => void;
}

const ROWS: Array<{ key: keyof CityTaxRates; label: string; color: string }> = [
  { key: "residential", label: "Residential tax", color: "accent-emerald-500" },
  { key: "business", label: "Business tax", color: "accent-orange-500" },
];

export function TaxPanel({ open, taxRates, onChange, onClose }: TaxPanelProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close tax panel"
        onClick={onClose}
        className="absolute inset-0 z-30 bg-transparent"
      />
      <div className="absolute right-3 top-[calc(3.75rem+0.75rem)] z-40 w-64 bg-white/85 backdrop-blur-md border border-white/70 rounded-2xl shadow-xl p-4">
        <h2 className="text-sm font-bold text-black/80 mb-3">Tax rates</h2>
        {ROWS.map((row) => (
          <div key={row.key} className="mb-3 last:mb-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-black/60">{row.label}</span>
              <span className="text-xs font-bold text-black/70 tabular-nums">
                {Math.round(taxRates[row.key] * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={taxRates[row.key]}
              onChange={(e) => onChange({ [row.key]: Number(e.target.value) })}
              className={`w-full ${row.color}`}
            />
          </div>
        ))}
        <p className="text-[11px] text-black/35 mt-2 leading-relaxed">
          Higher taxes mean more revenue per building — happiness will start pushing back once
          that's live.
        </p>
      </div>
    </>
  );
}
