// config/shopCatalog.js
//
// Server-authoritative source of truth for "My Room" shop items — the
// frontend's src/config/shopCatalog.ts mirrors the id/slot/priceBitAward
// shape (plus its own display-only swatch info) but this file is what the
// purchase controller actually checks prices against. Demo catalog —
// expect this to be replaced/expanded once real item designs land.
export const SLOTS = [
  "wallpaper", "flooring", "furniture1", "chair", "furniture2", "poster",
  "wardrobe", "table", "shelf", "window",
];

export const SHOP_CATALOG = [
  { id: "wallpaper-stripe-blue",  slot: "wallpaper",  name: "Slate Stripes",  priceBitAward: 20 },
  { id: "wallpaper-dot-pink",     slot: "wallpaper",  name: "Subtle Dots",    priceBitAward: 20 },
  { id: "wallpaper-solid-mint",   slot: "wallpaper",  name: "Sage Solid",     priceBitAward: 12 },
  { id: "wallpaper-plaid-yellow", slot: "wallpaper",  name: "Office Plaid",   priceBitAward: 22 },
  { id: "flooring-wood",          slot: "flooring",   name: "Oak Flooring",   priceBitAward: 15 },
  { id: "flooring-tile",          slot: "flooring",   name: "Tile Flooring",  priceBitAward: 15 },
  { id: "flooring-carpet-gray",   slot: "flooring",   name: "Gray Carpet Tile", priceBitAward: 18 },
  { id: "flooring-stone",         slot: "flooring",   name: "Polished Stone", priceBitAward: 20 },
  { id: "desk-basic",             slot: "furniture1", name: "Starter Desk",   priceBitAward: 30 },
  { id: "desk-office",            slot: "furniture1", name: "Office Desk",    priceBitAward: 45 },
  { id: "desk-executive",         slot: "furniture1", name: "Executive Desk", priceBitAward: 55 },
  { id: "chair-basic",            slot: "chair",      name: "Stool Chair",    priceBitAward: 16 },
  { id: "chair-office",           slot: "chair",      name: "Office Chair",   priceBitAward: 26 },
  { id: "chair-ergonomic",        slot: "chair",      name: "Ergonomic Chair", priceBitAward: 38 },
  { id: "furniture-plant-1",      slot: "furniture2", name: "Potted Fern",    priceBitAward: 10 },
  { id: "furniture-rug-round",    slot: "furniture2", name: "Round Rug",      priceBitAward: 12 },
  { id: "furniture-cactus",       slot: "furniture2", name: "Cactus",         priceBitAward: 9 },
  { id: "furniture-bookshelf",    slot: "furniture2", name: "Bookshelf",      priceBitAward: 25 },
  { id: "furniture-lamp",         slot: "furniture2", name: "Desk Lamp",      priceBitAward: 14 },
  { id: "poster-stars",           slot: "poster",     name: "Motivational Poster", priceBitAward: 8 },
  { id: "poster-map",             slot: "poster",     name: "World Map",      priceBitAward: 8 },
  { id: "poster-music",           slot: "poster",     name: "Award Frame",    priceBitAward: 8 },
  { id: "poster-abstract",        slot: "poster",     name: "Abstract Art",   priceBitAward: 10 },
  { id: "wardrobe-oak",           slot: "wardrobe",   name: "Wood Filing Cabinet", priceBitAward: 40 },
  { id: "wardrobe-white",         slot: "wardrobe",   name: "Steel Filing Cabinet", priceBitAward: 40 },
  { id: "table-wood",             slot: "table",      name: "Wood Side Table", priceBitAward: 18 },
  { id: "table-white",            slot: "table",      name: "White Side Table", priceBitAward: 18 },
  { id: "shelf-oak",              slot: "shelf",      name: "Oak Shelf",      priceBitAward: 15 },
  { id: "shelf-white",            slot: "shelf",      name: "White Shelf",    priceBitAward: 15 },
  { id: "window-small",           slot: "window",     name: "Small Window",   priceBitAward: 22 },
  { id: "window-large",           slot: "window",     name: "Large Window",   priceBitAward: 35 },
];

export const getShopItem = (itemId) => SHOP_CATALOG.find((item) => item.id === itemId) ?? null;
