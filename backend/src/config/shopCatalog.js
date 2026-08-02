// config/shopCatalog.js
//
// Server-authoritative source of truth for "My Room" shop items — the
// frontend's src/config/shopCatalog.ts mirrors the id/slot/priceBitAward
// shape (plus its own display-only swatch info) but this file is what the
// purchase controller actually checks prices against. Demo catalog —
// expect this to be replaced/expanded once real item designs land.
export const SLOTS = ["wallpaper", "flooring", "furniture1", "furniture2", "poster"];

export const SHOP_CATALOG = [
  { id: "wallpaper-stripe-blue", slot: "wallpaper", name: "Blue Stripes", priceBitAward: 20 },
  { id: "wallpaper-dot-pink",    slot: "wallpaper", name: "Pink Dots",    priceBitAward: 20 },
  { id: "flooring-wood",         slot: "flooring",  name: "Wood Floor",  priceBitAward: 15 },
  { id: "flooring-tile",         slot: "flooring",  name: "Tile Floor",  priceBitAward: 15 },
  { id: "furniture-bed-basic",   slot: "furniture1", name: "Cozy Bed",    priceBitAward: 30 },
  { id: "furniture-bed-bunk",    slot: "furniture1", name: "Bunk Bed",    priceBitAward: 45 },
  { id: "furniture-plant-1",     slot: "furniture2", name: "Potted Fern", priceBitAward: 10 },
  { id: "furniture-rug-round",   slot: "furniture2", name: "Round Rug",   priceBitAward: 12 },
  { id: "poster-stars",          slot: "poster",     name: "Star Poster", priceBitAward: 8 },
  { id: "poster-map",            slot: "poster",     name: "World Map",   priceBitAward: 8 },
];

export const getShopItem = (itemId) => SHOP_CATALOG.find((item) => item.id === itemId) ?? null;
