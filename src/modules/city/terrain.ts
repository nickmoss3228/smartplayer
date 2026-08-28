// modules/city/terrain.ts
//
// Purely decorative "outside the plot" rendering — rolling hills and a few
// cloud-soft highlights, so panning away from the grid lands on Frutiger
// Aero grass instead of flat canvas background. Deterministic (seeded by
// index, not Math.random()) so it doesn't reshuffle every remount.

import { Graphics } from "pixi.js";
import { WORLD_SIZE_PX, GRID_ORIGIN_PX, GRID_SIZE_PX } from "./constants";
import { Territory, getTerritory, DEFAULT_TERRITORY_ID } from "../../config/territories";

/** Cheap deterministic pseudo-random in [0, 1), stable across renders. */
function hash(i: number): number {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

export function drawTerrain(territoryId: string = DEFAULT_TERRITORY_ID): Graphics {
  const territory: Territory = getTerritory(territoryId);
  const GRASS_BASE = territory.baseColor;
  const GRASS_HILL = territory.hillColor;
  const GRASS_HIGHLIGHT = territory.highlightColor;
  const g = new Graphics();

  g.rect(0, 0, WORLD_SIZE_PX, WORLD_SIZE_PX).fill({ color: GRASS_BASE });

  // Rolling hill blobs scattered around the border, avoiding the buildable
  // plot itself so they never get mistaken for tiles.
  const hillCount = 26;
  for (let i = 0; i < hillCount; i++) {
    const a = hash(i) * Math.PI * 2;
    const ringT = hash(i + 100);
    const radiusFromCenter = (GRID_SIZE_PX / 2) * (1 + ringT * 1.4);
    const cx = WORLD_SIZE_PX / 2 + Math.cos(a) * radiusFromCenter;
    const cy = WORLD_SIZE_PX / 2 + Math.sin(a) * radiusFromCenter;
    const r = 60 + hash(i + 200) * 90;
    g.circle(cx, cy, r).fill({ color: GRASS_HILL, alpha: 0.55 });
  }

  // Soft highlight dapples — the "glossy" half of Frutiger Aero grass.
  for (let i = 0; i < 40; i++) {
    const x = hash(i + 300) * WORLD_SIZE_PX;
    const y = hash(i + 400) * WORLD_SIZE_PX;
    const r = 10 + hash(i + 500) * 22;
    g.circle(x, y, r).fill({ color: GRASS_HIGHLIGHT, alpha: 0.35 });
  }

  // A soft light halo directly behind the buildable plot, so the grid reads
  // as "the important part" even before anything is built on it.
  g.rect(
    GRID_ORIGIN_PX - 24,
    GRID_ORIGIN_PX - 24,
    GRID_SIZE_PX + 48,
    GRID_SIZE_PX + 48,
  ).fill({ color: 0xffffff, alpha: 0.12 });

  return g;
}
