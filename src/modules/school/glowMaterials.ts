// modules/school/glowMaterials.ts
//
// The materials everything that glows at night shares — lamp bulbs and their
// halos, the pools under the lampposts, every neon tube and the wash it throws
// down its wall — and the one function that turns them all up and down with
// the clock (NightDriver in NightLights.tsx calls it once a frame). Kept apart
// from the components so both Building.tsx and NightLights.tsx can use them.

import * as THREE from "three";

// ── Shared, clock-driven materials ─────────────────────────────────────────

const WARM = new THREE.Color("#fff1c9");
const BULB_OFF = new THREE.Color("#b8b4a8");

/** A soft round spot: white in the middle, clear at the edge. */
function radialTexture(): THREE.Texture {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** Bright along the top edge, fading to nothing below: the light a neon tube
 *  throws down the wall under it. */
function washTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1, 32);
  return new THREE.CanvasTexture(canvas);
}

export interface Glow {
  bulb: THREE.MeshBasicMaterial;
  halo: THREE.SpriteMaterial;
  pool: THREE.MeshBasicMaterial;
  tubes: Map<string, { mat: THREE.MeshBasicMaterial; off: THREE.Color; on: THREE.Color }>;
  washes: Map<string, THREE.MeshBasicMaterial>;
  wash: THREE.Texture;
  /** The latest level, for anything created after the driver last ran. */
  level: number;
}

let glow: Glow | null = null;

export function glowMaterials(): Glow {
  if (glow) return glow;
  const spot = radialTexture();
  glow = {
    bulb: new THREE.MeshBasicMaterial({ color: BULB_OFF.clone() }),
    halo: new THREE.SpriteMaterial({
      map: spot,
      color: "#ffd9a0",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    pool: new THREE.MeshBasicMaterial({
      map: spot,
      color: "#ffcf87",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    tubes: new Map(),
    washes: new Map(),
    wash: washTexture(),
    level: 0,
  };
  return glow;
}

/** A neon tube's material, one per colour: a dull glass tube by day, lit at
 *  night. */
export function neonTube(color: string): THREE.MeshBasicMaterial {
  const g = glowMaterials();
  let t = g.tubes.get(color);
  if (!t) {
    const on = new THREE.Color(color);
    const off = on.clone().lerp(new THREE.Color("#8a8e96"), 0.62);
    t = { mat: new THREE.MeshBasicMaterial({ color: off.clone().lerp(on, g.level) }), off, on };
    g.tubes.set(color, t);
  }
  return t.mat;
}

/** The coloured light a neon tube throws down the wall under it. */
export function neonWash(color: string): THREE.MeshBasicMaterial {
  const g = glowMaterials();
  let m = g.washes.get(color);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      map: g.wash,
      color,
      transparent: true,
      opacity: 0.34 * g.level,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    g.washes.set(color, m);
  }
  return m;
}

/** Sets every shared glow to `k`, 0 (off) to 1 (fully on). */
export function setGlow(k: number) {
  const g = glowMaterials();
  if (k === g.level) return;
  g.level = k;
  g.bulb.color.copy(BULB_OFF).lerp(WARM, k);
  g.halo.opacity = 0.6 * k;
  g.pool.opacity = 0.42 * k;
  for (const t of g.tubes.values()) t.mat.color.copy(t.off).lerp(t.on, k);
  for (const m of g.washes.values()) m.opacity = 0.34 * k;
}
