// config/characterCatalog.ts
//
// Mirrors backend/src/config/characterCatalog.js (id/slot/priceBitAward —
// the server is the source of truth for what a purchase actually costs),
// same relationship shopCatalog.ts has to shopCatalog.js. The `swatch` field
// is display-only: it feeds modules/room/characterVoxelModels.ts's box
// geometry, the same way shopCatalog.ts's swatch feeds voxelModels.ts.
export type CharacterSlot = "hairstyle" | "outfit" | "hat";

export type CharacterSwatchShape =
  | "hair-short" | "hair-long" | "hair-spiky" | "hair-ponytail" | "hair-buzz" // hairstyle
  | "outfit-tee" | "outfit-hoodie" | "outfit-overalls" // outfit
  | "hat-cap" | "hat-beanie" | "hat-wizard";           // hat

export interface CharacterSwatch {
  shape: CharacterSwatchShape;
  color: string;
  accent: string;
}

export interface CharacterItem {
  id: string;
  slot: CharacterSlot;
  name: string;
  priceBitAward: number;
  swatch: CharacterSwatch;
}

export const CHARACTER_CATALOG: CharacterItem[] = [
  { id: "hair-short-brown",  slot: "hairstyle", name: "Short Brown Hair",  priceBitAward: 10, swatch: { shape: "hair-short", color: "#6b4423", accent: "#6b4423" } },
  { id: "hair-long-black",   slot: "hairstyle", name: "Long Black Hair",   priceBitAward: 12, swatch: { shape: "hair-long",  color: "#2b2d2f", accent: "#2b2d2f" } },
  { id: "hair-spiky-blonde", slot: "hairstyle", name: "Spiky Blonde Hair", priceBitAward: 14, swatch: { shape: "hair-spiky", color: "#e8c873", accent: "#e8c873" } },
  { id: "hair-ponytail-red", slot: "hairstyle", name: "Red Ponytail",     priceBitAward: 13, swatch: { shape: "hair-ponytail", color: "#a83232", accent: "#a83232" } },
  { id: "hair-buzz-gray",    slot: "hairstyle", name: "Buzz Cut",         priceBitAward: 8,  swatch: { shape: "hair-buzz", color: "#5a5a5a", accent: "#5a5a5a" } },

  { id: "outfit-blue-tee",       slot: "outfit", name: "Blue Tee",       priceBitAward: 10, swatch: { shape: "outfit-tee",      color: "#4a7fd6", accent: "#2b2d42" } },
  { id: "outfit-red-hoodie",     slot: "outfit", name: "Red Hoodie",     priceBitAward: 16, swatch: { shape: "outfit-hoodie",   color: "#d64a4a", accent: "#8b2f2f" } },
  { id: "outfit-green-overalls", slot: "outfit", name: "Green Overalls",priceBitAward: 18, swatch: { shape: "outfit-overalls", color: "#4a9d5c", accent: "#f4d35e" } },

  { id: "hat-cap-red",       slot: "hat", name: "Red Cap",     priceBitAward: 8,  swatch: { shape: "hat-cap",    color: "#d64a4a", accent: "#ffffff" } },
  { id: "hat-beanie-gray",   slot: "hat", name: "Gray Beanie", priceBitAward: 8,  swatch: { shape: "hat-beanie", color: "#8d8d97", accent: "#b8b8c0" } },
  { id: "hat-wizard-purple", slot: "hat", name: "Wizard Hat",  priceBitAward: 20, swatch: { shape: "hat-wizard", color: "#7b4fa3", accent: "#f4d35e" } },
];

export const CHARACTER_SLOTS: CharacterSlot[] = ["hairstyle", "outfit", "hat"];

export const getCharacterItem = (itemId: string): CharacterItem | undefined =>
  CHARACTER_CATALOG.find((item) => item.id === itemId);

export const getCharacterItemsBySlot = (slot: CharacterSlot): CharacterItem[] =>
  CHARACTER_CATALOG.filter((item) => item.slot === slot);
