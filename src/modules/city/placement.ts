// modules/city/placement.ts
//
// Pure tile-map logic: no Pixi, no React. Shared by the canvas (for the
// hover ghost) and the page (for the actual mutation), and mirrored by the
// backend controller, so "can I build this here" is decided the same way on
// both sides.
//
// Road rule: a road can be placed on any empty tile in the grid — no
// adjacency requirement. An earlier version required the first road to
// touch column x=0 specifically (modeling a future inter-city connection
// point), but that rule was invisible to the player: there's no marker on
// the grid showing which column that is, so clicking anywhere else on an
// empty plot silently failed with "needs a connected road" and there was no
// way to build anything at all. Phase 2 can reintroduce an edge-connection
// requirement once there's an actual edge to connect to (see the project
// plan) — until then, every other building just needs to be next to
// whatever road tiles already exist.

import { getBuilding, ROAD_ID } from "../../config/cityCatalog";
import { isInsideGrid } from "./constants";

export interface PlacedTile {
  buildingId: string;
}

export type TileMap = Map<string, PlacedTile>;

export const tileKey = (x: number, y: number): string => `${x}_${y}`;

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Every tile that's a road, full stop — no connectivity/reachability
 *  computed. Kept as its own pass (rather than inlined at each call site) so
 *  the hover ghost can compute it once per frame instead of once per
 *  candidate tile. */
export function connectedRoadTiles(tiles: TileMap): Set<string> {
  const roads = new Set<string>();
  for (const [key, tile] of tiles) {
    if (tile.buildingId === ROAD_ID) roads.add(key);
  }
  return roads;
}

function hasRoadNeighbor(x: number, y: number, roadTiles: Set<string>): boolean {
  return NEIGHBORS.some(([dx, dy]) => roadTiles.has(tileKey(x + dx, y + dy)));
}

export interface PlacementCheck {
  ok: boolean;
  reason?: "out-of-bounds" | "occupied" | "unknown-building" | "no-road-access";
}

export function checkPlacement(
  tiles: TileMap,
  x: number,
  y: number,
  buildingId: string,
  roadTiles: Set<string>,
): PlacementCheck {
  if (!isInsideGrid(x, y)) return { ok: false, reason: "out-of-bounds" };
  if (tiles.has(tileKey(x, y))) return { ok: false, reason: "occupied" };

  const building = getBuilding(buildingId);
  if (!building) return { ok: false, reason: "unknown-building" };

  if (!building.requiresRoad) return { ok: true };
  if (hasRoadNeighbor(x, y, roadTiles)) return { ok: true };
  return { ok: false, reason: "no-road-access" };
}
