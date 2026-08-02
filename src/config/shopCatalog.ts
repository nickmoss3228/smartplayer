// config/shopCatalog.ts
//
// Mirrors backend/src/config/shopCatalog.js (id/slot/priceBitAward — the
// server is the source of truth for what a purchase actually costs). The
// `swatch` field is display-only: it feeds modules/room/textures.ts's
// procedural canvas-texture drawing, so swapping in real sprite art later
// only means changing textures.ts, not this catalog's shape.
export type ShopSlot =
  | "wallpaper" | "flooring" | "furniture1" | "furniture2" | "poster"
  | "wardrobe" | "table" | "shelf";

export type SwatchShape =
  | "stripe" | "dot" | "solid" | "plaid"        // wallpaper
  | "wood" | "tile" | "carpet" | "stone"        // flooring
  | "bed" | "bunkbed" | "canopybed"             // furniture1
  | "plant" | "rug" | "cactus" | "bookshelf" | "lamp" // furniture2
  | "poster-stars" | "poster-map" | "poster-music" | "poster-abstract" // poster
  | "wardrobe" | "table" | "shelf";              // wardrobe/table/shelf

export interface Swatch {
  shape: SwatchShape;
  color: string;
  accent: string;
}

export interface ShopItem {
  id: string;
  slot: ShopSlot;
  name: string;
  priceBitAward: number;
  swatch: Swatch;
}

export const SHOP_CATALOG: ShopItem[] = [
  { id: "wallpaper-stripe-blue", slot: "wallpaper",  name: "Blue Stripes", priceBitAward: 20, swatch: { shape: "stripe", color: "#bfe3ff", accent: "#eaf6ff" } },
  { id: "wallpaper-dot-pink",    slot: "wallpaper",  name: "Pink Dots",    priceBitAward: 20, swatch: { shape: "dot",    color: "#ffd6e8", accent: "#fff0f6" } },
  { id: "wallpaper-solid-mint",  slot: "wallpaper",  name: "Mint Solid",   priceBitAward: 12, swatch: { shape: "solid",  color: "#cdeac0", accent: "#cdeac0" } },
  { id: "wallpaper-plaid-yellow",slot: "wallpaper",  name: "Yellow Plaid", priceBitAward: 22, swatch: { shape: "plaid",  color: "#fff3b0", accent: "#f4a261" } },
  { id: "flooring-wood",         slot: "flooring",   name: "Wood Floor",   priceBitAward: 15, swatch: { shape: "wood",   color: "#c98a4b", accent: "#a86a34" } },
  { id: "flooring-tile",         slot: "flooring",   name: "Tile Floor",   priceBitAward: 15, swatch: { shape: "tile",   color: "#e5e5e5", accent: "#cfcfcf" } },
  { id: "flooring-carpet-gray",  slot: "flooring",   name: "Gray Carpet",  priceBitAward: 18, swatch: { shape: "carpet", color: "#b8b8c0", accent: "#8d8d97" } },
  { id: "flooring-stone",        slot: "flooring",   name: "Stone Floor",  priceBitAward: 20, swatch: { shape: "stone",  color: "#d8d2c4", accent: "#b0a892" } },
  { id: "furniture-bed-basic",   slot: "furniture1", name: "Cozy Bed",     priceBitAward: 30, swatch: { shape: "bed",    color: "#ff8fa3", accent: "#ffffff" } },
  { id: "furniture-bed-bunk",    slot: "furniture1", name: "Bunk Bed",     priceBitAward: 45, swatch: { shape: "bunkbed",color: "#7ec8e3", accent: "#ffffff" } },
  { id: "furniture-bed-canopy",  slot: "furniture1", name: "Canopy Bed",   priceBitAward: 55, swatch: { shape: "canopybed", color: "#d6a4e8", accent: "#f7e9ff" } },
  { id: "furniture-plant-1",     slot: "furniture2", name: "Potted Fern",  priceBitAward: 10, swatch: { shape: "plant",  color: "#4caf50", accent: "#6d4c33" } },
  { id: "furniture-rug-round",   slot: "furniture2", name: "Round Rug",    priceBitAward: 12, swatch: { shape: "rug",    color: "#f4a261", accent: "#e76f51" } },
  { id: "furniture-cactus",      slot: "furniture2", name: "Cactus",       priceBitAward: 9,  swatch: { shape: "cactus", color: "#57a05a", accent: "#c96f4a" } },
  { id: "furniture-bookshelf",   slot: "furniture2", name: "Bookshelf",    priceBitAward: 25, swatch: { shape: "bookshelf", color: "#8b5e3c", accent: "#8b5e3c" } },
  { id: "furniture-lamp",        slot: "furniture2", name: "Floor Lamp",   priceBitAward: 14, swatch: { shape: "lamp",   color: "#f4d35e", accent: "#555555" } },
  { id: "poster-stars",          slot: "poster",     name: "Star Poster",  priceBitAward: 8,  swatch: { shape: "poster-stars", color: "#2b2d42", accent: "#f4d35e" } },
  { id: "poster-map",            slot: "poster",     name: "World Map",    priceBitAward: 8,  swatch: { shape: "poster-map",   color: "#e9c46a", accent: "#264653" } },
  { id: "poster-music",          slot: "poster",     name: "Music Notes",  priceBitAward: 8,  swatch: { shape: "poster-music", color: "#2a9d8f", accent: "#e9c46a" } },
  { id: "poster-abstract",       slot: "poster",     name: "Abstract Art", priceBitAward: 10, swatch: { shape: "poster-abstract", color: "#e76f51", accent: "#264653" } },
  { id: "wardrobe-oak",          slot: "wardrobe",   name: "Oak Wardrobe",   priceBitAward: 40, swatch: { shape: "wardrobe", color: "#8b5e3c", accent: "#6b4423" } },
  { id: "wardrobe-white",        slot: "wardrobe",   name: "White Wardrobe", priceBitAward: 40, swatch: { shape: "wardrobe", color: "#f5f0e6", accent: "#d8cfc0" } },
  { id: "table-wood",            slot: "table",      name: "Wood Table",    priceBitAward: 18, swatch: { shape: "table", color: "#a9744f", accent: "#8b5e3c" } },
  { id: "table-white",           slot: "table",      name: "White Table",   priceBitAward: 18, swatch: { shape: "table", color: "#f5f0e6", accent: "#d8cfc0" } },
  { id: "shelf-oak",             slot: "shelf",      name: "Oak Shelf",     priceBitAward: 15, swatch: { shape: "shelf", color: "#8b5e3c", accent: "#e9c46a" } },
  { id: "shelf-white",           slot: "shelf",      name: "White Shelf",   priceBitAward: 15, swatch: { shape: "shelf", color: "#f5f0e6", accent: "#2a9d8f" } },
];

export const SHOP_SLOTS: ShopSlot[] = [
  "wallpaper", "flooring", "furniture1", "furniture2", "poster",
  "wardrobe", "table", "shelf",
];

export const getShopItem = (itemId: string): ShopItem | undefined =>
  SHOP_CATALOG.find((item) => item.id === itemId);

export const getItemsBySlot = (slot: ShopSlot): ShopItem[] =>
  SHOP_CATALOG.filter((item) => item.slot === slot);
