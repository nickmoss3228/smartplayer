import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * The landing's people: grown-ups, about seven and a half heads tall, built
 * from smooth rounded solids — tapered limbs, a shaped torso, an egg of a
 * head with a small, quiet face (eyes, brows, nose, mouth, ears), real
 * hairstyles and everyday clothes. Hinged at hips, knees, ankles, shoulders,
 * elbows and the neck, so they can talk with their hands, sit and dance.
 *
 * (The blocky app characters that stood here first are kept for a future
 * children's landing: commit 87e0f35, scene/figures.ts.)
 *
 * Each joint is one mesh: its pieces merged, their colours baked into the
 * vertices, one material for everybody. Units are the scene's, about a metre;
 * poses carry over from the landing's first figure as they were written
 * (0.86 legs, hips near 0.95), through UNIT.
 */

export type Vec3 = [number, number, number];

export interface Pose {
  /** Hips: sideways shift, height offset, roll, turn. */
  hx: number;
  hy: number;
  hrz: number;
  hry: number;
  /** Torso (bending from the hips) and head, as Euler XYZ. */
  sp: Vec3;
  nk: Vec3;
  /** Shoulders (Euler) and elbows (bend about x). L is the figure's -x side. */
  shL: Vec3;
  elL: number;
  shR: Vec3;
  elR: number;
  /** Hips (Euler), knees and ankles (bend about x). */
  hpL: Vec3;
  knL: number;
  anL: number;
  hpR: Vec3;
  knR: number;
  anR: number;
}

/** Standing at ease. */
export const STAND: Pose = {
  hx: 0, hy: 0, hrz: 0, hry: 0, sp: [0, 0, 0], nk: [0, 0, 0],
  shL: [0, 0, -0.08], elL: -0.15, shR: [0, 0, 0.08], elR: -0.15,
  hpL: [0, 0, -0.02], knL: 0, anL: 0, hpR: [0, 0, 0.02], knR: 0, anR: 0,
};
/** STAND with some joints changed. */
export const pose = (over: Partial<Pose>): Pose => ({ ...STAND, ...over });
/** Sitting, thighs level and shins straight down, hands on the knees. */
export const SIT = pose({
  hy: -0.42, sp: [0.08, 0, 0],
  hpL: [-1.5, 0, -0.06], knL: 1.5, hpR: [-1.5, 0, 0.06], knR: 1.5,
  shL: [-0.55, 0, -0.08], elL: -0.9, shR: [-0.55, 0, 0.08], elR: -0.9,
});

/* ── the rig ─────────────────────────────────────────────────────────── */
/** Hip joints above the floor, and their sideways offset. */
export const HIP_Y = 0.93;
export const HIP_X = 0.095;
/** The ankle pivot, this far above the floor with the sole down. */
export const ANKLE = 0.07;
/** Thigh and shin: hip to knee, knee to ankle. */
export const THIGH = (HIP_Y - ANKLE) / 2;
export const SHIN = THIGH;
const UPPER_ARM = 0.285;
/** Elbow to the middle of the hand. */
export const FOREARM = 0.27;
/** The neck joint above the hips, and the middle of the head above the neck joint. */
const NECK_Y = 0.6;
export const HEAD_Y = 0.13;
/** Old pose units to these: the old leg was 0.86 long. */
export const UNIT = (THIGH + SHIN) / 0.86;
export const FIGURE_SCALE = 1;
/** The top of a seat for SIT: under the thighs. */
export const SEAT_TOP = HIP_Y + SIT.hy * UNIT - 0.07;

export type Joint = 'hips' | 'spine' | 'neck' | 'shL' | 'elL' | 'shR' | 'elR' | 'hpL' | 'knL' | 'anL' | 'hpR' | 'knR' | 'anR';
export interface Figure {
  root: THREE.Group;
  P: Record<Joint, THREE.Group>;
}

export type Hair = 'short' | 'side' | 'bun' | 'long' | 'curly' | 'ponytail' | 'receding';
export type Top = 'tee' | 'shirt' | 'sweater' | 'jacket' | 'hoodie';
export interface PersonLook {
  skin: string;
  hair: Hair;
  hairColor: string;
  top: Top;
  topColor: string;
  /** Under a jacket, and the collar of a shirt. */
  innerColor?: string;
  bottom: 'trousers' | 'shorts';
  bottomColor: string;
  shoeColor: string;
  soleColor?: string;
  glasses?: boolean;
  beard?: boolean;
}

/* ── building blocks: geometry already in place, and its colour ─────────── */
interface Piece {
  g: THREE.BufferGeometry;
  c: string;
}
const T = new THREE.Matrix4();
const place = (g: THREE.BufferGeometry, at: Vec3, scale: Vec3 = [1, 1, 1], rot: Vec3 = [0, 0, 0]) => {
  T.compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
  return g.applyMatrix4(T);
};
/** An ellipsoid with radii r. */
const blob = (c: string, at: Vec3, r: Vec3, rot: Vec3 = [0, 0, 0], seg = 20): Piece => ({ g: place(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), at, r, rot), c });
/** A limb hanging from the joint: a tapered tube with rounded ends, from y = from down to y = from - len. */
const limb = (c: string, from: number, len: number, rTop: number, rBot: number, x = 0, z = 0): Piece[] => [
  { g: place(new THREE.CylinderGeometry(rTop, rBot, len, 16, 1, true), [x, from - len / 2, z]), c },
  blob(c, [x, from, z], [rTop, rTop, rTop], [0, 0, 0], 14),
  blob(c, [x, from - len, z], [rBot, rBot, rBot], [0, 0, 0], 14),
];
/** A box with rounded edges. */
const box = (c: string, at: Vec3, s: Vec3, radius = 0.02, rot: Vec3 = [0, 0, 0]): Piece => ({
  g: place(new RoundedBoxGeometry(s[0], s[1], s[2], 3, Math.min(radius, ...s.map((v) => v / 2 - 0.0005))), at, [1, 1, 1], rot),
  c,
});
/** A turned shape around y: [radius, y] pairs, squashed front to back by depth. */
const turned = (c: string, profile: [number, number][], depth: number, at: Vec3 = [0, 0, 0]): Piece => ({
  g: place(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 28), at, [1, 1, depth]),
  c,
});
/** Part of a sphere: the cap from the top down to theta, tilted back by tilt — hair. */
const cap = (c: string, at: Vec3, r: Vec3, theta: number, tilt: number, from = 0): Piece => ({
  g: place(new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, from, theta - from), at, r, [-tilt, 0, 0]),
  c,
});

/** Pieces as one vertex-coloured geometry. */
function merge(pieces: Piece[]): THREE.BufferGeometry {
  const colour = new THREE.Color();
  const parts = pieces.map(({ g, c }) => {
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();
    for (const k of Object.keys(flat.attributes)) if (k !== 'position' && k !== 'normal') flat.deleteAttribute(k);
    colour.set(c);
    const n = flat.getAttribute('position').count;
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) cols.set([colour.r, colour.g, colour.b], i * 3);
    flat.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return flat;
  });
  const out = mergeGeometries(parts) ?? new THREE.BufferGeometry();
  parts.forEach((p) => p.dispose());
  out.computeBoundingSphere();
  return out;
}

const shade = (hex: string, k: number) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

/* ── the person ──────────────────────────────────────────────────────── */
function headPieces(L: PersonLook): Piece[] {
  const y = HEAD_Y;
  const lip = shade(L.skin, 0.72);
  const ink = '#2a2622';
  const p: Piece[] = [
    // skull and jaw: an egg, with the chin a little forward
    blob(L.skin, [0, y, 0], [0.096, 0.118, 0.106]),
    blob(L.skin, [0, y - 0.052, 0.018], [0.074, 0.07, 0.082]),
    // ears, nose
    blob(L.skin, [-0.095, y - 0.004, -0.006], [0.016, 0.03, 0.014]),
    blob(L.skin, [0.095, y - 0.004, -0.006], [0.016, 0.03, 0.014]),
    blob(shade(L.skin, 0.95), [0, y - 0.018, 0.104], [0.013, 0.022, 0.016], [0.25, 0, 0], 12),
    // eyes and brows
    blob(ink, [-0.035, y + 0.006, 0.097], [0.0105, 0.013, 0.006], [0, 0, 0], 10),
    blob(ink, [0.035, y + 0.006, 0.097], [0.0105, 0.013, 0.006], [0, 0, 0], 10),
    box(shade(L.hairColor, 0.9), [-0.036, y + 0.034, 0.095], [0.032, 0.0065, 0.008], 0.003, [0, -0.2, 0.08]),
    box(shade(L.hairColor, 0.9), [0.036, y + 0.034, 0.095], [0.032, 0.0065, 0.008], 0.003, [0, 0.2, -0.08]),
  ];
  if (L.beard) p.push(blob(L.hairColor, [0, y - 0.058, 0.022], [0.079, 0.066, 0.086]), blob(L.hairColor, [0, y - 0.03, 0.084], [0.04, 0.012, 0.018], [0, 0, 0], 12));
  p.push(box(lip, [0, y - 0.06, L.beard ? 0.106 : 0.1], [0.026, 0.0045, 0.006], 0.002));
  // hair
  const hc = L.hairColor;
  const r: Vec3 = [0.102, 0.125, 0.113];
  const at: Vec3 = [0, y + 0.004, -0.004];
  if (L.hair === 'short') p.push(cap(hc, at, r, 1.62, 0.56));
  if (L.hair === 'side') p.push(cap(hc, at, r, 1.62, 0.52), blob(hc, [0.03, y + 0.1, 0.05], [0.07, 0.03, 0.05], [0.3, 0, -0.3]));
  if (L.hair === 'receding') p.push(cap(hc, at, [0.101, 0.124, 0.112], 1.5, 0.35, 0.95));
  if (L.hair === 'bun') p.push(cap(hc, at, r, 1.62, 0.5), blob(hc, [0, y + 0.1, -0.1], [0.052, 0.048, 0.048]));
  if (L.hair === 'ponytail') p.push(cap(hc, at, r, 1.62, 0.5), blob(hc, [0, y + 0.03, -0.112], [0.03, 0.03, 0.03]), blob(hc, [0, y - 0.07, -0.13], [0.03, 0.1, 0.03], [0.25, 0, 0]));
  if (L.hair === 'long') p.push(cap(hc, at, [0.106, 0.128, 0.117], 1.7, 0.45), blob(hc, [0, y - 0.07, -0.05], [0.104, 0.14, 0.07]));
  if (L.hair === 'curly') {
    p.push(cap(hc, at, [0.108, 0.13, 0.118], 1.6, 0.5));
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * Math.PI * 2;
      p.push(blob(hc, [Math.sin(a) * 0.08, y + 0.075 + 0.02 * Math.cos(a * 3), Math.cos(a) * 0.075 - 0.018], [0.036, 0.034, 0.036], [0, 0, 0], 10));
    }
  }
  if (L.glasses) {
    const frame = '#1c1f24';
    for (const s of [-1, 1]) p.push({ g: place(new THREE.TorusGeometry(0.025, 0.0042, 6, 22), [s * 0.036, y + 0.006, 0.108]), c: frame });
    p.push(box(frame, [0, y + 0.01, 0.11], [0.022, 0.005, 0.005], 0.002));
    for (const s of [-1, 1]) p.push(box(frame, [s * 0.075, y + 0.01, 0.06], [0.004, 0.005, 0.09], 0.002));
  }
  return p;
}

/** One person in `look`, standing, hinged everywhere a pose needs. `material` is the scene's vertex-colour material. */
export function makeFigure(look: PersonLook, material: THREE.Material): Figure {
  const L = look;
  const P = {} as Record<Joint, THREE.Group>;
  const root = new THREE.Group();
  root.scale.setScalar(FIGURE_SCALE);
  const joint = (name: Joint, parent: THREE.Object3D, at: Vec3, pieces: Piece[]) => {
    const g = new THREE.Group();
    g.position.set(...at);
    parent.add(g);
    if (pieces.length) g.add(new THREE.Mesh(merge(pieces), material));
    P[name] = g;
    return g;
  };
  const top = L.topColor;
  const longSleeves = L.top !== 'tee';
  const legC = L.bottomColor;

  // the pelvis, under the torso, covering the tops of the legs
  const hips = joint('hips', root, [0, HIP_Y, 0], [blob(legC, [0, -0.012, -0.004], [0.132, 0.11, 0.086])]);
  // the torso: waist, chest, the slope of the shoulders, and the neck
  const torso: Piece[] = [
    turned(top, [[0, -0.03], [0.14, -0.03], [0.146, 0.04], [0.132, 0.19], [0.148, 0.33], [0.162, 0.43], [0.158, 0.485], [0.11, 0.53], [0.05, 0.55], [0, 0.552]], 0.66),
    limb(L.skin, 0.64, 0.12, 0.043, 0.047)[0],
  ];
  if (L.top === 'shirt') torso.push(turned(L.innerColor ?? '#f2f2f0', [[0.05, 0.52], [0.062, 0.545], [0.052, 0.585]], 1.05));
  if (L.top === 'sweater' || L.top === 'tee') torso.push({ g: place(new THREE.TorusGeometry(0.05, 0.01, 8, 24), [0, 0.548, 0.004], [1, 1, 0.9], [Math.PI / 2, 0, 0]), c: shade(top, 0.85) });
  if (L.top === 'hoodie') torso.push({ g: place(new THREE.TorusGeometry(0.075, 0.03, 10, 24), [0, 0.54, -0.02], [1, 1, 0.8], [Math.PI / 2 + 0.25, 0, 0]), c: shade(top, 0.92) });
  if (L.top === 'jacket') {
    // the shirt collar shows above the jacket
    torso.push(turned(L.innerColor ?? '#f2f2f0', [[0.05, 0.52], [0.062, 0.545], [0.052, 0.585]], 1.05));
  }
  const spine = joint('spine', hips, [0, 0, 0], torso);
  joint('neck', spine, [0, NECK_Y, 0], headPieces(L));

  for (const s of ['L', 'R'] as const) {
    const sign = s === 'L' ? -1 : 1;
    // arm: a rounded shoulder, the upper arm (a short sleeve on a tee), the forearm and the hand
    const upper: Piece[] = [blob(top, [0, -0.005, 0], [0.05, 0.05, 0.05])];
    if (longSleeves) upper.push(...limb(top, 0, UPPER_ARM, 0.047, 0.042));
    else upper.push(...limb(top, 0, 0.11, 0.05, 0.048), ...limb(L.skin, -0.06, UPPER_ARM - 0.06, 0.042, 0.038));
    joint(`sh${s}`, spine, [0.172 * sign, 0.468, -0.005], upper);
    const fore: Piece[] = longSleeves
      ? [...limb(top, 0, FOREARM - 0.07, 0.043, 0.037), ...limb(L.skin, -FOREARM + 0.07, 0.03, 0.03, 0.03)]
      : limb(L.skin, 0, FOREARM - 0.05, 0.038, 0.031);
    fore.push(blob(L.skin, [0, -FOREARM, 0.004], [0.026, 0.05, 0.036], [0, 0, 0], 14));
    const sh = P[`sh${s}`];
    joint(`el${s}`, sh, [0, -UPPER_ARM, 0], fore);

    // leg: thigh, shin, and the shoe, centred on the ankle pivot so the foot turns and tips around itself
    const thigh: Piece[] = L.bottom === 'shorts'
      ? [...limb(legC, 0, THIGH * 0.62, 0.07, 0.062), ...limb(L.skin, -THIGH * 0.5, THIGH * 0.5, 0.056, 0.05)]
      : limb(legC, 0, THIGH, 0.07, 0.054);
    const hp = joint(`hp${s}`, hips, [HIP_X * sign, 0, 0], thigh);
    const shin = limb(L.bottom === 'shorts' ? L.skin : legC, 0, SHIN - 0.03, L.bottom === 'shorts' ? 0.048 : 0.053, 0.04);
    const kn = joint(`kn${s}`, hp, [0, -THIGH, 0], shin);
    const shoe: Piece[] = [
      box(L.shoeColor, [0, -0.02, 0.045], [0.098, 0.07, 0.26], 0.034),
      box(L.soleColor ?? shade(L.shoeColor, 0.6), [0, -0.058, 0.045], [0.1, 0.022, 0.264], 0.01),
    ];
    joint(`an${s}`, kn, [0, -SHIN, 0], shoe);
  }
  return { root, P };
}

export function applyPose(P: Record<Joint, THREE.Group>, p: Pose) {
  P.hips.position.set(p.hx * UNIT, HIP_Y + p.hy * UNIT, 0);
  P.hips.rotation.set(0, p.hry, p.hrz);
  P.spine.rotation.set(...p.sp);
  P.neck.rotation.set(...p.nk);
  P.shL.rotation.set(...p.shL);
  P.elL.rotation.x = p.elL;
  P.shR.rotation.set(...p.shR);
  P.elR.rotation.x = p.elR;
  P.hpL.rotation.set(...p.hpL);
  P.knL.rotation.x = p.knL;
  P.anL.rotation.x = p.anL;
  P.hpR.rotation.set(...p.hpR);
  P.knR.rotation.x = p.knR;
  P.anR.rotation.x = p.anR;
}
