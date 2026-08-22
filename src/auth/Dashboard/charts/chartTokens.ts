// auth/Dashboard/charts/chartTokens.ts
//
// The single swap point for every color the dashboard charts draw with.
// Values are not hand-picked: they come from the data-viz reference palette and
// were validated against this app's actual chart surface (#ffffff — the cards
// are bg-white, not the reference's #fcfcfb) with scripts/validate_palette.js.
//
//   Difficulty ramp (ordinal, one hue, --ordinal):
//     lightness monotone PASS · adjacent dL >= 0.06 PASS
//     light-end contrast 2.11:1 PASS (>= 2.0) · single hue, 3 deg spread PASS
//
//   Accuracy line (categorical slot 1): 4.42:1 on white, clears the 3:1 mark gate.
//
// Difficulty is ORDINAL, not nominal — easy < medium < hard is a tier order, so it
// takes a one-hue ramp whose lightness carries the ordering. That is also why it is
// not the green/amber/red used by the difficulty cards in dashboardModule.tsx:
// that trio FAILS colorblind separation (amber vs green dE 5.7 under protanopia,
// below the 6.0 floor), so easy and medium are indistinguishable to red-green
// colorblind readers. Aligning the cards to this ramp is a one-line change in
// getDifficultyTheme — deliberately left alone here so this stays a chart change.
//
// The app ships no dark mode (zero `dark:` classes, no darkMode config), so only
// light values are defined. Adding dark means adding a second block here and
// re-running the validator against the dark surface — not flipping these.

import type { Difficulty } from "../../../types/Dashboard";

/** Ordinal ramp, light -> dark with increasing difficulty. Blue steps 250/400/600. */
export const DIFFICULTY_RAMP: Record<Difficulty, string> = {
  easy: "#86b6ef",
  medium: "#3987e5",
  hard: "#184f95",
};

/** Categorical slot 1 — the accuracy series. */
export const ACCENT = "#2a78d6";

/** Chart chrome. Ink never wears a series color; marks carry identity. */
export const CHROME = {
  surface: "#ffffff",
  textPrimary: "#0b0b0b",
  textSecondary: "#52514e",
  muted: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
} as const;

/** Fixed mark specs from the skill — kept here so both charts agree. */
export const MARKS = {
  /** Bars never fill their band; the leftover is air. */
  maxBarWidth: 24,
  /** Rounded data-end; the baseline end stays square. */
  barRadius: 4,
  lineWidth: 2,
  /** r >= 4 so the painted dot is >= 8px. */
  dotRadius: 4,
  /** Surface-colored gap between touching fills, and ring around overlapping dots. */
  surfaceGap: 2,
  /** Hover/focus targets are bigger than the mark they select. */
  minHitTarget: 24,
  areaOpacity: 0.1,
} as const;
