// modules/character/figureParts.ts
//
// A person, as boxes. Every figure in the game — each student, the staff, the
// player in the school, the one turning on the dashboard, the one in the
// navbar portrait — is built from this list, so they cannot disagree about
// what a ponytail is.
//
// Pure data, no three.js: which boxes, where, what colour, hung from which
// joint. figureGeometry.ts turns them into meshes; Figure.tsx and portrait.ts
// draw them. The joints are the ones People.tsx animates — hips, shoulders,
// head — and every coordinate below is relative to the joint it hangs from,
// so a rotation on the joint reads as a hip or a shoulder turning.
//
// Axes: +y up, +z is the way the figure faces (the eyes are on the +z face).

import type { CharacterLook } from "./look";

export type Joint = "root" | "legL" | "legR" | "torso" | "armL" | "armR" | "head";

/** What a box is, so tests can ask "does any hair cover the eyes". */
export type PartKind = "skin" | "eye" | "hair" | "hairTop" | "cloth" | "shoe" | "hat" | "glasses";

export interface Part {
  /** Centre, relative to the joint. */
  p: [number, number, number];
  /** Size. */
  s: [number, number, number];
  /** Colour, #rrggbb. */
  c: string;
  kind: PartKind;
}

export type FigureParts = Record<Joint, Part[]>;

export const HIP_Y = 0.42;
const SHOULDER_Y = 0.9;
/** The head joint, above the torso's. */
const NECK_Y = 0.56;
const ARM_X = 0.27;
const LEG_X = 0.11;
/** Seated thigh thickness. The thigh's UNDERSIDE rests on the seat, so its
 *  centre is half this above it. */
const THIGH_H = 0.14;
/** Seat height of every chair in the school (props.ts SEAT_TOP). */
export const DEFAULT_SEAT_TOP = 0.48;

const EYE = "#2b2b2b";
const SHOE = "#2b2b2b";
const FRAME = "#2b2b2b";
const LENS = "#dfe9f2";
const SHADES = "#17191d";

/** Where each joint sits: legs and torso on the root, arms and head on the
 *  torso. */
export function jointPositions(
  sitting: boolean,
  seatTop = DEFAULT_SEAT_TOP,
): Record<Joint, [number, number, number]> {
  return {
    root: [0, 0, 0],
    legL: [-LEG_X, HIP_Y, 0],
    legR: [LEG_X, HIP_Y, 0],
    // Seated, the torso's base IS the seat top — the person sits on the chair,
    // not in it.
    torso: [0, sitting ? seatTop : HIP_Y, 0],
    armL: [-ARM_X, SHOULDER_Y - HIP_Y, 0],
    armR: [ARM_X, SHOULDER_Y - HIP_Y, 0],
    head: [0, NECK_Y, 0],
  };
}

/** A colour made darker (k < 1) or lighter (k > 1). */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) =>
    Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k)))
      .toString(16)
      .padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

const box = (p: Part["p"], s: Part["s"], c: string, kind: PartKind): Part => ({ p, s, c, kind });

// ── Hair ────────────────────────────────────────────────────────────────────
// The head is a 0.3 cube from y 0 to 0.32, its face on the plane z = 0.15 with
// the eyes at y 0.18. Nothing here comes down over the face below y 0.21: a
// fringe, yes; a fringe you cannot see the eyes through, no.

function hairParts(style: CharacterLook["hair"], c: string): Part[] {
  const cap = box([0, 0.3, -0.02], [0.33, 0.14, 0.33], c, "hair");
  switch (style) {
    case "buzz":
      return [box([0, 0.335, 0], [0.31, 0.04, 0.31], c, "hair"), box([0, 0.25, -0.153], [0.31, 0.16, 0.012], c, "hair")];
    case "spiky":
      return [
        cap,
        box([-0.09, 0.41, -0.02], [0.07, 0.09, 0.07], c, "hairTop"),
        box([0, 0.425, 0.03], [0.07, 0.12, 0.07], c, "hairTop"),
        box([0.09, 0.41, -0.04], [0.07, 0.09, 0.07], c, "hairTop"),
        box([0, 0.405, -0.12], [0.07, 0.08, 0.07], c, "hairTop"),
      ];
    case "curly":
      return [
        box([0, 0.31, -0.03], [0.37, 0.18, 0.37], c, "hair"),
        box([-0.18, 0.19, -0.06], [0.06, 0.14, 0.22], c, "hair"),
        box([0.18, 0.19, -0.06], [0.06, 0.14, 0.22], c, "hair"),
        box([0, 0.18, -0.2], [0.34, 0.16, 0.06], c, "hair"),
      ];
    case "bob":
      return [
        cap,
        box([-0.165, 0.19, -0.02], [0.03, 0.2, 0.3], c, "hair"),
        box([0.165, 0.19, -0.02], [0.03, 0.2, 0.3], c, "hair"),
        box([0, 0.18, -0.165], [0.33, 0.22, 0.03], c, "hair"),
      ];
    case "long":
      return [
        cap,
        box([-0.165, 0.16, -0.04], [0.03, 0.26, 0.24], c, "hair"),
        box([0.165, 0.16, -0.04], [0.03, 0.26, 0.24], c, "hair"),
        // Down past the collar, lying on the back rather than through it.
        box([0, 0.1, -0.17], [0.33, 0.44, 0.05], c, "hair"),
      ];
    case "ponytail":
      return [
        cap,
        box([0, 0.27, -0.19], [0.11, 0.08, 0.06], shade(c, 0.85), "hair"),
        box([0, 0.13, -0.215], [0.09, 0.24, 0.07], c, "hair"),
      ];
    case "bun":
      return [cap, box([0, 0.43, -0.05], [0.16, 0.12, 0.16], c, "hairTop")];
    case "short":
    default:
      return [cap];
  }
}

function hatParts(style: CharacterLook["hat"], c: string): Part[] {
  switch (style) {
    case "cap":
      return [
        box([0, 0.385, -0.01], [0.35, 0.12, 0.35], c, "hat"),
        box([0, 0.335, 0.2], [0.3, 0.025, 0.14], shade(c, 0.85), "hat"),
      ];
    case "beanie":
      return [
        box([0, 0.37, -0.01], [0.36, 0.17, 0.36], c, "hat"),
        box([0, 0.3, -0.01], [0.37, 0.05, 0.37], shade(c, 0.82), "hat"),
      ];
    case "headband":
      return [box([0, 0.27, -0.01], [0.35, 0.045, 0.35], c, "hat")];
    case "chef":
      return [
        box([0, 0.34, 0], [0.34, 0.06, 0.34], c, "hat"),
        box([0, 0.48, 0], [0.3, 0.24, 0.3], c, "hat"),
      ];
    case "none":
    default:
      return [];
  }
}

function faceParts(glasses: CharacterLook["glasses"]): Part[] {
  const eyes = [-0.07, 0.07];
  if (glasses === "none") return eyes.map((x) => box([x, 0.18, 0.152], [0.05, 0.05, 0.01], EYE, "eye"));
  const temples = [-0.155, 0.155].map((x) => box([x, 0.19, 0.06], [0.012, 0.016, 0.2], FRAME, "glasses"));
  const bridge = box([0, 0.19, 0.157], [0.05, 0.016, 0.01], glasses === "shades" ? SHADES : FRAME, "glasses");
  if (glasses === "shades") {
    return [...eyes.map((x) => box([x, 0.18, 0.157], [0.11, 0.07, 0.012], SHADES, "glasses")), bridge, ...temples];
  }
  // A frame, a pale lens, and the eye showing through it.
  return [
    ...eyes.flatMap((x) => [
      box([x, 0.18, 0.156], [0.1, 0.08, 0.008], FRAME, "glasses"),
      box([x, 0.18, 0.1605], [0.07, 0.055, 0.004], LENS, "glasses"),
      box([x, 0.177, 0.1635], [0.035, 0.035, 0.004], EYE, "eye"),
    ]),
    bridge,
    ...temples,
  ];
}

// ── Clothes ─────────────────────────────────────────────────────────────────

function torsoParts(look: CharacterLook, sitting: boolean): Part[] {
  const c = look.topColor;
  const out: Part[] = [box([0, 0.26, 0], [0.42, 0.52, 0.26], c, "cloth")];
  switch (look.top) {
    case "sweater":
      out.push(box([0, 0.035, 0], [0.43, 0.07, 0.27], shade(c, 0.8), "cloth"));
      break;
    case "hoodie":
      out.push(
        box([0, 0.5, -0.13], [0.3, 0.14, 0.1], shade(c, 0.85), "cloth"),
        box([0, 0.14, 0.132], [0.26, 0.1, 0.01], shade(c, 0.85), "cloth"),
      );
      break;
    case "shirt":
      out.push(
        box([0, 0.495, 0.09], [0.22, 0.05, 0.09], shade(c, 1.15), "cloth"),
        box([0, 0.47, 0.134], [0.08, 0.05, 0.012], shade(look.bottomColor, 0.9), "cloth"),
        box([0, 0.3, 0.132], [0.07, 0.3, 0.01], look.bottomColor, "cloth"),
      );
      break;
    default:
      break;
  }
  if (look.bottom === "skirt") {
    // Standing, it hangs from the hips over the tops of the legs; seated, it
    // lies across the lap.
    out.push(
      sitting
        ? box([0, 0.08, 0.13], [0.44, 0.13, 0.4], look.bottomColor, "cloth")
        : box([0, -0.08, 0], [0.46, 0.22, 0.3], look.bottomColor, "cloth"),
    );
  }
  return out;
}

function armParts(look: CharacterLook): Part[] {
  if (look.top === "tee") {
    return [
      box([0, -0.1, 0], [0.13, 0.2, 0.13], look.topColor, "cloth"),
      box([0, -0.35, 0], [0.11, 0.3, 0.11], look.skin, "skin"),
    ];
  }
  const out = [
    box([0, -0.2, 0], [0.12, 0.4, 0.12], look.topColor, "cloth"),
    box([0, -0.44, 0], [0.12, 0.12, 0.12], look.skin, "skin"),
  ];
  if (look.top === "sweater") out.push(box([0, -0.375, 0], [0.13, 0.05, 0.13], shade(look.topColor, 0.8), "cloth"));
  return out;
}

/** One standing leg, hip to floor, in the leg joint's space. */
function legParts(look: CharacterLook): Part[] {
  const shoe = box([0, -HIP_Y + 0.035, 0.02], [0.17, 0.07, 0.2], SHOE, "shoe");
  switch (look.bottom) {
    case "shorts":
      return [
        box([0, -0.1, 0], [0.165, 0.2, 0.165], look.bottomColor, "cloth"),
        box([0, -0.31, 0], [0.14, 0.22, 0.14], look.skin, "skin"),
        shoe,
      ];
    case "skirt":
      return [box([0, -HIP_Y / 2, 0], [0.14, HIP_Y, 0.14], look.skin, "skin"), shoe];
    case "trousers":
    default:
      return [box([0, -HIP_Y / 2, 0], [0.16, HIP_Y, 0.16], look.bottomColor, "cloth"), shoe];
  }
}

/** Seated legs: thighs forward along +z ON the seat, shins straight down to
 *  the floor from the knee. Every seat in the school is built to the seat
 *  height and keeps its front edge short of where the shins hang, so a chair
 *  looks occupied rather than clipped. In the root's space: seated legs have
 *  no joints, nobody swings them. */
function seatedLegParts(look: CharacterLook, seatTop: number): Part[] {
  const knee = seatTop + THIGH_H / 2;
  const shin = seatTop + THIGH_H;
  const thigh = look.bottom === "skirt" ? look.skin : look.bottomColor;
  const lower = look.bottom === "trousers" ? look.bottomColor : look.skin;
  return [-LEG_X, LEG_X].flatMap((x) => [
    box([x, knee, 0.16], [0.16, THIGH_H, 0.42], thigh, look.bottom === "skirt" ? "skin" : "cloth"),
    box([x, shin / 2, 0.33], [0.15, shin, 0.15], lower, look.bottom === "trousers" ? "cloth" : "skin"),
    box([x, 0.035, 0.36], [0.17, 0.07, 0.2], SHOE, "shoe"),
  ]);
}

// ── The figure ──────────────────────────────────────────────────────────────

export function figureParts(look: CharacterLook, sitting: boolean, seatTop = DEFAULT_SEAT_TOP): FigureParts {
  const hat = hatParts(look.hat, look.hatColor);
  // Whatever stands up off the top of the head goes under a hat that covers
  // it. A headband covers nothing: the bun stays.
  const covered = look.hat === "cap" || look.hat === "beanie" || look.hat === "chef";
  const hair = hairParts(look.hair, look.hairColor).filter((p) => !covered || p.kind !== "hairTop");
  const leg = legParts(look);
  const arm = armParts(look);
  return {
    root: sitting ? seatedLegParts(look, seatTop) : [],
    legL: sitting ? [] : leg,
    legR: sitting ? [] : leg,
    torso: torsoParts(look, sitting),
    armL: arm,
    armR: arm,
    head: [box([0, 0.16, 0], [0.3, 0.32, 0.3], look.skin, "skin"), ...faceParts(look.glasses), ...hair, ...hat],
  };
}
