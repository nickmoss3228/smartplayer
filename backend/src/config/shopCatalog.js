// config/shopCatalog.js
//
// Server-authoritative source of truth for "My Room" shop items — the
// frontend's src/config/shopCatalog.ts mirrors the id/slot/priceBitAward
// shape (plus its own display-only swatch info) but this file is what the
// purchase controller actually checks prices against. Demo catalog —
// expect this to be replaced/expanded once real item designs land.
export const SLOTS = [
  "wallpaper", "flooring", "furniture1", "furniture2", "poster",
  "wardrobe", "table", "shelf",
];

export const SHOP_CATALOG = [
  { id: "wallpaper-stripe-blue",  slot: "wallpaper",  name: "Blue Stripes", priceBitAward: 20 },
  { id: "wallpaper-dot-pink",     slot: "wallpaper",  name: "Pink Dots",    priceBitAward: 20 },
  { id: "wallpaper-solid-mint",   slot: "wallpaper",  name: "Mint Solid",   priceBitAward: 12 },
  { id: "wallpaper-plaid-yellow", slot: "wallpaper",  name: "Yellow Plaid", priceBitAward: 22 },
  { id: "flooring-wood",          slot: "flooring",   name: "Wood Floor",   priceBitAward: 15 },
  { id: "flooring-tile",          slot: "flooring",   name: "Tile Floor",   priceBitAward: 15 },
  { id: "flooring-carpet-gray",   slot: "flooring",   name: "Gray Carpet",  priceBitAward: 18 },
  { id: "flooring-stone",         slot: "flooring",   name: "Stone Floor",  priceBitAward: 20 },
  { id: "furniture-bed-basic",    slot: "furniture1", name: "Cozy Bed",     priceBitAward: 30 },
  { id: "furniture-bed-bunk",     slot: "furniture1", name: "Bunk Bed",     priceBitAward: 45 },
  { id: "furniture-bed-canopy",   slot: "furniture1", name: "Canopy Bed",   priceBitAward: 55 },
  { id: "furniture-plant-1",      slot: "furniture2", name: "Potted Fern",  priceBitAward: 10 },
  { id: "furniture-rug-round",    slot: "furniture2", name: "Round Rug",    priceBitAward: 12 },
  { id: "furniture-cactus",       slot: "furniture2", name: "Cactus",       priceBitAward: 9 },
  { id: "furniture-bookshelf",    slot: "furniture2", name: "Bookshelf",    priceBitAward: 25 },
  { id: "furniture-lamp",         slot: "furniture2", name: "Floor Lamp",   priceBitAward: 14 },
  { id: "poster-stars",           slot: "poster",     name: "Star Poster",  priceBitAward: 8 },
  { id: "poster-map",             slot: "poster",     name: "World Map",    priceBitAward: 8 },
  { id: "poster-music",           slot: "poster",     name: "Music Notes",  priceBitAward: 8 },
  { id: "poster-abstract",        slot: "poster",     name: "Abstract Art", priceBitAward: 10 },
  { id: "wardrobe-oak",           slot: "wardrobe",   name: "Oak Wardrobe", priceBitAward: 40 },
  { id: "wardrobe-white",         slot: "wardrobe",   name: "White Wardrobe", priceBitAward: 40 },
  { id: "table-wood",             slot: "table",      name: "Wood Table",   priceBitAward: 18 },
  { id: "table-white",            slot: "table",      name: "White Table",  priceBitAward: 18 },
  { id: "shelf-oak",              slot: "shelf",      name: "Oak Shelf",    priceBitAward: 15 },
  { id: "shelf-white",            slot: "shelf",      name: "White Shelf",  priceBitAward: 15 },
];

export const getShopItem = (itemId) => SHOP_CATALOG.find((item) => item.id === itemId) ?? null;
