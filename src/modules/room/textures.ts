import * as THREE from "three";
import { Swatch } from "../../config/shopCatalog";

// Every texture is drawn onto an offscreen 2D canvas at a small fixed
// resolution with image smoothing off, then handed to Three.js as a
// CanvasTexture with NearestFilter — that combination is what gives the
// flat/pixel-ish look without needing any actual image assets. This file is
// the one seam to swap in real sprite images later (replace the draw*
// functions' bodies with `ctx.drawImage(loadedSprite, ...)`).
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

let emptySlotTexture: THREE.CanvasTexture | null = null;

// Shared placeholder for an unowned/empty slot — a dashed outline + "+" so
// the shape reads as "tap a shop item to fill this" rather than a bug.
export function getEmptySlotTexture(): THREE.CanvasTexture {
  if (emptySlotTexture) return emptySlotTexture;
  const { canvas, ctx } = makeCanvas();
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(4, 4, SIZE - 8, SIZE - 8);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("+", SIZE / 2, SIZE / 2);
  emptySlotTexture = toTexture(canvas);
  return emptySlotTexture;
}

// Furniture/decor sprites are drawn once, un-tiled (repeat 1x1), and
// composited as a single flat icon on their slot's plane.
export function drawFurnitureSprite(swatch: Swatch): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  ctx.clearRect(0, 0, SIZE, SIZE);

  switch (swatch.shape) {
    case "bed":
      ctx.fillStyle = "#8b5e3c";
      ctx.fillRect(4, 40, 56, 20); // frame
      ctx.fillStyle = swatch.color;
      ctx.fillRect(6, 24, 52, 20); // mattress
      ctx.fillStyle = swatch.accent;
      ctx.fillRect(8, 20, 16, 12); // pillow
      break;
    case "canopybed":
      ctx.strokeStyle = "#8b5e3c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(10, 8);
      ctx.lineTo(10, 40);
      ctx.moveTo(54, 8);
      ctx.lineTo(54, 40);
      ctx.stroke();
      ctx.fillStyle = swatch.color;
      ctx.beginPath();
      ctx.moveTo(6, 10);
      ctx.quadraticCurveTo(32, -6, 58, 10);
      ctx.lineTo(58, 16);
      ctx.quadraticCurveTo(32, 2, 6, 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8b5e3c";
      ctx.fillRect(4, 44, 56, 16); // frame
      ctx.fillStyle = swatch.accent;
      ctx.fillRect(6, 34, 52, 12); // mattress
      break;
    case "bunkbed":
      ctx.fillStyle = "#8b5e3c";
      ctx.fillRect(4, 8, 56, 4);
      ctx.fillRect(4, 8, 4, 52);
      ctx.fillRect(56, 8, 4, 52);
      ctx.fillStyle = swatch.color;
      ctx.fillRect(8, 12, 48, 14);
      ctx.fillRect(8, 38, 48, 14);
      ctx.fillStyle = swatch.accent;
      ctx.fillRect(10, 12, 12, 8);
      ctx.fillRect(10, 38, 12, 8);
      break;
    case "plant":
      ctx.fillStyle = swatch.accent;
      ctx.fillRect(22, 44, 20, 16); // pot
      ctx.fillStyle = swatch.color;
      ctx.beginPath();
      ctx.ellipse(32, 30, 16, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "rug":
      ctx.fillStyle = swatch.color;
      ctx.beginPath();
      ctx.ellipse(32, 44, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = swatch.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(32, 44, 18, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "cactus":
      ctx.fillStyle = swatch.accent; // pot
      ctx.fillRect(22, 46, 20, 14);
      ctx.fillStyle = swatch.color;
      ctx.fillRect(28, 16, 8, 32); // main stem
      ctx.fillRect(18, 26, 8, 16); // left arm
      ctx.fillRect(38, 22, 8, 20); // right arm
      break;
    case "bookshelf": {
      ctx.fillStyle = swatch.accent; // frame
      ctx.fillRect(8, 8, 48, 48);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(10, 10, 44, 20);
      ctx.fillRect(10, 34, 44, 20);
      const bookColors = ["#e76f51", "#2a9d8f", "#e9c46a", "#264653"];
      bookColors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(12 + i * 10, 12, 8, 16);
      });
      break;
    }
    case "lamp":
      ctx.fillStyle = swatch.accent; // stand
      ctx.fillRect(30, 30, 4, 24);
      ctx.beginPath();
      ctx.arc(32, 54, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = swatch.color; // shade
      ctx.beginPath();
      ctx.moveTo(16, 30);
      ctx.lineTo(48, 30);
      ctx.lineTo(42, 12);
      ctx.lineTo(22, 12);
      ctx.closePath();
      ctx.fill();
      break;
    case "wardrobe":
      ctx.fillStyle = swatch.color; // body
      ctx.fillRect(10, 6, 44, 56);
      ctx.strokeStyle = swatch.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(32, 6);
      ctx.lineTo(32, 62);
      ctx.stroke();
      ctx.fillStyle = swatch.accent; // door handles
      ctx.beginPath();
      ctx.arc(28, 34, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(36, 34, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "table":
      ctx.fillStyle = swatch.accent; // legs
      ctx.fillRect(14, 40, 4, 20);
      ctx.fillRect(46, 40, 4, 20);
      ctx.fillStyle = swatch.color; // tabletop
      ctx.fillRect(10, 30, 44, 10);
      break;
    case "shelf":
      ctx.fillStyle = swatch.color; // plank
      ctx.fillRect(6, 40, 52, 8);
      ctx.fillStyle = swatch.accent; // small objects sitting on it
      ctx.fillRect(14, 24, 8, 16);
      ctx.beginPath();
      ctx.arc(40, 32, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "poster-music":
      ctx.fillStyle = swatch.color;
      ctx.fillRect(8, 8, 48, 40);
      ctx.strokeStyle = swatch.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16, 40);
      ctx.lineTo(16, 18);
      ctx.moveTo(30, 40);
      ctx.lineTo(30, 14);
      ctx.stroke();
      ctx.fillStyle = swatch.accent;
      ctx.beginPath();
      ctx.ellipse(13, 41, 4, 3, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(27, 41, 4, 3, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "poster-abstract":
      ctx.fillStyle = swatch.color;
      ctx.fillRect(8, 8, 48, 40);
      ctx.fillStyle = swatch.accent;
      ctx.beginPath();
      ctx.arc(24, 24, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(36, 18);
      ctx.lineTo(50, 30);
      ctx.lineTo(36, 42);
      ctx.closePath();
      ctx.fill();
      break;
    case "poster-stars":
      ctx.fillStyle = swatch.color;
      ctx.fillRect(8, 8, 48, 40);
      ctx.fillStyle = swatch.accent;
      [[20, 20], [40, 18], [30, 32], [46, 34]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    case "poster-map":
      ctx.fillStyle = swatch.color;
      ctx.fillRect(8, 8, 48, 40);
      ctx.fillStyle = swatch.accent;
      ctx.fillRect(14, 14, 14, 10);
      ctx.fillRect(32, 20, 16, 14);
      ctx.fillRect(16, 30, 10, 10);
      break;
  }

  return toTexture(canvas);
}
