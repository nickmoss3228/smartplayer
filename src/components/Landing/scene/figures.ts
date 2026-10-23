import * as THREE from 'three';
import { figureParts, type Part } from '../../../modules/character/figureParts';
import { mergeBoxes } from '../../../modules/character/figureGeometry';
import type { CharacterLook } from '../../../modules/character/look';

/**
 * The landing's people: the app's own characters (modules/character — the
 * figure students build in the creator and meet in their school), from the
 * same boxes and colours, but hinged at the knees, elbows and ankles so they
 * can gesture, sit and dance. The shared figure has no such joints and is not
 * touched: the boxes are split here, and the geometry and material are the
 * landing's own, so its cleanup never disposes anything the school uses.
 *
 * Poses are written in the units the landing's first figure had (a 0.86 leg,
 * hips at 0.95); applyPose converts positions with UNIT, and angles carry over.
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
  shL: [0, 0, -0.1], elL: -0.15, shR: [0, 0, 0.1], elR: -0.15,
  hpL: [0, 0, -0.03], knL: 0, anL: 0, hpR: [0, 0, 0.03], knR: 0, anR: 0,
};
/** STAND with some joints changed. */
export const pose = (over: Partial<Pose>): Pose => ({ ...STAND, ...over });
/** Sitting, thighs level and shins straight down, hands on the knees. */
export const SIT = pose({
  hy: -0.42, sp: [0.08, 0, 0],
  hpL: [-1.5, 0, -0.08], knL: 1.5, hpR: [-1.5, 0, 0.08], knR: 1.5,
  shL: [-0.55, 0, -0.1], elL: -0.9, shR: [-0.55, 0, 0.1], elR: -0.9,
});

/* ── the rig, in the character's own units (figureParts.ts) ─────────────── */
/** Hip joints above the floor, and their sideways offset (figureParts HIP_Y, LEG_X). */
export const HIP_Y = 0.42;
export const HIP_X = 0.11;
/** The ankle pivot sits in the middle of the shoe, this far above the floor. */
export const ANKLE = 0.035;
/** Thigh and shin: hip to knee, knee to ankle. */
export const THIGH = (HIP_Y - ANKLE) / 2;
export const SHIN = THIGH;
/** Shoulder to elbow (figureParts arms are 0.5 long). */
const UPPER_ARM = 0.25;
/** Old pose units to these: the old leg was 0.86 long. */
export const UNIT = (THIGH + SHIN) / 0.86;
/** How much bigger than in the school the landing draws them: about as tall as an adult beside the props. */
export const FIGURE_SCALE = 1.3;

export type Joint = 'hips' | 'spine' | 'neck' | 'shL' | 'elL' | 'shR' | 'elR' | 'hpL' | 'knL' | 'anL' | 'hpR' | 'knR' | 'anR';
export interface Figure {
  root: THREE.Group;
  P: Record<Joint, THREE.Group>;
}

/** Boxes cut by the plane y = at: what is above it, and what is below it moved into the next joint's space. */
function cut(parts: Part[], at: number): [Part[], Part[]] {
  const above: Part[] = [];
  const below: Part[] = [];
  for (const p of parts) {
    const top = p.p[1] + p.s[1] / 2;
    const bottom = p.p[1] - p.s[1] / 2;
    if (bottom >= at - 1e-6) above.push(p);
    else if (top <= at + 1e-6) below.push({ ...p, p: [p.p[0], p.p[1] - at, p.p[2]] });
    else {
      above.push({ ...p, p: [p.p[0], (top + at) / 2, p.p[2]], s: [p.s[0], top - at, p.s[2]] });
      below.push({ ...p, p: [p.p[0], (at + bottom) / 2 - at, p.p[2]], s: [p.s[0], at - bottom, p.s[2]] });
    }
  }
  return [above, below];
}

/** One character in `look`, standing, hinged everywhere a pose needs. `material` is the scene's own vertex-colour material. */
export function makeFigure(look: CharacterLook, material: THREE.Material): Figure {
  const parts = figureParts(look, false);
  const P = {} as Record<Joint, THREE.Group>;
  const root = new THREE.Group();
  root.scale.setScalar(FIGURE_SCALE);
  const joint = (name: Joint, parent: THREE.Object3D, at: Vec3, boxes: Part[]) => {
    const g = new THREE.Group();
    g.position.set(...at);
    parent.add(g);
    if (boxes.length) g.add(new THREE.Mesh(mergeBoxes(boxes), material));
    P[name] = g;
    return g;
  };
  const hips = joint('hips', root, [0, HIP_Y, 0], []);
  const torso = joint('spine', hips, [0, 0, 0], parts.torso);
  joint('neck', torso, [0, 0.56, 0], parts.head);
  for (const s of ['L', 'R'] as const) {
    const sign = s === 'L' ? -1 : 1;
    const [upper, fore] = cut(parts[s === 'L' ? 'armL' : 'armR'], -UPPER_ARM);
    const sh = joint(`sh${s}`, torso, [0.27 * sign, 0.48, 0], upper);
    joint(`el${s}`, sh, [0, -UPPER_ARM, 0], fore);
    const leg = parts[s === 'L' ? 'legL' : 'legR'];
    const [thigh, lower] = cut(leg.filter((p) => p.kind !== 'shoe'), -THIGH);
    const hp = joint(`hp${s}`, hips, [HIP_X * sign, 0, 0], thigh);
    const kn = joint(`kn${s}`, hp, [0, -THIGH, 0], lower);
    // The shoe, centred on the ankle pivot so the foot turns and tips around itself.
    const shoes = leg.filter((p) => p.kind === 'shoe').map((p) => ({ ...p, p: [p.p[0], p.p[1] + HIP_Y - ANKLE, p.p[2]] as Vec3 }));
    joint(`an${s}`, kn, [0, -SHIN, 0], shoes);
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
