// components/Admin/StoryBuilder/PartMatrix.tsx
//
// Parts down, elements across, one click to any cell.
//
// The builder used to show two separate rows of pickers — parts, then steps —
// which flattened two-dimensional data into two one-dimensional lists and made
// the only question worth asking ("what does this story still need?")
// impossible to answer at a glance. The grid is the same data with its shape
// put back, and it doubles as the progress report: a row reads as "what this
// part owes", a column as "the pass I still owe the whole story".

import { ELEMENTS, ElementId, CellState, StoryReadiness, partVerdict } from "./partStatus";

interface PartMatrixProps {
  readiness: StoryReadiness;
  activePart: number;
  activeElement: ElementId;
  /** Part 1 of a paid story is the preview a non-owner hears before buying. */
  previewPart: number | null;
  onPick: (partNumber: number, element: ElementId) => void;
  onAddPart: () => void;
  addingPart: boolean;
  canAddPart: boolean;
  maxParts: number;
}

const CELL_STYLE: Record<CellState, string> = {
  done: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  empty: "bg-gray-100 text-gray-400",
  na: "bg-transparent text-gray-300",
};

const CELL_GLYPH: Record<CellState, string> = {
  done: "✓",
  partial: "~",
  empty: "·",
  na: "–",
};

const PartMatrix = ({
  readiness,
  activePart,
  activeElement,
  previewPart,
  onPick,
  onAddPart,
  addingPart,
  canAddPart,
  maxParts,
}: PartMatrixProps) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm border-collapse min-w-[520px]">
      <thead>
        <tr>
          <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 pb-2 pr-3">
            Part
          </th>
          {ELEMENTS.map((el) => (
            <th
              key={el.id}
              title={el.required ? el.label : `${el.label} — optional`}
              className={`text-center text-[11px] font-semibold uppercase tracking-wide pb-2 px-1 ${
                el.required ? "text-gray-400" : "text-gray-300"
              }`}
            >
              {el.short}
            </th>
          ))}
          <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 pb-2 pl-3">
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {readiness.parts.map((status) => {
          const isActiveRow = status.partNumber === activePart;
          return (
            <tr
              key={status.partNumber}
              className={isActiveRow ? "bg-amber-50" : "hover:bg-gray-50"}
            >
              <td className="py-1 pr-3 tabular-nums whitespace-nowrap">
                <span className={isActiveRow ? "font-bold text-black" : "text-gray-600"}>
                  {status.partNumber}
                </span>
                {status.partNumber === previewPart && (
                  <span
                    title="A non-owner hears this part before deciding to buy"
                    className="ml-1.5 text-[9px] uppercase tracking-wide text-amber-700 bg-amber-100 rounded px-1 py-0.5"
                  >
                    preview
                  </span>
                )}
              </td>

              {ELEMENTS.map((el) => {
                const state = status.cells[el.id];
                const here = isActiveRow && el.id === activeElement;
                // A number beats a tick where the number is the useful thing —
                // "12 markers" says more about a part than "done" does.
                const n = status.counts[el.id];
                const glyph = state === "done" && typeof n === "number" && n > 0 ? String(n) : CELL_GLYPH[state];
                return (
                  <td key={el.id} className="text-center px-1 py-1">
                    <button
                      type="button"
                      onClick={() => onPick(status.partNumber, el.id)}
                      title={`Part ${status.partNumber} — ${el.label}`}
                      className={`w-7 h-7 rounded-md text-[11px] font-bold leading-none tabular-nums transition-colors ${
                        CELL_STYLE[state]
                      } ${here ? "ring-2 ring-amber-500 ring-offset-1" : "hover:brightness-95"}`}
                    >
                      <span aria-hidden="true">{glyph}</span>
                      <span className="sr-only">
                        {el.label}: {state}
                        {typeof n === "number" ? `, ${n}` : ""}
                      </span>
                    </button>
                  </td>
                );
              })}

              <td
                className={`pl-3 text-xs whitespace-nowrap ${
                  status.sellable
                    ? "text-emerald-700"
                    : status.empty
                      ? "text-gray-400"
                      : "text-amber-700"
                }`}
              >
                {partVerdict(status)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>

    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200 flex-wrap">
      <button
        type="button"
        onClick={onAddPart}
        disabled={addingPart || !canAddPart}
        title={canAddPart ? "Add another part" : `A story can have at most ${maxParts} parts.`}
        className="text-xs text-gray-600 bg-white border border-dashed border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
      >
        {addingPart ? "Adding…" : "+ Add part"}
      </button>
      <span className="text-[11px] text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
        <span>✓ complete</span>
        <span>~ needs a look</span>
        <span>· empty</span>
        <span>– not used</span>
        <span className="text-gray-300">
          {ELEMENTS.map((e) => `${e.short} ${e.label.toLowerCase()}`).join(" · ")}
        </span>
      </span>
    </div>
  </div>
);

export default PartMatrix;
