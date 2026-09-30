// modules/school/bake.ts
//
// Folding the still scenery into a handful of meshes.
//
// Every wall, desk, bookshelf and tree in the school is a small box with a
// material of its own, and three.js draws each one separately: a full campus
// was ~3,800 draw calls a frame for ~70k triangles, with >95% of the frame
// spent walking that list rather than drawing (docs/room-game-handoff.md,
// "Performance"). Only a few hundred of those boxes ever move.
//
// So everything that stays still is merged: one mesh per kind of material,
// with each box's colour written into its vertices so that boxes of different
// colours still share one draw. The originals stay in the scene — React owns
// them and keeps updating them — but hidden and with their matrices frozen, so
// they cost next to nothing. Whatever changes them (a room bought, a wall
// repainted, the lights coming on) changes the signature, and the merge is
// simply done again.
//
// What must NOT be merged is marked `userData.live` (use `LIVE`): anything a
// frame loop moves or recolours. A live object is left exactly as it is, and
// so is everything under it.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** userData for an object that moves on its own: never merged, never frozen. */
export const LIVE = Object.freeze({ live: true });
/** userData for the same object while it is standing still. */
export const STILL = Object.freeze({ live: false });

const isLive = (o: THREE.Object3D) => o.userData?.live === true;

/** A stable number per material, for keys and the signature (three has one,
 *  but its typings do not). */
const ids = new WeakMap<object, number>();
let nextId = 1;
const idOf = (o: object) => {
  let id = ids.get(o);
  if (id === undefined) ids.set(o, (id = nextId++));
  return id;
};

/** A mesh the walk found that can be merged. */
export interface BakeItem {
  mesh: THREE.Mesh;
  material: THREE.Material;
}

/** Built by JSX (`<meshLambertMaterial color=… />`): owned by its one mesh and
 *  changed only through React, so its colour can be folded into the vertices.
 *  A material handed in as an object may be shared and animated (the neon
 *  tubes fade with the clock), so it has to stay the object it is. */
const ownedByJsx = (m: THREE.Material) => (m as unknown as { __r3f?: unknown }).__r3f !== undefined;

const hasColor = (m: THREE.Material): m is THREE.Material & { color: THREE.Color } =>
  (m as { color?: unknown }).color instanceof THREE.Color;

/** Folds this material's colour into the vertices, or keeps it whole. */
const foldsColour = (m: THREE.Material) => ownedByJsx(m) && hasColor(m) && !m.vertexColors;

/** Everything about a material except its colour: materials that agree on all
 *  of it can be drawn as one, colour coming from the vertices. */
function lookKey(m: THREE.Material): string {
  const a = m as THREE.Material & {
    map?: THREE.Texture | null;
    alphaMap?: THREE.Texture | null;
    emissive?: THREE.Color;
    emissiveIntensity?: number;
    wireframe?: boolean;
    fog?: boolean;
  };
  return [
    a.type,
    a.map?.id ?? "",
    a.alphaMap?.id ?? "",
    a.transparent,
    a.opacity,
    a.side,
    a.depthWrite,
    a.depthTest,
    a.blending,
    a.alphaTest,
    a.emissive?.getHex() ?? "",
    a.emissiveIntensity ?? "",
    a.toneMapped,
    a.fog ?? "",
    a.wireframe ?? "",
    a.polygonOffset,
    a.colorWrite,
  ].join("|");
}

// ── The walk ────────────────────────────────────────────────────────────────

const mix = (h: number, v: number) => Math.imul(h ^ (v | 0), 16777619) >>> 0;
const MAT_SCALE = 4096;

/**
 * Brings every matrix under `root` up to date (frozen ones included), finds the
 * meshes that can be merged, and fingerprints them: anything React changed
 * about them — geometry, material, colour, place — changes the number.
 *
 * `hidden` is what the last merge hid: those count as visible here, because
 * they are only hidden in favour of the merged copy.
 *
 * Objects outside any live subtree are frozen as a side effect: their world
 * matrices are exact as of this walk, and nothing but React can move them.
 */
export function walk(root: THREE.Object3D, hidden: ReadonlySet<THREE.Object3D>) {
  // The root may be frozen from the last walk, so it is recomputed like
  // everything else rather than trusted.
  root.parent?.updateWorldMatrix(true, false);
  const items: BakeItem[] = [];
  let sig = 2166136261;

  const visit = (o: THREE.Object3D, parent: THREE.Object3D | null) => {
    o.updateMatrix();
    if (parent) o.matrixWorld.multiplyMatrices(parent.matrixWorld, o.matrix);
    else o.matrixWorld.copy(o.matrix);
    if (!(o.visible || hidden.has(o))) {
      o.matrixAutoUpdate = true;
      return;
    }
    if (isLive(o)) {
      // Left alone, and so is everything under it — including any Baked of
      // its own, which merges what is inside it.
      o.matrixAutoUpdate = true;
      sig = mix(sig, o.id);
      return;
    }
    o.matrixAutoUpdate = false;
    const mesh = o as THREE.Mesh;
    if (
      mesh.isMesh &&
      !(mesh as THREE.InstancedMesh).isInstancedMesh &&
      !Array.isArray(mesh.material) &&
      mesh.geometry?.attributes.position &&
      // A mirrored mesh would come out inside out: merging keeps the winding.
      mesh.matrixWorld.determinant() > 0
    ) {
      const material = mesh.material as THREE.Material;
      items.push({ mesh, material });
      sig = mix(sig, mesh.geometry.id);
      sig = mix(sig, idOf(material));
      if (hasColor(material)) sig = mix(sig, material.color.getHex());
      sig = mix(sig, Math.round(material.opacity * 1000));
      sig = mix(sig, mesh.renderOrder);
      for (const e of mesh.matrixWorld.elements) sig = mix(sig, Math.round(e * MAT_SCALE));
    }
    for (const c of o.children) visit(c, o);
  };

  visit(root, root.parent);
  sig = mix(sig, items.length);
  return { items, signature: sig };
}

// ── The merge ───────────────────────────────────────────────────────────────

export interface Baked {
  /** The merged meshes, to add to the scene. */
  meshes: THREE.Mesh[];
  /** The originals the merged meshes stand in for: hide these. */
  replaced: THREE.Mesh[];
  /** Materials made for the merge, to dispose with it. */
  materials: THREE.Material[];
}

/**
 * Merges `items` into as few meshes as their materials allow, positioned
 * relative to `frame` (the object the merged meshes will be children of).
 */
export function merge(items: BakeItem[], frame: THREE.Matrix4): Baked {
  const toFrame = frame.clone().invert();
  const buckets = new Map<
    string,
    { material: THREE.Material; fold: boolean; renderOrder: number; geos: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }
  >();
  const m = new THREE.Matrix4();

  for (const { mesh, material } of items) {
    const fold = foldsColour(material);
    const src = mesh.geometry;
    const g = src.index ? src.toNonIndexed() : src.clone();
    g.clearGroups();
    g.morphAttributes = {};
    g.applyMatrix4(m.multiplyMatrices(toFrame, mesh.matrixWorld));
    if (fold) {
      const c = (material as THREE.Material & { color: THREE.Color }).color;
      const n = g.attributes.position.count;
      const rgb = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        rgb[i * 3] = c.r;
        rgb[i * 3 + 1] = c.g;
        rgb[i * 3 + 2] = c.b;
      }
      g.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
    }
    const attrs = Object.keys(g.attributes)
      .sort()
      .map((k) => `${k}${g.attributes[k].itemSize}`)
      .join(",");
    const key = `${fold ? lookKey(material) : `#${idOf(material)}`}|${mesh.renderOrder}|${attrs}`;
    let b = buckets.get(key);
    if (!b) {
      b = { material, fold, renderOrder: mesh.renderOrder, geos: [], meshes: [] };
      buckets.set(key, b);
    }
    b.geos.push(g);
    b.meshes.push(mesh);
  }

  const out: Baked = { meshes: [], replaced: [], materials: [] };
  for (const b of buckets.values()) {
    const geometry = mergeGeometries(b.geos, false);
    for (const g of b.geos) g.dispose();
    // Should not happen — every bucket agrees on its attributes — but if it
    // does, those meshes simply stay as they were.
    if (!geometry) continue;
    let material = b.material;
    if (b.fold) {
      material = b.material.clone();
      (material as THREE.Material & { color: THREE.Color }).color.setRGB(1, 1, 1);
      material.vertexColors = true;
      out.materials.push(material);
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = b.renderOrder;
    // The merge is a stand-in: nothing taps it, and an outer Baked leaves it be.
    mesh.raycast = () => {};
    mesh.userData = { ...LIVE };
    out.meshes.push(mesh);
    out.replaced.push(...b.meshes);
  }
  return out;
}

/** Throws a merge away. */
export function dispose(b: Baked) {
  for (const mesh of b.meshes) {
    mesh.removeFromParent();
    mesh.geometry.dispose();
  }
  for (const m of b.materials) m.dispose();
}
