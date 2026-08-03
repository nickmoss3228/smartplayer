import * as THREE from "three";
import { Swatch } from "../../config/shopCatalog";

// Wall/floor surfaces are drawn onto an offscreen 2D canvas at a small fixed
// resolution with image smoothing off, then handed to Three.js as a
// CanvasTexture with NearestFilter — that combination is what gives the
// flat/pixel-ish look without needing any actual image assets.
//
// Furniture/character used to live here too as flat drawn sprites, but they
// were rebuilt as real 3D box assemblies (see voxelModels.ts) so they read
// correctly from any angle instead of as 2D cutouts standing in a 3D room.
// Wallpaper/flooring stayed as canvas textures — they're real room surfaces
// (the wall/floor geometry itself), not standees, so the flat-cutout
// complaint never applied to them.
const SIZE = 64;

function makeCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement, repeat: [number, number] = [1, 1]): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function drawWallpaperTexture(swatch: Swatch): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  ctx.fillStyle = swatch.color;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = swatch.accent;

  if (swatch.shape === "stripe") {
    const stripeWidth = SIZE / 8;
    for (let x = 0; x < SIZE; x += stripeWidth * 2) {
      ctx.fillRect(x, 0, stripeWidth, SIZE);
    }
  } else if (swatch.shape === "dot") {
    const spacing = SIZE / 4;
    for (let y = spacing / 2; y < SIZE; y += spacing) {
      for (let x = spacing / 2; x < SIZE; x += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, spacing / 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (swatch.shape === "plaid") {
    const spacing = SIZE / 4;
    ctx.globalAlpha = 0.65;
    for (let x = 0; x < SIZE; x += spacing) {
      ctx.fillRect(x, 0, spacing / 3, SIZE);
    }
    for (let y = 0; y < SIZE; y += spacing) {
      ctx.fillRect(0, y, SIZE, spacing / 3);
    }
    ctx.globalAlpha = 1;
  }
  // "solid" draws no overlay — just the flat base fill above.

  return toTexture(canvas, [3, 1.5]);
}

export function drawFlooringTexture(swatch: Swatch): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  ctx.fillStyle = swatch.color;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = swatch.accent;
  ctx.lineWidth = 2;

  if (swatch.shape === "wood") {
    const plankHeight = SIZE / 4;
    for (let y = 0; y <= SIZE; y += plankHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SIZE, y);
      ctx.stroke();
    }
    // stagger a vertical seam per plank row for a brick-like wood look
    for (let row = 0; row < 4; row++) {
      const offset = row % 2 === 0 ? 0 : SIZE / 2;
      ctx.beginPath();
      ctx.moveTo(offset, row * plankHeight);
      ctx.lineTo(offset, (row + 1) * plankHeight);
      ctx.stroke();
    }
  } else if (swatch.shape === "tile") {
    const tileSize = SIZE / 2;
    for (let y = 0; y <= SIZE; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SIZE, y);
      ctx.stroke();
    }
    for (let x = 0; x <= SIZE; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SIZE);
      ctx.stroke();
    }
  } else if (swatch.shape === "carpet") {
    ctx.fillStyle = swatch.accent;
    // Deterministic pseudo-random speckle so the texture is stable across
    // re-renders of the same item (no Math.random reseed concerns since this
    // is only ever drawn once per item and cached via useMemo).
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed % 1000) / 1000;
    };
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(rand() * SIZE, rand() * SIZE, 1.5, 1.5);
    }
  } else if (swatch.shape === "stone") {
    const rows = 3;
    const rowHeight = SIZE / rows;
    for (let row = 0; row < rows; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * rowHeight);
      ctx.lineTo(SIZE, row * rowHeight);
      ctx.stroke();
      const offset = row % 2 === 0 ? 0 : SIZE / 6;
      for (let x = offset; x < SIZE; x += SIZE / 3) {
        ctx.beginPath();
        ctx.moveTo(x, row * rowHeight);
        ctx.lineTo(x, (row + 1) * rowHeight);
        ctx.stroke();
      }
    }
  }

  return toTexture(canvas, [4, 2.5]);
}
