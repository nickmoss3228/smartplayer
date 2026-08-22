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

export function grassTexture(): THREE.Texture {
  return draw("grass", (ctx) => {
    ctx.fillStyle = "#8bab6b";
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = "#7d9d5f";
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        if (hash(x * 5, y * 7) > 0.55) ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = "#98b878";
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        if (hash(x * 11, y * 13) > 0.88) ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}
