// config/shopCatalog.ts
//
// Mirrors backend/src/config/shopCatalog.js (id/slot/priceBitAward — the
// server is the source of truth for what a purchase actually costs). The
// `swatch` field is display-only: it feeds modules/room/textures.ts's
// procedural canvas-texture drawing, so swapping in real sprite art later
// only means changing textures.ts, not this catalog's shape.
export type ShopSlot =
  | "wallpaper" | "flooring" | "furniture1" | "chair" | "furniture2" | "poster"
  | "wardrobe" | "table" | "shelf" | "window";

export type SwatchShape =
  | "stripe" | "dot" | "solid" | "plaid"        // wallpaper
  | "wood" | "tile" | "carpet" | "stone"        // flooring
  | "desk-basic" | "desk-office" | "desk-executive" // furniture1
  | "chair-basic" | "chair-office" | "chair-ergonomic" // chair
  | "plant" | "rug" | "cactus" | "bookshelf" | "lamp" // furniture2
  | "poster-stars" | "poster-map" | "poster-music" | "poster-abstract" // poster
  | "wardrobe" | "table" | "shelf"               // wardrobe/table/shelf
  | "window-small" | "window-large";             // window

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
  { id: "wallpaper-stripe-blue", slot: "wallpaper",  name: "Slate Stripes",  priceBitAward: 20, swatch: { shape: "stripe", color: "#c7d3e0", accent: "#e8edf3" } },
  { id: "wallpaper-dot-pink",    slot: "wallpaper",  name: "Subtle Dots",    priceBitAward: 20, swatch: { shape: "dot",    color: "#dfe4e8", accent: "#f2f4f6" } },
  { id: "wallpaper-solid-mint",  slot: "wallpaper",  name: "Sage Solid",     priceBitAward: 12, swatch: { shape: "solid",  color: "#c9d6c6", accent: "#c9d6c6" } },
  { id: "wallpaper-plaid-yellow",slot: "wallpaper",  name: "Office Plaid",   priceBitAward: 22, swatch: { shape: "plaid",  color: "#e2ddc8", accent: "#8d7b5a" } },
  { id: "flooring-wood",         slot: "flooring",   name: "Oak Flooring",   priceBitAward: 15, swatch: { shape: "wood",   color: "#b0784a", accent: "#8f5f37" } },
  { id: "flooring-tile",         slot: "flooring",   name: "Tile Flooring",  priceBitAward: 15, swatch: { shape: "tile",   color: "#dcdcdc", accent: "#c2c2c2" } },
  { id: "flooring-carpet-gray",  slot: "flooring",   name: "Gray Carpet Tile", priceBitAward: 18, swatch: { shape: "carpet", color: "#9fa3ac", accent: "#767a84" } },
  { id: "flooring-stone",        slot: "flooring",   name: "Polished Stone", priceBitAward: 20, swatch: { shape: "stone",  color: "#c9c4b8", accent: "#a19a89" } },
  { id: "desk-basic",            slot: "furniture1", name: "Starter Desk",   priceBitAward: 30, swatch: { shape: "desk-basic",    color: "#c98a4b", accent: "#3a3a3a" } },
  { id: "desk-office",           slot: "furniture1", name: "Office Desk",    priceBitAward: 45, swatch: { shape: "desk-office",   color: "#6b4423", accent: "#2b2d42" } },
  { id: "desk-executive",        slot: "furniture1", name: "Executive Desk", priceBitAward: 55, swatch: { shape: "desk-executive",color: "#2b2b2b", accent: "#1a1a1a" } },
  { id: "chair-basic",           slot: "chair",      name: "Stool Chair",    priceBitAward: 16, swatch: { shape: "chair-basic",     color: "#8b5e3c", accent: "#5c3d26" } },
  { id: "chair-office",          slot: "chair",      name: "Office Chair",   priceBitAward: 26, swatch: { shape: "chair-office",    color: "#2b2d42", accent: "#3a3a3a" } },
  { id: "chair-ergonomic",       slot: "chair",      name: "Ergonomic Chair", priceBitAward: 38, swatch: { shape: "chair-ergonomic", color: "#264653", accent: "#1a1a1a" } },
  { id: "furniture-plant-1",     slot: "furniture2", name: "Potted Fern",    priceBitAward: 10, swatch: { shape: "plant",  color: "#4caf50", accent: "#6d4c33" } },
  { id: "furniture-rug-round",   slot: "furniture2", name: "Round Rug",      priceBitAward: 12, swatch: { shape: "rug",    color: "#8d99ae", accent: "#5c6577" } },
  { id: "furniture-cactus",      slot: "furniture2", name: "Cactus",         priceBitAward: 9,  swatch: { shape: "cactus", color: "#57a05a", accent: "#c96f4a" } },
  { id: "furniture-bookshelf",   slot: "furniture2", name: "Bookshelf",      priceBitAward: 25, swatch: { shape: "bookshelf", color: "#8b5e3c", accent: "#8b5e3c" } },
  { id: "furniture-lamp",        slot: "furniture2", name: "Desk Lamp",      priceBitAward: 14, swatch: { shape: "lamp",   color: "#f4d35e", accent: "#555555" } },
  { id: "poster-stars",          slot: "poster",     name: "Motivational Poster", priceBitAward: 8,  swatch: { shape: "poster-stars", color: "#2b2d42", accent: "#f4d35e" } },
  { id: "poster-map",            slot: "poster",     name: "World Map",      priceBitAward: 8,  swatch: { shape: "poster-map",   color: "#e9c46a", accent: "#264653" } },
  { id: "poster-music",          slot: "poster",     name: "Award Frame",    priceBitAward: 8,  swatch: { shape: "poster-music", color: "#8b5e3c", accent: "#f4d35e" } },
  { id: "poster-abstract",       slot: "poster",     name: "Abstract Art",   priceBitAward: 10, swatch: { shape: "poster-abstract", color: "#e76f51", accent: "#264653" } },
  { id: "wardrobe-oak",          slot: "wardrobe",   name: "Wood Filing Cabinet",  priceBitAward: 40, swatch: { shape: "wardrobe", color: "#6b4423", accent: "#4a2f18" } },
  { id: "wardrobe-white",        slot: "wardrobe",   name: "Steel Filing Cabinet", priceBitAward: 40, swatch: { shape: "wardrobe", color: "#c7cdd4", accent: "#8d949c" } },
  { id: "table-wood",            slot: "table",      name: "Wood Side Table", priceBitAward: 18, swatch: { shape: "table", color: "#a9744f", accent: "#8b5e3c" } },
  { id: "table-white",           slot: "table",      name: "White Side Table", priceBitAward: 18, swatch: { shape: "table", color: "#f5f0e6", accent: "#d8cfc0" } },
  { id: "shelf-oak",             slot: "shelf",      name: "Oak Shelf",     priceBitAward: 15, swatch: { shape: "shelf", color: "#8b5e3c", accent: "#e9c46a" } },
  { id: "shelf-white",           slot: "shelf",      name: "White Shelf",   priceBitAward: 15, swatch: { shape: "shelf", color: "#f5f0e6", accent: "#2a9d8f" } },
  { id: "window-small",          slot: "window",     name: "Small Window",  priceBitAward: 22, swatch: { shape: "window-small", color: "#bfe3ff", accent: "#8b5e3c" } },
  { id: "window-large",          slot: "window",     name: "Large Window",  priceBitAward: 35, swatch: { shape: "window-large", color: "#bfe3ff", accent: "#5c3d26" } },
];

export const SHOP_SLOTS: ShopSlot[] = [
  "wallpaper", "flooring", "furniture1", "chair", "furniture2", "poster",
  "wardrobe", "table", "shelf", "window",
];

export const getShopItem = (itemId: string): ShopItem | undefined =>
  SHOP_CATALOG.find((item) => item.id === itemId);

export const getItemsBySlot = (slot: ShopSlot): ShopItem[] =>
  SHOP_CATALOG.filter((item) => item.slot === slot);
