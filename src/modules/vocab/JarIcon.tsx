import React from "react";

/**
 * The копилка: a jar with words inside. Drawn in react-icons' outline style
 * (24 box, round caps, currentColor) so it sits among io5 icons — it is also
 * BitWord's icon, since every new word in the jar earns one BitWord.
 */
export const JarIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M8 3.5h8M7.5 6.5h9" />
    <path d="M7.5 6.5c-1.6 1-2.5 2.6-2.5 4.4V18a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 18v-7.1c0-1.8-.9-3.4-2.5-4.4" />
    <path d="M9 13.5h6M9 16.5h4" />
  </svg>
);

/**
 * The big jar on the копилка page and at the end of the word game. `fresh` of
 * its word chips are filled in the accent: what this round (or week) put in.
 */
export const JarDrawing: React.FC<{ fresh?: number; className?: string; tone?: "ink" | "light" }> = ({
  fresh = 0,
  className,
  tone = "light",
}) => {
  const stroke = tone === "ink" ? "var(--color-panel-text)" : "var(--color-ink)";
  const chips: [number, number, number][] = [
    [22, 112, 34], [60, 112, 30], [24, 98, 28], [56, 98, 38], [30, 84, 32], [66, 84, 24], [26, 70, 40],
  ];
  return (
    <svg viewBox="0 0 120 134" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g stroke={stroke} strokeWidth={3}>
        <path d="M36 8h48M33 22h54" />
        <rect x="38" y="8" width="44" height="14" rx="3" />
        <path d="M33 22c-12 7-17 18-17 30v62a12 12 0 0 0 12 12h64a12 12 0 0 0 12-12V52c0-12-5-23-17-30" />
      </g>
      {chips.map(([x, y, w], k) => {
        const isFresh = k >= chips.length - Math.min(fresh, chips.length);
        return (
          <rect
            key={k}
            x={x}
            y={y}
            width={w}
            height={11}
            rx={3}
            strokeWidth={2}
            stroke={isFresh ? "var(--color-green-500)" : stroke}
            fill={isFresh ? "var(--color-green-500)" : "none"}
            opacity={isFresh ? 1 : 0.5}
          />
        );
      })}
    </svg>
  );
};
