// config/characterCatalog.js
//
// Server-authoritative source of truth for character customization items —
// sibling to config/shopCatalog.js (same id/slot/name/priceBitAward shape,
// same getItem-by-id lookup pattern), but for the player's character instead
// of the Room. Kept as a separate catalog/slot namespace rather than adding
// rows to shopCatalog.js because ownership/equip state also lives in its own
// User.character sub-document (see models/User.js), not User.room.
export const CHARACTER_SLOTS = ["hairstyle", "outfit", "hat"];

export const CHARACTER_CATALOG = [
  { id: "hair-short-brown",  slot: "hairstyle", name: "Short Brown Hair", priceBitAward: 10 },
  { id: "hair-long-black",   slot: "hairstyle", name: "Long Black Hair",  priceBitAward: 12 },
  { id: "hair-spiky-blonde", slot: "hairstyle", name: "Spiky Blonde Hair",priceBitAward: 14 },
  { id: "hair-ponytail-red", slot: "hairstyle", name: "Red Ponytail",    priceBitAward: 13 },
  { id: "hair-buzz-gray",    slot: "hairstyle", name: "Buzz Cut",        priceBitAward: 8 },

  { id: "outfit-blue-tee",     slot: "outfit", name: "Blue Tee",       priceBitAward: 10 },
  { id: "outfit-red-hoodie",   slot: "outfit", name: "Red Hoodie",     priceBitAward: 16 },
  { id: "outfit-green-overalls", slot: "outfit", name: "Green Overalls", priceBitAward: 18 },

  { id: "hat-cap-red",       slot: "hat", name: "Red Cap",       priceBitAward: 8 },
  { id: "hat-beanie-gray",   slot: "hat", name: "Gray Beanie",   priceBitAward: 8 },
  { id: "hat-wizard-purple", slot: "hat", name: "Wizard Hat",    priceBitAward: 20 },
];

export const getCharacterItem = (itemId) =>
  CHARACTER_CATALOG.find((item) => item.id === itemId) ?? null;
