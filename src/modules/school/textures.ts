// modules/school/textures.ts
//
// Floor patterns, drawn once into a tiny canvas and tiled. A 16×16 canvas with
// NearestFilter is what makes a floor read as pixel art rather than as a
// gradient — and it is also why the pattern survives the low-resolution render
// in SchoolCanvas.tsx instead of dissolving into mush.
//
// Textures are cached by id and never disposed: there are six of them, they are
// a few kilobytes each, and re-creating one on every wallpaper change would
// churn GPU uploads during exactly the interaction that should feel instant.

import * as THREE from "three";
import { SchoolSurface } from "../../config/schoolCatalog";
import type { Season } from "./atmosphere";

const TILE = 16;
const cache = new Map<string, THREE.Texture>();

function draw(id: string, paint: (ctx: CanvasRenderingContext2D) => void): THREE.Texture {
  const hit = cache.get(id);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.imageSmoothingEnabled = false;
  paint(ctx);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(id, tex);
  return tex;
}

// One deterministic "random" per pixel — a real Math.random() would make the
// texture different on every reload, which is a surprisingly visible flicker
// when the page is refreshed mid-session.
const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

export function floorTexture(floor: SchoolSurface): THREE.Texture {
  const base = floor.color;
  const alt = floor.alt ?? floor.color;

  switch (floor.id) {
    case "checker":
      return draw(floor.id, (ctx) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, TILE, TILE);
        ctx.fillStyle = alt;
        ctx.fillRect(0, 0, TILE / 2, TILE / 2);
        ctx.fillRect(TILE / 2, TILE / 2, TILE / 2, TILE / 2);
      });

    case "parquet":
    case "oak":
      // Planks running east–west, offset every other row so the seams stagger.
      return draw(floor.id, (ctx) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, TILE, TILE);
        ctx.fillStyle = alt;
        for (let y = 0; y < TILE; y += 4) {
          ctx.fillRect(0, y, TILE, 1);
          ctx.fillRect(((y / 4) % 2) * (TILE / 2), y, 1, 4);
        }
      });

    case "carpet":
      return draw(floor.id, (ctx) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, TILE, TILE);
        ctx.fillStyle = alt;
        for (let y = 0; y < TILE; y++) {
          for (let x = 0; x < TILE; x++) {
            if (hash(x, y) > 0.62) ctx.fillRect(x, y, 1, 1);
          }
        }
      });

    default:
      // Lino and concrete: flat with a faint speckle and a tile seam.
      return draw(floor.id, (ctx) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, TILE, TILE);
        ctx.fillStyle = alt;
        for (let y = 0; y < TILE; y++) {
          for (let x = 0; x < TILE; x++) {
            if (hash(x * 3, y * 3) > 0.78) ctx.fillRect(x, y, 1, 1);
          }
        }
        ctx.fillRect(0, 0, TILE, 1);
        ctx.fillRect(0, 0, 1, TILE);
      });
  }
}

/** Grass for the grounds, by season: green, turning gold with leaf litter in
 *  autumn, under snow in winter. Cached per season like everything else. */
export function grassTexture(season: Season = "summer"): THREE.Texture {
  const tones =
    season === "winter"
      ? { base: "#e7edf1", speck: "#d3dce4", fleck: "#ffffff" }
      : season === "autumn"
        ? { base: "#9aa663", speck: "#8b9757", fleck: "#c9913f" }
        : { base: "#8bab6b", speck: "#7d9d5f", fleck: "#98b878" };
  return draw(`grass-${season}`, (ctx) => {
    ctx.fillStyle = tones.base;
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = tones.speck;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        if (hash(x * 5, y * 7) > 0.55) ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = tones.fleck;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        if (hash(x * 11, y * 13) > 0.88) ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

// ── The outside ─────────────────────────────────────────────────────────────
// One tile per metre, like the floors, which is what keeps a brick the same
// size on a 3m wall and a 20m one.

/** Brick: four courses a metre, every other course offset by half a brick. */
export function brickTexture(id: string, brick: string, mortar: string, shade: string): THREE.Texture {
  return draw(`brick-${id}`, (ctx) => {
    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, TILE, TILE);
    for (let row = 0; row < 4; row++) {
      const y = row * 4;
      const offset = row % 2 ? 4 : 0;
      for (let x = -offset; x < TILE; x += 8) {
        ctx.fillStyle = hash(x + 3, row * 7) > 0.7 ? shade : brick;
        const left = Math.max(0, x);
        ctx.fillRect(left, y, Math.min(TILE, x + 7) - left, 3);
      }
    }
  });
}

/** Timber cladding: vertical boards with a dark gap between them. */
export function boardsTexture(id: string, board: string, gap: string): THREE.Texture {
  return draw(`boards-${id}`, (ctx) => {
    ctx.fillStyle = board;
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = gap;
    for (let x = 0; x < TILE; x += 4) ctx.fillRect(x, 0, 1, TILE);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        if (hash(x * 9, y * 3) > 0.9) ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

/** Dressed stone: big uneven blocks. */
export function stoneTexture(id: string, stone: string, joint: string, shade: string): THREE.Texture {
  return draw(`stone-${id}`, (ctx) => {
    ctx.fillStyle = joint;
    ctx.fillRect(0, 0, TILE, TILE);
    for (let row = 0; row < 2; row++) {
      const offset = row ? 5 : 0;
      for (let x = -offset; x < TILE; x += 10) {
        ctx.fillStyle = hash(x + 11, row * 5) > 0.55 ? shade : stone;
        const left = Math.max(0, x);
        ctx.fillRect(left, row * 8, Math.min(TILE, x + 9) - left, 7);
      }
    }
  });
}

/** Roof gravel: pale chippings with dark flecks. */
export function gravelTexture(): THREE.Texture {
  return draw("gravel", (ctx) => {
    ctx.fillStyle = "#a19d95";
    ctx.fillRect(0, 0, TILE, TILE);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const h = hash(x * 7, y * 5);
        if (h > 0.7) {
          ctx.fillStyle = h > 0.88 ? "#7c786f" : "#b7b3aa";
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  });
}

/**
 * Roof tiles: one course per tile height, a shadow line under each, and joints
 * staggered course to course. White where the tile is plain, so the material's
 * colour tints it — one texture serves red tile, slate and snow alike.
 */
export function roofTilesTexture(): THREE.Texture {
  return draw("roof-tiles", (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, TILE, TILE);
    // Two courses per tile. Canvas y runs down and texture v runs up, so the
    // bottom rows of each course are its lower edge: where it overlaps the
    // course below and throws its shadow.
    const half = TILE / 2;
    for (const [top, joints] of [
      [0, [3, 11]],
      [half, [7, 15]],
    ] as const) {
      ctx.fillStyle = "#c4c4c4";
      ctx.fillRect(0, top + half - 2, TILE, 2);
      ctx.fillStyle = "#e3e3e3";
      for (const x of joints) ctx.fillRect(x, top, 1, half - 2);
    }
  });
}
