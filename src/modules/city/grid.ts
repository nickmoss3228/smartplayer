// modules/city/grid.ts
//
// Renders the buildable plot: a checkerboard of soft tiles plus hairline
// gridlines. Milestone-1 scope only — no per-tile zone colour yet, that
// arrives with the build system in the next milestone.

import { Graphics } from "pixi.js";
import { GRID_SIZE, TILE_SIZE, GRID_ORIGIN_PX, GRID_SIZE_PX } from "./constants";

const TILE_LIGHT = 0xcdeccb;
const TILE_DARK = 0xc2e6bf;
const GRIDLINE = 0xffffff;

export function drawGrid(): Graphics {
  const g = new Graphics();

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const color = (x + y) % 2 === 0 ? TILE_LIGHT : TILE_DARK;
      g.rect(
        GRID_ORIGIN_PX + x * TILE_SIZE,
        GRID_ORIGIN_PX + y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      ).fill({ color });
    }
  }

  // Hairline lattice on top — cheap "blueprint" feel without per-tile borders
  // fighting the checkerboard for contrast.
  g.setStrokeStyle({ width: 1, color: GRIDLINE, alpha: 0.5 });
  for (let i = 0; i <= GRID_SIZE; i++) {
    const x = GRID_ORIGIN_PX + i * TILE_SIZE;
    g.moveTo(x, GRID_ORIGIN_PX).lineTo(x, GRID_ORIGIN_PX + GRID_SIZE_PX);
    const y = GRID_ORIGIN_PX + i * TILE_SIZE;
    g.moveTo(GRID_ORIGIN_PX, y).lineTo(GRID_ORIGIN_PX + GRID_SIZE_PX, y);
  }
  g.stroke();

  return g;
}
