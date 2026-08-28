// modules/city/traffic.ts
//
// Purely cosmetic cars that wander the connected road network — the "add
// some people or cars moving to introduce the feel of a real city"
// requirement. No pathfinding to a destination, just a random walk from
// road tile to road tile; nobody is actually going anywhere.

import { Graphics } from "pixi.js";
import { tileKey } from "./placement";

const NEIGHBOR_DELTAS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

const CAR_COLORS = [0xef8a5c, 0x5c9eef, 0xf2c14e, 0xef5c8a, 0xffffff];

export interface Tile {
  x: number;
  y: number;
}

export interface Car {
  sprite: Graphics;
  from: Tile;
  to: Tile;
  /** 0..1 progress from `from` to `to`. */
  t: number;
  /** Tiles per second. */
  speed: number;
}

export function drawCar(): Graphics {
  const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  const g = new Graphics();
  g.roundRect(-7, -4, 14, 8, 3).fill({ color, alpha: 0.9 });
  g.roundRect(-4, -3.5, 8, 3, 1.5).fill({ color: 0xffffff, alpha: 0.55 });
  return g;
}

/** A random road neighbour of `tile`, preferring not to immediately
 *  backtrack to `avoid` unless it's the only option (a dead end). */
export function pickNextRoadTile(
  tile: Tile,
  avoid: Tile | null,
  roadTiles: Set<string>,
): Tile | null {
  const options: Tile[] = [];
  for (const [dx, dy] of NEIGHBOR_DELTAS) {
    const nx = tile.x + dx;
    const ny = tile.y + dy;
    if (!roadTiles.has(tileKey(nx, ny))) continue;
    if (avoid && nx === avoid.x && ny === avoid.y) continue;
    options.push({ x: nx, y: ny });
  }
  if (options.length === 0 && avoid && roadTiles.has(tileKey(avoid.x, avoid.y))) {
    return avoid;
  }
  if (options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)];
}
