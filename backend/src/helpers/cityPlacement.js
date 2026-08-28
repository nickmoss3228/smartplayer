// helpers/cityPlacement.js
//
// MIRROR of the frontend's modules/city/placement.ts placement rule — kept
// server-side too because the frontend's check is only a UX nicety; this is
// what actually stops a tampered client from placing buildings with no road
// access. Operates on a plain object keyed "x_y" (what City.tiles
// serializes to), not a Map, since it runs against the Mongoose document.
//
// Road rule: a road can go on any empty tile, no adjacency requirement. An
// earlier version required the first road to touch column x=0 (modeling a
// future inter-city connection point), but nothing on the grid marks which
// column that is, so it silently blocked every placement attempt outside
// it — see modules/city/placement.ts for the fuller explanation.

import { GRID_SIZE, ROAD_ID, getBuilding } from "../config/cityCatalog.js";

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export const tileKey = (x, y) => `${x}_${y}`;

function isInsideGrid(x, y) {
  return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
}

/** `tiles` is a plain { [key]: { buildingId } } object (Mongoose Map
 *  serializes that way via .toObject()). Every tile that's a road, full
 *  stop — no reachability computed. */
export function connectedRoadTiles(tiles) {
  const roads = new Set();
  for (const key of Object.keys(tiles)) {
    if (tiles[key]?.buildingId === ROAD_ID) roads.add(key);
  }
  return roads;
}

function hasRoadNeighbor(x, y, roadTiles) {
  return NEIGHBORS.some(([dx, dy]) => roadTiles.has(tileKey(x + dx, y + dy)));
}

export function checkPlacement(tiles, x, y, buildingId, roadTiles) {
  if (!isInsideGrid(x, y)) return { ok: false, reason: "out-of-bounds" };
  if (tiles[tileKey(x, y)]) return { ok: false, reason: "occupied" };

  const building = getBuilding(buildingId);
  if (!building) return { ok: false, reason: "unknown-building" };

  if (!building.requiresRoad) return { ok: true };
  if (hasRoadNeighbor(x, y, roadTiles)) return { ok: true };
  return { ok: false, reason: "no-road-access" };
}

/** 0-100. Baseline 50 (neutral) shifted by the sum of built-in
 *  happinessEffect (parks/services push up, factories/data centers push
 *  down — capped so no single sprawling category can swamp the score) and a
 *  tax penalty (residential tax matters most since residents feel it
 *  directly; business tax barely registers with them). */
export function computeHappiness(tiles, taxRates) {
  let effectSum = 0;
  for (const key of Object.keys(tiles)) {
    const building = getBuilding(tiles[key].buildingId);
    if (building) effectSum += building.happinessEffect;
  }
  effectSum = Math.max(-40, Math.min(40, effectSum));
  const taxPenalty = (taxRates.residential - 1) * 20 + (taxRates.business - 1) * 5;
  return Math.max(0, Math.min(100, 50 + effectSum - taxPenalty));
}

/** Unhappy residents leave: below 70 happiness, houses gradually empty out,
 *  down to a floor of 20% occupied (a ghost-town city still has a few
 *  holdouts, never literally zero). Only residential income is affected —
 *  an empty house pays no tax, but the factory next door keeps running. */
export function residentialOccupancy(happiness) {
  if (happiness >= 70) return 1;
  if (happiness >= 40) return 0.5 + ((happiness - 40) / 30) * 0.5;
  return 0.2 + (happiness / 40) * 0.3;
}

/** Net $/second across every placed tile, tax rates applied to the taxable
 *  categories (residential, business), residential also scaled by how much
 *  of the housing is actually occupied. Services are flat upkeep; parks and
 *  roads earn nothing. */
export function computeIncomePerSec(tiles, taxRates, happiness) {
  const occupancy = residentialOccupancy(happiness);
  let total = 0;
  for (const key of Object.keys(tiles)) {
    const building = getBuilding(tiles[key].buildingId);
    if (!building) continue;
    if (building.category === "residential") {
      total += building.incomePerSec * taxRates.residential * occupancy;
    } else if (building.category === "business") {
      total += building.incomePerSec * taxRates.business;
    } else {
      total += building.incomePerSec;
    }
  }
  return total;
}
