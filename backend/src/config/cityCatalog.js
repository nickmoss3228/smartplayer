// config/cityCatalog.js
//
// MIRROR of src/config/cityCatalog.ts on the frontend — keep the two in step
// by hand, same convention as schoolCatalog.js. This is the authoritative
// copy: city.controller.js re-reads it on every placement, so a stale or
// tampered frontend mirror can only ever earn a 400.

export const GRID_SIZE = 24;
export const ROAD_ID = "road";
export const STARTING_TREASURY = 10000;

export const BUILDINGS = [
  { id: "road", category: "road", cost: 20, incomePerSec: 0, happinessEffect: 0, requiresRoad: false },
  { id: "house", category: "residential", cost: 500, incomePerSec: 0.4, happinessEffect: 1, requiresRoad: true },
  { id: "park", category: "park", cost: 300, incomePerSec: 0, happinessEffect: 3, requiresRoad: true },
  { id: "parking", category: "business", cost: 400, incomePerSec: 0.3, happinessEffect: 0, requiresRoad: true },
  { id: "restaurant", category: "business", cost: 700, incomePerSec: 0.8, happinessEffect: 1, requiresRoad: true },
  { id: "office", category: "business", cost: 900, incomePerSec: 1.0, happinessEffect: 0, requiresRoad: true },
  { id: "factory", category: "business", cost: 1200, incomePerSec: 1.5, happinessEffect: -3, requiresRoad: true },
  { id: "datacenter", category: "business", cost: 2500, incomePerSec: 3.0, happinessEffect: -2, requiresRoad: true },
  { id: "police", category: "service", cost: 1000, incomePerSec: -0.5, happinessEffect: 2, requiresRoad: true },
  { id: "firestation", category: "service", cost: 900, incomePerSec: -0.4, happinessEffect: 1, requiresRoad: true },
  { id: "hospital", category: "service", cost: 1500, incomePerSec: -0.8, happinessEffect: 2, requiresRoad: true },
];

const BY_ID = new Map(BUILDINGS.map((b) => [b.id, b]));

export function getBuilding(id) {
  return BY_ID.get(id);
}

/** Categories whose income is scaled by the player-set tax rate. Services
 *  are pure upkeep (not taxed revenue) and parks/roads earn nothing. */
export const TAXABLE_CATEGORIES = ["residential", "business"];

export const DEFAULT_TAX_RATES = { residential: 1, business: 1 };
export const MIN_TAX_RATE = 0;
export const MAX_TAX_RATE = 2;
