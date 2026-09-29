// modules/character/portrait.ts
//
// The navbar's and the dashboard's picture of you: the same 3D figure the
// school and the creator draw, photographed head-and-shoulders from a little
// to one side. Rendered once per look into a PNG and cached
// (useCharacterPortrait.ts), so no page but the one you are dressing keeps a
// live 3D canvas for a 32-pixel icon.
//
// Loaded on demand. three.js is not in the bundle every page ships; this file
// is what pulls it in, and only when a portrait is not already cached.

import * as THREE from "three";
import { CharacterLook } from "./look";
import { jointPositions } from "./figureParts";
import { FIGURE_MATERIAL, figureGeometries } from "./figureGeometry";

let renderer: THREE.WebGLRenderer | null = null;
let failed = false;

/** One renderer for every portrait, made on first use. */
function getRenderer(size: number): THREE.WebGLRenderer | null {
  if (failed) return null;
  if (!renderer) {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch {
      // No WebGL: the 2D portrait stays.
      failed = true;
      return null;
    }
  }
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  return renderer;
}

/** The figure, standing, assembled from its joints as plain three.js. */
function figureObject(look: CharacterLook): THREE.Group {
  const geo = figureGeometries(look, false);
  const at = jointPositions(false);
  const mesh = (g: THREE.BufferGeometry | null) => (g ? new THREE.Mesh(g, FIGURE_MATERIAL) : new THREE.Group());
  const joint = (name: keyof typeof at, g: THREE.BufferGeometry | null) => {
    const j = new THREE.Group();
    j.position.set(...at[name]);
    j.add(mesh(g));
    return j;
  };
  const root = new THREE.Group();
  root.add(joint("legL", geo.legL), joint("legR", geo.legR));
  const torso = joint("torso", geo.torso);
  const armL = joint("armL", geo.armL);
  const armR = joint("armR", geo.armR);
  // Arms a touch out from the sides, the way somebody stands for a photo.
  armL.rotation.z = -0.08;
  armR.rotation.z = 0.08;
  torso.add(armL, armR, joint("head", geo.head));
  root.add(torso);
  return root;
}

/**
 * A PNG data URL of the character, `size` pixels square, on a pale sky-blue
 * disc — the school's own daytime sky. Empty if the browser has no WebGL.
 */
export function renderPortrait(look: CharacterLook, size = 128): string {
  const r = getRenderer(size);
  if (!r) return "";

  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight("#fff6e6", "#b0a695", 1.25);
  const key = new THREE.DirectionalLight("#fff6e6", 1.3);
  key.position.set(1.5, 3, 3);
  const fill = new THREE.DirectionalLight("#b7cadb", 0.45);
  fill.position.set(-3, 1, -1);
  scene.add(hemi, key, fill);

  const figure = figureObject(look);
  // Three-quarters on, like the camera in the school sees people.
  figure.rotation.y = -0.45;
  scene.add(figure);

  // Head and shoulders: from the chest (y ≈ 0.72) to above a hat (≈ 1.52).
  const half = 0.42;
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 20);
  camera.position.set(0, 1.28, 4);
  camera.lookAt(0, 1.12, 0);

  r.setClearColor("#000000", 0);
  r.render(scene, camera);

  // Onto a 2D canvas with the backdrop, so the icon is a round picture rather
  // than a figure floating on whatever the navbar is.
  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const ctx = out.getContext("2d");
  if (!ctx) return r.domElement.toDataURL("image/png");
  ctx.fillStyle = "#d8ebf6";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(r.domElement, 0, 0, size, size);
  return out.toDataURL("image/png");
}
