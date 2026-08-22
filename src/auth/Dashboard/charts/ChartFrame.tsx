// auth/Dashboard/charts/ChartFrame.tsx
//
// The pieces both dashboard charts share: a card shell with its table-view twin,
// a width observer, and the hover readout.

import React from "react";
import { CHROME } from "./chartTokens";

export interface TooltipRow {
  label: string;
  value: string;
  /** Series color. Bars key with a swatch, lines with a short stroke. */
  color?: string;
  mark?: "rect" | "line";
}

interface TooltipProps {
  x: number;
  y: number;
  containerWidth: number;
  title: string;
  rows: TooltipRow[];
}

const TOOLTIP_WIDTH = 168;

/**
 * Values lead, labels follow — in a tooltip the reader already knows the series
 * and wants the number, so the value is the high-contrast element.
 */
export const ChartTooltip: React.FC<TooltipProps> = ({
  x,
  y,
  containerWidth,
  title,
  rows,
}) => {
  // Keep the box inside the card no matter where the pointer is.
  const left = Math.max(4, Math.min(x - TOOLTIP_WIDTH / 2, containerWidth - TOOLTIP_WIDTH - 4));

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 rounded-xl bg-white px-3 py-2
                 shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-black/10"
      style={{ left, top: Math.max(4, y - 12), width: TOOLTIP_WIDTH }}
    >
      <p
        className="text-[11px] font-semibold mb-1.5"
        style={{ color: CHROME.textSecondary }}
      >
        {title}
      </p>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2 py-0.5">
          {row.color &&
            (row.mark === "line" ? (
              <span
                className="inline-block flex-shrink-0 rounded-full"
                style={{ width: 10, height: 2, backgroundColor: row.color }}
              />
            ) : (
              <span
                className="inline-block flex-shrink-0 rounded-[2px]"
                style={{ width: 8, height: 8, backgroundColor: row.color }}
              />
            ))}
          <span className="text-[11px] flex-1 truncate" style={{ color: CHROME.muted }}>
            {row.label}
          </span>
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: CHROME.textPrimary }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
};

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Column headers for the table twin. */
  tableHead: string[];
  /** Rows, already stringified. */
  tableRows: string[][];
  tableLabel: string;
  children: React.ReactNode;
}

/**
 * Card shell. The <details> table is not a nice-to-have: it is the non-visual
 * route to every value the chart encodes, which is what lets the two sub-3:1
 * ramp steps ship at all (the relief rule) and what keeps tooltips enhancing
 * rather than gating.
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  tableHead,
  tableRows,
  tableLabel,
  children,
}) => (
  <div
    className="bg-white rounded-3xl p-4 sm:p-5 border border-black/5
               shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
  >
    <div className="mb-3">
      <h3 className="font-bold text-black/85 text-sm sm:text-base">{title}</h3>
      {subtitle && <p className="text-[11px] text-black/40 mt-0.5">{subtitle}</p>}
    </div>

    {children}

    <details className="mt-3 group">
      <summary
        className="text-[11px] font-semibold cursor-pointer list-none
                   text-black/40 hover:text-black/70 transition-colors
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20
                   rounded px-1 -mx-1 py-0.5 inline-block"
      >
        {tableLabel}
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              {tableHead.map((head) => (
                <th
                  key={head}
                  className="text-[11px] font-semibold py-1.5 pr-3 whitespace-nowrap
                             border-b border-black/10"
                  style={{ color: CHROME.textSecondary }}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) => (
                  <td
                    key={i}
                    className="text-xs py-1.5 pr-3 whitespace-nowrap tabular-nums
                               border-b border-black/[0.06]"
                    style={{ color: i === 0 ? CHROME.textSecondary : CHROME.textPrimary }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  </div>
);

interface EmptyStateProps {
  height: number;
  message: string;
}

export const ChartEmptyState: React.FC<EmptyStateProps> = ({ height, message }) => (
  <div
    className="flex items-center justify-center rounded-2xl bg-black/[0.02]"
    style={{ height }}
  >
    <p className="text-xs text-black/35 px-6 text-center">{message}</p>
  </div>
);
