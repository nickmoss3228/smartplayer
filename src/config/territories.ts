// config/territories.ts
//
// The "choose your territory" step from the spec. Phase 1 has no shared
// world map to actually place a plot on (that's Phase 2 — see the project
// plan), so for now a territory is purely a terrain palette: it changes the
// grass/hill colours behind your grid, not the gameplay.

export interface Territory {
  id: string;
  name: string;
  blurb: string;
  baseColor: number;
  hillColor: number;
  highlightColor: number;
}

export const TERRITORIES: Territory[] = [
  {
    id: "riverside",
    name: "Riverside Plains",
    blurb: "Flat, fertile, easy to build on.",
    baseColor: 0x8fd18f,
    hillColor: 0x7bc27b,
    highlightColor: 0xa9e0a4,
  },
  {
    id: "coastal",
    name: "Coastal Bay",
    blurb: "Sandy soil, salt air.",
    baseColor: 0x9fd0a3,
    hillColor: 0x7fc2c0,
    highlightColor: 0xc9e8b8,
  },
  {
    id: "valley",
    name: "Green Valley",
    blurb: "Deep, dense, evergreen.",
    baseColor: 0x6fb87a,
    hillColor: 0x5aa168,
    highlightColor: 0x93cf8f,
  },
  {
    id: "hillside",
    name: "Hillside",
    blurb: "Warm, dry, rolling hills.",
    baseColor: 0xa3c979,
    hillColor: 0x8fae5f,
    highlightColor: 0xc7dc9a,
  },
];

export const DEFAULT_TERRITORY_ID = TERRITORIES[0].id;

export const getTerritory = (id: string): Territory =>
  TERRITORIES.find((t) => t.id === id) ?? TERRITORIES[0];
