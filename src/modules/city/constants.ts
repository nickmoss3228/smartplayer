// modules/city/constants.ts
//
// Shared geometry for the city grid. Kept separate from cityCatalog.ts
// (which will hold building economics) because this is pure layout math that
// the canvas, the tile picker and the minimap will all need without pulling
// in the catalog.

/** Buildable plot: GRID_SIZE x GRID_SIZE tiles. */
export const GRID_SIZE = 24;

/** World-space size of one tile, in pixels at zoom 1. */
export const TILE_SIZE = 48;

/** Rings of decorative terrain (hills, grass) around the buildable plot, so
 *  panning past the edge of your city doesn't immediately hit empty canvas. */
export const TERRAIN_MARGIN_TILES = 10;

export const WORLD_SIZE_TILES = GRID_SIZE + TERRAIN_MARGIN_TILES * 2;
export const WORLD_SIZE_PX = WORLD_SIZE_TILES * TILE_SIZE;

/** Origin of the buildable grid within the larger world, in pixels. */
export const GRID_ORIGIN_PX = TERRAIN_MARGIN_TILES * TILE_SIZE;
export const GRID_SIZE_PX = GRID_SIZE * TILE_SIZE;

export function tileToWorld(x: number, y: number): { x: number; y: number } {
  return { x: GRID_ORIGIN_PX + x * TILE_SIZE, y: GRID_ORIGIN_PX + y * TILE_SIZE };
}

export function worldToTile(worldX: number, worldY: number): { x: number; y: number } {
  return {
    x: Math.floor((worldX - GRID_ORIGIN_PX) / TILE_SIZE),
    y: Math.floor((worldY - GRID_ORIGIN_PX) / TILE_SIZE),
  };
}

export function isInsideGrid(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
}
