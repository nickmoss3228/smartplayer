// modules/character/figureGeometry.ts
//
// figureParts.ts as meshes: one geometry per joint, every box of that joint
// merged into it with its colour baked into the vertices. A person is seven
// draw calls however much they are wearing — it used to be one per box, about
// thirteen, before anybody could have a ponytail or glasses — which is what
// lets a phone draw the school at a finer scale (renderScale.ts) without
// paying for it twice.
//
// Geometries are cached by look and pose and shared by everybody who looks
// the same, which in a school of uniformed staff and indexed students is a
// lot of people. The cache is never emptied: there are only so many looks.

import * as THREE from "three";
import { CharacterLook, lookKey } from "./look";
import { FigureParts, Joint, Part, figureParts } from "./figureParts";

export type FigureGeometries = Record<Joint, THREE.BufferGeometry | null>;

const cache = new Map<string, FigureGeometries>();

/** Every person's one material: flat Lambert, colour from the vertices. */
export const FIGURE_MATERIAL = new THREE.MeshLambertMaterial({ vertexColors: true });

/** The soft dark disc under everybody's feet, shared. */
export const SHADOW_GEOMETRY = new THREE.CircleGeometry(0.3, 10);
export const SHADOW_MATERIAL = new THREE.MeshBasicMaterial({
  color: "#000000",
  transparent: true,
  opacity: 0.16,
  depthWrite: false,
});

function mergeBoxes(parts: Part[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const colour = new THREE.Color();
  for (const part of parts) {
    const b = new THREE.BoxGeometry(part.s[0], part.s[1], part.s[2]);
    b.translate(part.p[0], part.p[1], part.p[2]);
    const pos = b.getAttribute("position");
    const nor = b.getAttribute("normal");
    const idx = b.getIndex();
    const base = positions.length / 3;
    // Set from hex, which converts to the renderer's linear working space —
    // the same conversion a material's `color` gets, so a vertex colour and a
    // material colour of the same hex come out the same.
    colour.set(part.c);
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      colors.push(colour.r, colour.g, colour.b);
    }
    if (idx) for (let i = 0; i < idx.count; i++) indices.push(base + idx.getX(i));
    b.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeBoundingSphere();
  return g;
}

export function geometriesFor(parts: FigureParts): FigureGeometries {
  const out = {} as FigureGeometries;
  for (const joint of Object.keys(parts) as Joint[]) {
    out[joint] = parts[joint].length ? mergeBoxes(parts[joint]) : null;
  }
  return out;
}

/** The meshes for one look in one pose, shared with everybody else in it. */
export function figureGeometries(look: CharacterLook, sitting: boolean, seatTop?: number): FigureGeometries {
  const key = `${lookKey(look)}|${sitting ? `sit${seatTop ?? ""}` : "stand"}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = geometriesFor(figureParts(look, sitting, seatTop));
    cache.set(key, hit);
  }
  return hit;
}
