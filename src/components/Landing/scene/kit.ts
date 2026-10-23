import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

/**
 * The landing scene's drawing kit: the two materials everything is made of
 * (white clay, ink), the ink outline, fat lines, canvas-drawn labels and the
 * soft contact shadow. Colours are the app's: ink, the level green, the signal red.
 */

export const INK = 0x0f151c;
export const GREEN = 0x00c951;
export const RED = 0xe5484d;
export const SANS = 'Manrope, system-ui, sans-serif';
export const MONO = 'ui-monospace, "Cascadia Mono", "JetBrains Mono", Menlo, Consolas, monospace';

/** Frame-rate independent easing towards a target. */
export const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
export const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export interface LabelOptions {
  fg?: string;
  bg?: string;
  border?: string | null;
  h?: number;
  font?: number;
  mono?: boolean;
}

export interface Kit {
  clay: THREE.MeshStandardMaterial;
  inkMat: THREE.MeshStandardMaterial;
  /** An ink line around `mesh`: its back faces, pushed out along the normals by `thickness`. */
  outline(mesh: THREE.Mesh, thickness: number): THREE.Mesh;
  /** A screen-space line `width` px wide through 2D points, at depth z. */
  fatLine(points: readonly { x: number; y: number }[], color: number, width: number, z?: number, closed?: boolean): Line2;
  canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture;
  texture(url: string, onLoad?: (t: THREE.Texture) => void): THREE.Texture;
  /** The soft shadow under a figure or an object, lying on the floor. */
  shadow(w: number, d: number): THREE.Mesh;
  /** A pill that always faces the camera. */
  label(text: string, opts?: LabelOptions): THREE.Sprite;
  /** Mark materials that animate their own opacity, so a scene fade leaves them alone. */
  own(...mats: THREE.Material[]): void;
  /** Fade a whole scene, except the materials marked `own` (they multiply by it themselves). */
  setOpacity(obj: THREE.Object3D, o: number): void;
  /** Fat lines are sized in pixels, so they need the canvas size. */
  setResolution(w: number, h: number): void;
}

export function createKit(): Kit {
  const clay = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, envMapIntensity: 0.75 });
  const inkMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.45, metalness: 0.1 });
  const loader = new THREE.TextureLoader();

  const outlineMats = new Map<string, THREE.MeshBasicMaterial>();
  const outline = (mesh: THREE.Mesh, thickness: number) => {
    const key = thickness.toFixed(4);
    let m = outlineMats.get(key);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
      m.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normal * ${key};`);
      };
      // Programs are cached by onBeforeCompile's source, which is the same for
      // every thickness: without a key of their own they would share one.
      m.customProgramCacheKey = () => `landing-outline-${key}`;
      outlineMats.set(key, m);
    }
    const o = new THREE.Mesh(mesh.geometry, m);
    mesh.add(o);
    return o;
  };

  const lineMats: LineMaterial[] = [];
  const fatLine: Kit['fatLine'] = (points, color, width, z = 0, closed = false) => {
    const pos: number[] = [];
    points.forEach((p) => pos.push(p.x, p.y, z));
    if (closed) pos.push(points[0].x, points[0].y, z);
    const g = new LineGeometry();
    g.setPositions(pos);
    const m = new LineMaterial({ color, linewidth: width, transparent: true, opacity: 1, depthWrite: false });
    lineMats.push(m);
    return new Line2(g, m);
  };

  const canvasTex: Kit['canvasTex'] = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (ctx) draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };

  const texture: Kit['texture'] = (url, onLoad) => {
    const t = loader.load(url, onLoad);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };

  const shadowTex = canvasTex(256, 256, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(15,21,28,.32)');
    g.addColorStop(0.55, 'rgba(15,21,28,.1)');
    g.addColorStop(1, 'rgba(15,21,28,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  const shadow = (w: number, d: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
  };

  const label: Kit['label'] = (text, { fg = '#0f151c', bg = '#ffffff', border = '#e0e7ed', h = 0.2, font = 600, mono = false } = {}) => {
    const fs = 54;
    const padX = 34;
    const H = 96;
    const family = mono ? MONO : SANS;
    const meas = document.createElement('canvas').getContext('2d');
    if (meas) meas.font = `${font} ${fs}px ${family}`;
    const W = Math.ceil(meas ? meas.measureText(text).width : text.length * fs * 0.6) + padX * 2;
    const t = canvasTex(W, H, (c, w, hh) => {
      roundRect(c, 3, 3, w - 6, hh - 6, (hh - 6) / 2);
      c.fillStyle = bg;
      c.fill();
      if (border) {
        c.lineWidth = 4;
        c.strokeStyle = border;
        c.stroke();
      }
      c.fillStyle = fg;
      c.font = `${font} ${fs}px ${family}`;
      c.textBaseline = 'middle';
      c.textAlign = 'center';
      c.fillText(text, w / 2, hh / 2 + 3);
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
    s.scale.set((h * W) / H, h, 1);
    s.renderOrder = 20;
    return s;
  };

  const own = (...mats: THREE.Material[]) => mats.forEach((m) => (m.userData.own = true));

  const setOpacity = (obj: THREE.Object3D, o: number) => {
    obj.traverse((n) => {
      const mat = (n as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!mat) return;
      (Array.isArray(mat) ? mat : [mat]).forEach((m) => {
        if (m.userData.own) return;
        if (m.userData.baseOpacity === undefined) {
          m.userData.baseOpacity = m.opacity;
          m.userData.baseTransparent = m.transparent;
        }
        m.opacity = m.userData.baseOpacity * o;
        m.transparent = m.userData.baseTransparent || o < 0.999;
      });
    });
  };

  return {
    clay,
    inkMat,
    outline,
    fatLine,
    canvasTex,
    texture,
    shadow,
    label,
    own,
    setOpacity,
    setResolution: (w, h) => lineMats.forEach((m) => m.resolution.set(w, h)),
  };
}
