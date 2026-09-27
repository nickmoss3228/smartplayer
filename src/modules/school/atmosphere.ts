// modules/school/atmosphere.ts
//
// The time of year and the time of day, as the scene sees them. The season
// comes from the real calendar — snow on the roof in January — and whether the
// lights are on from the school's own fast clock (schoolClock.ts), so the
// windows light up every evening of the school's eighteen-minute day.
//
// Read through a context rather than threaded through props: a tree three
// components deep in furniture.tsx wants the season, and so does the grass in
// Building.tsx, and neither of their parents has any other use for it.

import { createContext, useContext } from "react";

export type Season = "winter" | "spring" | "summer" | "autumn";

/** Northern-hemisphere months, which is where the players are. */
export function seasonFor(date: Date): Season {
  const m = date.getMonth();
  if (m === 11 || m <= 1) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "autumn";
}

export interface Atmosphere {
  season: Season;
  lightsOn: boolean;
}

export const AtmosphereContext = createContext<Atmosphere>({ season: "summer", lightsOn: false });

export const useAtmosphere = () => useContext(AtmosphereContext);

/**
 * Leaf colours by season: the two canopy tones, and an optional third thing
 * sitting on top — snow in winter, blossom in spring.
 */
export interface Foliage {
  dark: string;
  light: string;
  /** The top tier of a tree — a third tone in autumn, when a tree is never
   *  one colour. */
  top: string;
  cap: string | null;
  blossom: string | null;
}

export const FOLIAGE: Record<Season, Foliage> = {
  summer: { dark: "#3d6d43", light: "#4f8a54", top: "#4f8a54", cap: null, blossom: null },
  spring: { dark: "#3f7447", light: "#5a9a5c", top: "#5a9a5c", cap: null, blossom: "#f2b8c9" },
  autumn: { dark: "#b0522c", light: "#d98b2b", top: "#e2b53d", cap: null, blossom: null },
  winter: { dark: "#3a5a48", light: "#4c6e59", top: "#4c6e59", cap: "#f3f6f9", blossom: null },
};

/** What the lit windows look like from outside after dark. */
export const WINDOW_LIT = "#ffd98f";
export const WINDOW_DAY = "#9fc4d8";
