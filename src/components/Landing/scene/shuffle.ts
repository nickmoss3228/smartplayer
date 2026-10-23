import * as THREE from 'three';
import { clamp01 } from './kit';
import { ANKLE as RIG_ANKLE, HIP_X, HIP_Y, SHIN, THIGH, UNIT, type Figure, type Joint, type Vec3 } from './figures';

/**
 * The speed chapter's dance: a shuffle. One pass of Leo's phrase is four
 * counts, and each count has an "and", so the choreography is eight
 * half-count keyframes:
 *
 *   1  running man, right: the right knee comes up while the left foot slides
 *      back, then the right foot stamps down in front
 *   2  running man, left: the same on the other side
 *   3  T-step: the left leg kicks out to the side while the right foot pivots
 *      toes-out, then heels-out, and the left leg comes back in
 *   4  the kick again, and both feet land together
 *
 * At full speed that is a step every quarter of a second, which is why it
 * looks impossible; slowed down and held, every position can be copied.
 *
 * Unlike the people in the hero (figures.ts, joint angles), the legs here are
 * placed by where the feet should be: a two-bone IK keeps a planted foot on
 * the floor, so it slides instead of floating, and a lifted knee reaches hip
 * height.
 *
 * The keys are written in the units of the landing's first figure (0.86 legs,
 * feet 0.1 off the middle, ankles 0.07 up); toRig() moves each foot onto the
 * character's own legs, so a kick reaches as far for its leg length and a
 * planted foot stays under its hip.
 */

export interface Foot {
  /** Ankle position in the figure's own space; y = ANKLE is standing on the floor. */
  x: number;
  y: number;
  z: number;
  /** Which way the toes point, about the vertical (positive turns them to +x). */
  yaw: number;
}

export interface DanceKey {
  /** Hips: sideways shift, height offset, turn, roll. */
  hx: number;
  hy: number;
  hry: number;
  hrz: number;
  sp: Vec3;
  nk: Vec3;
  shL: Vec3;
  elL: number;
  shR: Vec3;
  elR: number;
  fL: Foot;
  fR: Foot;
}

/** Ankle height with the sole on the floor, in the keys' units. */
const ANKLE = 0.07;

const foot = (x: number, y: number, z: number, yaw = 0): Foot => ({ x, y, z, yaw });
const up = ANKLE;

/** Feet together, knees soft, arms loose: where the dance starts and ends. */
const READY: DanceKey = {
  hx: 0, hy: -0.04, hry: 0, hrz: 0, sp: [0.02, 0, 0], nk: [0, 0, 0],
  shL: [-0.15, 0, -0.18], elL: -0.5, shR: [-0.15, 0, 0.18], elR: -0.5,
  fL: foot(-0.11, up, 0, -0.12), fR: foot(0.11, up, 0, 0.12),
};

export const SHUFFLE: DanceKey[] = [
  READY,
  // and — right knee up, left foot slides back, arms swing like running
  {
    hx: 0, hy: -0.05, hry: 0.06, hrz: 0, sp: [0.1, -0.05, 0], nk: [0.05, 0.05, 0],
    shL: [-0.75, 0, -0.15], elL: -1.1, shR: [0.55, 0, 0.15], elR: -0.6,
    fL: foot(-0.1, up, -0.27, -0.1), fR: foot(0.1, 0.52, 0.2, 0.1),
  },
  // 1 — right foot stamps down in front: a low split stance
  {
    hx: 0, hy: -0.12, hry: 0.02, hrz: 0, sp: [0.06, 0, 0], nk: [0.02, 0, 0],
    shL: [-0.35, 0, -0.15], elL: -0.9, shR: [-0.1, 0, 0.15], elR: -0.9,
    fL: foot(-0.1, up, -0.27, -0.1), fR: foot(0.1, up, 0.17, 0.1),
  },
  // and — left knee up, right foot slides back
  {
    hx: 0, hy: -0.05, hry: -0.06, hrz: 0, sp: [0.1, 0.05, 0], nk: [0.05, -0.05, 0],
    shL: [0.55, 0, -0.15], elL: -0.6, shR: [-0.75, 0, 0.15], elR: -1.1,
    fL: foot(-0.1, 0.52, 0.2, -0.1), fR: foot(0.1, up, -0.27, 0.1),
  },
  // 2 — left foot down in front
  {
    hx: 0, hy: -0.12, hry: -0.02, hrz: 0, sp: [0.06, 0, 0], nk: [0.02, 0, 0],
    shL: [-0.1, 0, -0.15], elL: -0.9, shR: [-0.35, 0, 0.15], elR: -0.9,
    fL: foot(-0.1, up, 0.17, -0.1), fR: foot(0.1, up, -0.27, 0.1),
  },
  // and — T-step: left leg kicks out, right foot turns toes-out, arms open
  {
    hx: 0.05, hy: -0.05, hry: 0.1, hrz: -0.1, sp: [0.04, 0, -0.06], nk: [0, 0.15, 0.04],
    shL: [0, 0, -1.2], elL: -0.3, shR: [-0.4, 0, 0.4], elR: -1.2,
    fL: foot(-0.6, 0.36, 0.06, -0.3), fR: foot(0.12, up, -0.02, 0.8),
  },
  // 3 — right foot pivots heels-out and travels; left leg crosses in
  {
    hx: 0.12, hy: -0.08, hry: -0.08, hrz: 0.02, sp: [0.06, 0, 0.04], nk: [0, -0.1, 0],
    shL: [-0.5, 0, -0.4], elL: -1.2, shR: [0, 0, 1.0], elR: -0.3,
    fL: foot(0.02, 0.22, 0.08, 0), fR: foot(0.21, up, 0, -0.6),
  },
  // and — the kick again, right foot toes-out
  {
    hx: 0.05, hy: -0.05, hry: 0.1, hrz: -0.1, sp: [0.04, 0, -0.06], nk: [0, 0.15, 0.04],
    shL: [0, 0, -1.2], elL: -0.3, shR: [-0.4, 0, 0.4], elR: -1.2,
    fL: foot(-0.58, 0.34, 0.04, -0.3), fR: foot(0.13, up, -0.02, 0.8),
  },
  // 4 — both feet together: READY again, so the next pass starts where this one ended
];

/** A key's foot (in the keys' units) on the character's leg, in its own space. */
const toRig = (f: Foot, side: -1 | 1): Foot => ({
  x: side * HIP_X + (f.x - side * 0.1) * UNIT,
  y: RIG_ANKLE + (f.y - ANKLE) * UNIT,
  z: f.z * UNIT,
  yaw: f.yaw,
});

/** Where the foot that lands on each count stands — the four footprints — on the character's floor. */
export const COUNT_PRINTS: Foot[] = [toRig(SHUFFLE[2].fR, 1), toRig(SHUFFLE[4].fL, -1), toRig(SHUFFLE[6].fR, 1), toRig(READY.fL, -1)];

export const REST = READY;

const key = (i: number) => SHUFFLE[((i % SHUFFLE.length) + SHUFFLE.length) % SHUFFLE.length];

/* ── interpolation, over the keys as flat lists of numbers ─────────────── */
const flat = (k: DanceKey): number[] => [
  k.hx, k.hy, k.hry, k.hrz, ...k.sp, ...k.nk, ...k.shL, k.elL, ...k.shR, k.elR,
  k.fL.x, k.fL.y, k.fL.z, k.fL.yaw, k.fR.x, k.fR.y, k.fR.z, k.fR.yaw,
];
const unflat = (a: number[]): DanceKey => ({
  hx: a[0], hy: a[1], hry: a[2], hrz: a[3], sp: [a[4], a[5], a[6]], nk: [a[7], a[8], a[9]],
  shL: [a[10], a[11], a[12]], elL: a[13], shR: [a[14], a[15], a[16]], elR: a[17],
  fL: foot(a[18], Math.max(ANKLE, a[19]), a[20], a[21]), fR: foot(a[22], Math.max(ANKLE, a[23]), a[24], a[25]),
});
const FLAT = SHUFFLE.map(flat);
const flatKey = (i: number) => FLAT[((i % FLAT.length) + FLAT.length) % FLAT.length];
const catmullRom = (a: number, b: number, c: number, d: number, u: number) =>
  0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);

/** Between half-count `j` and the next, `u` of the way: straight (eased) moves for the slow passes. */
export const keyBetween = (j: number, u: number): DanceKey => {
  const a = flatKey(j);
  const b = flatKey(j + 1);
  return unflat(a.map((x, i) => x + (b[i] - x) * u));
};

/** The same, as one continuous curve through the neighbouring keys: the full-speed pass. */
export const keyOnCurve = (j: number, u: number): DanceKey => {
  const p0 = flatKey(j - 1);
  const p1 = flatKey(j);
  const p2 = flatKey(j + 1);
  const p3 = flatKey(j + 2);
  return unflat(p1.map((_, i) => catmullRom(p0[i], p1[i], p2[i], p3[i], u)));
};

export const keyAt = (j: number) => key(j);

/* ── putting a key on the figure ───────────────────────────────────────── */
const toHips = new THREE.Matrix4();
const v = new THREE.Vector3();

/** The leg joints need rotation orders the IK can solve directly; set them once on the dancer. */
export function prepareDancer(fig: Figure) {
  for (const s of ['L', 'R'] as const) {
    // hip: twist (y) innermost, then flex (x), then the leg plane tilts sideways (z)
    fig.P[`hp${s}`].rotation.order = 'ZXY';
    // ankle: flex (x) to keep the sole flat, then turn the foot (y)
    fig.P[`an${s}`].rotation.order = 'YXZ';
  }
}

function placeLeg(P: Record<Joint, THREE.Group>, side: 'L' | 'R', key: Foot, hry: number) {
  const hp = P[`hp${side}`];
  const kn = P[`kn${side}`];
  const an = P[`an${side}`];
  const f = toRig(key, side === 'L' ? -1 : 1);
  // The ankle target, from the hip joint, in the hips' own space.
  v.set(f.x, Math.max(RIG_ANKLE, f.y), f.z).applyMatrix4(toHips).sub(hp.position);
  // Tilt the leg's plane sideways towards the target, then solve thigh and shin within it.
  const tilt = Math.atan2(v.x, -v.y);
  const down = Math.hypot(v.x, v.y);
  const reach = Math.min((THIGH + SHIN) * 0.999, Math.max(Math.abs(THIGH - SHIN) + 0.01, Math.hypot(down, v.z)));
  const toward = Math.atan2(v.z, down);
  // Law of cosines: the thigh's angle off the hip-to-ankle line, and the knee's inside angle.
  const atHip = Math.acos((THIGH * THIGH + reach * reach - SHIN * SHIN) / (2 * THIGH * reach));
  const atKnee = Math.acos((THIGH * THIGH + SHIN * SHIN - reach * reach) / (2 * THIGH * SHIN));
  const hipFlex = -(toward + atHip);
  const kneeBend = Math.PI - atKnee;
  hp.rotation.set(hipFlex, 0, tilt);
  kn.rotation.x = kneeBend;
  // Sole flat on the floor; a lifted foot points its toes a little.
  const lift = clamp01((key.y - ANKLE) / 0.2);
  an.rotation.set(-(hipFlex + kneeBend) + 0.55 * lift, f.yaw - hry, 0);
}

export function applyDance(fig: Figure, k: DanceKey) {
  const P = fig.P;
  P.hips.position.set(k.hx * UNIT, HIP_Y + k.hy * UNIT, 0);
  P.hips.rotation.set(0, k.hry, k.hrz);
  P.hips.updateMatrix();
  toHips.copy(P.hips.matrix).invert();
  P.spine.rotation.set(...k.sp);
  P.neck.rotation.set(...k.nk);
  P.shL.rotation.set(...k.shL);
  P.elL.rotation.x = k.elL;
  P.shR.rotation.set(...k.shR);
  P.elR.rotation.x = k.elR;
  placeLeg(P, 'L', k.fL, k.hry);
  placeLeg(P, 'R', k.fR, k.hry);
}
