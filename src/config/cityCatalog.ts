// config/cityCatalog.ts
//
// MIRROR of backend/src/config/cityCatalog.js (added in the economy
// milestone) — keep the two in step by hand, same convention as
// schoolCatalog.ts. The server re-reads its own copy on every placement, so
// a stale or tampered frontend mirror can only ever earn a 400.
//
// Category drives the zone colour (the "colour the land like Cities
// Skylines" requirement): residential/park are green, every business use is
// orange, and public services are red. `road` is infrastructure and isn't
// zoned.

export type BuildingCategory = "residential" | "park" | "business" | "service" | "road";

export interface BuildingDef {
  id: string;
  category: BuildingCategory;
  name: string;
  cost: number;
  /** Net $/second at full happiness. Negative = pure upkeep (services). */
  incomePerSec: number;
  /** Flat contribution to city happiness while standing. Refined with real
   *  coverage-radius/pollution logic in the happiness milestone. */
  happinessEffect: number;
  /** Tint applied to the tile under this building. */
  zoneColor: number;
  /** Every building needs a road-connected neighbour except the road itself. */
  requiresRoad: boolean;
}

export const ROAD_ID = "road";

export const BUILDINGS: BuildingDef[] = [
  {
    id: ROAD_ID,
    category: "road",
    name: "Road",
    cost: 20,
    incomePerSec: 0,
    happinessEffect: 0,
    zoneColor: 0x9aa3ab,
    requiresRoad: false,
  },
  {
    id: "house",
    category: "residential",
    name: "House",
    cost: 500,
    incomePerSec: 0.4,
    happinessEffect: 1,
    zoneColor: 0x4caf7d,
    requiresRoad: true,
  },
  {
    id: "park",
    category: "park",
    name: "Park",
    cost: 300,
    incomePerSec: 0,
    happinessEffect: 3,
    zoneColor: 0x8fd18f,
    requiresRoad: true,
  },
  {
    id: "parking",
    category: "business",
    name: "Parking Lot",
    cost: 400,
    incomePerSec: 0.3,
    happinessEffect: 0,
    zoneColor: 0xe2a33f,
    requiresRoad: true,
  },
  {
    id: "restaurant",
    category: "business",
    name: "Restaurant",
    cost: 700,
    incomePerSec: 0.8,
    happinessEffect: 1,
    zoneColor: 0xe8934a,
    requiresRoad: true,
  },
  {
    id: "office",
    category: "business",
    name: "Office",
    cost: 900,
    incomePerSec: 1.0,
    happinessEffect: 0,
    zoneColor: 0xe2933f,
    requiresRoad: true,
  },
  {
    id: "factory",
    category: "business",
    name: "Factory",
    cost: 1200,
    incomePerSec: 1.5,
    happinessEffect: -3,
    zoneColor: 0xd9812e,
    requiresRoad: true,
  },
  {
    id: "datacenter",
    category: "business",
    name: "Data Center",
    cost: 2500,
    incomePerSec: 3.0,
    happinessEffect: -2,
    zoneColor: 0xcf7a2e,
    requiresRoad: true,
  },
  {
    id: "police",
    category: "service",
    name: "Police Station",
    cost: 1000,
    incomePerSec: -0.5,
    happinessEffect: 2,
    zoneColor: 0xd9556f,
    requiresRoad: true,
  },
  {
    id: "firestation",
    category: "service",
    name: "Fire Station",
    cost: 900,
    incomePerSec: -0.4,
    happinessEffect: 1,
    zoneColor: 0xe0637a,
    requiresRoad: true,
  },
  {
    id: "hospital",
    category: "service",
    name: "Hospital",
    cost: 1500,
    incomePerSec: -0.8,
    happinessEffect: 2,
    zoneColor: 0xe37187,
    requiresRoad: true,
  },
];

export const STARTING_TREASURY = 10000;

export const getBuilding = (id: string): BuildingDef | undefined =>
  BUILDINGS.find((b) => b.id === id);
