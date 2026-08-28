// controllers/city.controller.js
//
// The city builder's economy. "Leave the game and it keeps earning" is
// implemented the same way the wallet already works in this codebase: no
// background job, just an elapsed-time catch-up applied lazily on every
// request that touches the city (see helpers/cityPlacement.js and
// applyElapsedIncome below).

import { City } from "../models/City.js";
import {
  getBuilding,
  MIN_TAX_RATE,
  MAX_TAX_RATE,
  STARTING_TREASURY,
} from "../config/cityCatalog.js";
import {
  checkPlacement,
  connectedRoadTiles,
  computeIncomePerSec,
  computeHappiness,
  tileKey,
} from "../helpers/cityPlacement.js";

function tilesToObject(tilesMap) {
  return Object.fromEntries(
    Array.from(tilesMap.entries(), ([k, v]) => [k, { buildingId: v.buildingId }]),
  );
}

/** Applies whatever income accrued since lastTickAt to treasury and moves
 *  lastTickAt to now. Mutates the document in memory; caller still has to
 *  .save() it. Not persisted on its own so a read-only GET can preview the
 *  caught-up number without writing on every page load... except it always
 *  does write here, because "the number the player sees" and "the number in
 *  the database" must never drift, and computing it twice would risk that. */
function applyElapsedIncome(city) {
  const now = Date.now();
  const elapsedSeconds = Math.max(0, (now - city.lastTickAt.getTime()) / 1000);
  const tiles = tilesToObject(city.tiles);
  // Recomputed on every touch rather than only when tiles/tax change, since
  // that's also what "assume the composition was constant across the
  // elapsed window" below relies on — it only changes via explicit actions,
  // never on its own, so using the current value for the whole window is
  // exact, not an approximation.
  const happiness = computeHappiness(tiles, city.taxRates);
  city.happiness = happiness;
  if (elapsedSeconds > 0) {
    const incomePerSec = computeIncomePerSec(tiles, city.taxRates, happiness);
    city.treasury = Math.max(0, city.treasury + incomePerSec * elapsedSeconds);
  }
  city.lastTickAt = new Date(now);
}

/** applyElapsedIncome's happiness reflects the state BEFORE this request's
 *  own mutation (correct — the elapsed catch-up happened under the old
 *  tiles/tax). Call this after placing/bulldozing/re-taxing so the response
 *  reflects the city as it stands right now, not a stale pre-mutation
 *  reading — that mismatch is what let a tax hike show its old happiness
 *  and income back to the player until their next unrelated action. */
function refreshHappiness(city) {
  city.happiness = computeHappiness(tilesToObject(city.tiles), city.taxRates);
}

function serializeCity(city) {
  const tiles = tilesToObject(city.tiles);
  return {
    id: city._id,
    name: city.name,
    territoryId: city.territoryId,
    treasury: city.treasury,
    taxRates: city.taxRates,
    happiness: city.happiness,
    tiles,
    incomePerSec: computeIncomePerSec(tiles, city.taxRates, city.happiness),
  };
}

// GET /city
export async function getCity(req, res) {
  try {
    const city = await City.findOne({ userId: req.user._id });
    if (!city) return res.status(404).json({ message: "No city yet" });
    applyElapsedIncome(city);
    await city.save();
    res.json({ city: serializeCity(city) });
  } catch (error) {
    console.error("getCity error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /city   { name, territoryId }
export async function createCity(req, res) {
  try {
    const existing = await City.findOne({ userId: req.user._id });
    if (existing) return res.status(409).json({ message: "You already have a city" });

    const name = String(req.body?.name ?? "").trim().slice(0, 40);
    if (!name) return res.status(400).json({ message: "Name your city first" });
    const territoryId = String(req.body?.territoryId ?? "riverside").slice(0, 40);

    const city = await City.create({
      userId: req.user._id,
      name,
      territoryId,
      treasury: STARTING_TREASURY,
      // Match computeHappiness's own baseline for an empty plot (50, not the
      // schema's generic 100 default) so day one doesn't start by lying.
      happiness: 50,
    });
    res.status(201).json({ city: serializeCity(city) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You already have a city" });
    }
    console.error("createCity error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /city/tiles   { x, y, buildingId }
export async function placeTile(req, res) {
  try {
    const city = await City.findOne({ userId: req.user._id });
    if (!city) return res.status(404).json({ message: "No city yet" });

    const x = Number(req.body?.x);
    const y = Number(req.body?.y);
    const buildingId = String(req.body?.buildingId ?? "");
    const building = getBuilding(buildingId);
    if (!Number.isInteger(x) || !Number.isInteger(y) || !building) {
      return res.status(400).json({ message: "Invalid placement request" });
    }

    applyElapsedIncome(city);

    const tiles = tilesToObject(city.tiles);
    const connectedRoads = connectedRoadTiles(tiles);
    const check = checkPlacement(tiles, x, y, buildingId, connectedRoads);
    if (!check.ok) return res.status(400).json({ message: check.reason, reason: check.reason });

    if (city.treasury < building.cost) {
      return res.status(400).json({ message: "Not enough cash", reason: "not-enough-cash" });
    }

    city.treasury -= building.cost;
    city.tiles.set(tileKey(x, y), { buildingId });
    refreshHappiness(city);
    await city.save();
    res.json({ city: serializeCity(city) });
  } catch (error) {
    console.error("placeTile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// DELETE /city/tiles   { x, y }
export async function bulldozeTile(req, res) {
  try {
    const city = await City.findOne({ userId: req.user._id });
    if (!city) return res.status(404).json({ message: "No city yet" });

    const x = Number(req.body?.x);
    const y = Number(req.body?.y);
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      return res.status(400).json({ message: "Invalid tile" });
    }

    applyElapsedIncome(city);

    const key = tileKey(x, y);
    const tile = city.tiles.get(key);
    if (!tile) return res.status(400).json({ message: "Nothing to bulldoze there" });

    const building = getBuilding(tile.buildingId);
    city.tiles.delete(key);
    if (building) city.treasury += Math.floor(building.cost / 2);
    refreshHappiness(city);
    await city.save();
    res.json({ city: serializeCity(city) });
  } catch (error) {
    console.error("bulldozeTile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /city/tax   { residential?, business? }
export async function setTaxRates(req, res) {
  try {
    const city = await City.findOne({ userId: req.user._id });
    if (!city) return res.status(404).json({ message: "No city yet" });

    applyElapsedIncome(city);

    const clamp = (n) => Math.min(MAX_TAX_RATE, Math.max(MIN_TAX_RATE, n));
    const { residential, business } = req.body ?? {};
    if (residential !== undefined) {
      if (typeof residential !== "number" || Number.isNaN(residential)) {
        return res.status(400).json({ message: "Invalid residential tax rate" });
      }
      city.taxRates.residential = clamp(residential);
    }
    if (business !== undefined) {
      if (typeof business !== "number" || Number.isNaN(business)) {
        return res.status(400).json({ message: "Invalid business tax rate" });
      }
      city.taxRates.business = clamp(business);
    }

    refreshHappiness(city);
    await city.save();
    res.json({ city: serializeCity(city) });
  } catch (error) {
    console.error("setTaxRates error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
