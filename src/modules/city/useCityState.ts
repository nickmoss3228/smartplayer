// modules/city/useCityState.ts
//
// City state for the page, backed by the server (see services/cityService.ts
// and backend/src/controllers/city.controller.js). Like the Dream School's
// useSchoolState, mutations are NOT applied optimistically — the server is
// the only place that computes the elapsed-income catch-up, so every action
// round-trips and replaces local state with whatever comes back. That's also
// what makes "leave and keep earning" correct: the treasury number here is
// only ever a snapshot, refreshed on every placement/bulldoze/tax change and
// interpolated client-side between those (see incomePerSec ticking below).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BUILDINGS, ROAD_ID } from "../../config/cityCatalog";
import { connectedRoadTiles, tileKey, TileMap } from "./placement";
import {
  CityState,
  CityTaxRates,
  bulldozeTileRequest,
  createCity as createCityRequest,
  fetchCity,
  placeTileRequest,
  setTaxRatesRequest,
} from "../../services/cityService";

export interface CityActionResult {
  ok: boolean;
  reason?: string;
}

function toTileMap(city: CityState): TileMap {
  const map: TileMap = new Map();
  for (const [key, tile] of Object.entries(city.tiles)) {
    map.set(key, { buildingId: tile.buildingId });
  }
  return map;
}

function extractReason(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "response" in err) {
    const res = (err as { response?: { data?: { reason?: string; message?: string } } }).response;
    return res?.data?.reason ?? res?.data?.message;
  }
  return undefined;
}

export function useCityState() {
  const [city, setCity] = useState<CityState | null>(null);
  const [tiles, setTiles] = useState<TileMap>(() => new Map());
  const [loading, setLoading] = useState(true);
  /** Server says "you don't have a city yet" — page shows the creation modal. */
  const [needsCreation, setNeedsCreation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [bulldozeMode, setBulldozeMode] = useState(false);

  // The server only gives us a point-in-time treasury; between round-trips we
  // interpolate locally at the last-known income rate so the number on
  // screen counts up smoothly instead of jumping once per action.
  const displayBase = useRef({ treasury: 0, at: Date.now(), incomePerSec: 0 });
  const [displayTreasury, setDisplayTreasury] = useState(0);

  const applyCity = useCallback((next: CityState) => {
    setCity(next);
    setTiles(toTileMap(next));
    displayBase.current = { treasury: next.treasury, at: Date.now(), incomePerSec: next.incomePerSec };
    setDisplayTreasury(next.treasury);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCity()
      .then((c) => {
        if (cancelled) return;
        applyCity(c);
      })
      .catch((err) => {
        if (cancelled) return;
        if ((err as { response?: { status?: number } })?.response?.status === 404) {
          setNeedsCreation(true);
        } else {
          setError(extractReason(err) ?? "Could not load your city");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyCity]);

  // Smooth $/s ticker between server round-trips.
  useEffect(() => {
    if (!city) return;
    const id = window.setInterval(() => {
      const { treasury, at, incomePerSec } = displayBase.current;
      const elapsed = (Date.now() - at) / 1000;
      setDisplayTreasury(Math.max(0, treasury + incomePerSec * elapsed));
    }, 250);
    return () => window.clearInterval(id);
  }, [city]);

  const connectedRoads = useMemo(() => connectedRoadTiles(tiles), [tiles]);

  const createCity = useCallback(
    async (name: string, territoryId: string): Promise<CityActionResult> => {
      setBusy(true);
      try {
        const c = await createCityRequest(name, territoryId);
        applyCity(c);
        setNeedsCreation(false);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: extractReason(err) ?? "Could not found your city" };
      } finally {
        setBusy(false);
      }
    },
    [applyCity],
  );

  const placeTile = useCallback(
    async (x: number, y: number, buildingId: string): Promise<CityActionResult> => {
      if (busy) return { ok: false, reason: "busy" };
      setBusy(true);
      try {
        const c = await placeTileRequest(x, y, buildingId);
        applyCity(c);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: extractReason(err) ?? "Could not build that" };
      } finally {
        setBusy(false);
      }
    },
    [applyCity, busy],
  );

  const bulldozeTile = useCallback(
    async (x: number, y: number): Promise<CityActionResult> => {
      if (busy) return { ok: false, reason: "busy" };
      setBusy(true);
      try {
        const c = await bulldozeTileRequest(x, y);
        applyCity(c);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: extractReason(err) ?? "Could not bulldoze that" };
      } finally {
        setBusy(false);
      }
    },
    [applyCity, busy],
  );

  const setTaxRates = useCallback(
    async (patch: Partial<CityTaxRates>): Promise<CityActionResult> => {
      try {
        const c = await setTaxRatesRequest(patch);
        applyCity(c);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: extractReason(err) ?? "Could not change tax rates" };
      }
    },
    [applyCity],
  );

  return {
    city,
    tiles,
    treasury: displayTreasury,
    incomePerSec: city?.incomePerSec ?? 0,
    taxRates: city?.taxRates ?? { residential: 1, business: 1 },
    happiness: city?.happiness ?? 100,
    connectedRoads,
    buildings: BUILDINGS,
    loading,
    needsCreation,
    error,
    busy,
    selectedBuildingId,
    setSelectedBuildingId,
    bulldozeMode,
    setBulldozeMode,
    createCity,
    placeTile,
    bulldozeTile,
    setTaxRates,
    roadId: ROAD_ID,
    tileKey,
  };
}

export type UseCityStateResult = ReturnType<typeof useCityState>;
