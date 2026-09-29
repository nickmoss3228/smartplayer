import { describe, expect, it } from "vitest";
import { SEAT_TOP } from "../school/props";
import {
  BOTTOM_STYLES,
  CharacterLook,
  DEFAULT_LOOK,
  GLASSES_STYLES,
  HAIR_STYLES,
  HAT_STYLES,
  HatStyle,
  TOP_STYLES,
  crowdLook,
} from "./look";
import { DEFAULT_SEAT_TOP, HIP_Y, Joint, Part, figureParts, jointPositions, shade } from "./figureParts";

/** Every combination of styles, in the default colours. */
function everyLook(): CharacterLook[] {
  const out: CharacterLook[] = [];
  const hats: HatStyle[] = [...HAT_STYLES, "chef"];
  for (const hair of HAIR_STYLES)
    for (const top of TOP_STYLES)
      for (const bottom of BOTTOM_STYLES)
        for (const glasses of GLASSES_STYLES)
          for (const hat of hats) out.push({ ...DEFAULT_LOOK, hair, top, bottom, glasses, hat });
  return out;
}

const looks = everyLook();
const label = (l: CharacterLook) => `${l.hair}/${l.top}/${l.bottom}/${l.glasses}/${l.hat}`;

/** A box's extent on one axis. */
const span = (p: Part, axis: 0 | 1 | 2) => [p.p[axis] - p.s[axis] / 2, p.p[axis] + p.s[axis] / 2];
const overlaps = (a: number[], b: number[]) => a[0] < b[1] && b[0] < a[1];

/** A part's lowest point, in the root's space. */
function bottomOf(joint: Joint, part: Part, sitting: boolean): number {
  const at = jointPositions(sitting, SEAT_TOP);
  const base = joint === "armL" || joint === "armR" || joint === "head" ? at.torso[1] + at[joint][1] : at[joint][1];
  return base + span(part, 1)[0];
}

describe("a figure", () => {
  it("sits at the height every chair in the school is built to", () => {
    expect(DEFAULT_SEAT_TOP).toBe(SEAT_TOP);
  });

  it("never has hair or a hat over its eyes, whatever it wears", () => {
    // The eyes: a band across the front of the face.
    const eyes = { x: [-0.1, 0.1], y: [0.155, 0.205], z: [0.14, 0.2] };
    const problems: string[] = [];
    for (const look of looks) {
      for (const part of figureParts(look, false).head) {
        if (part.kind !== "hair" && part.kind !== "hairTop" && part.kind !== "hat") continue;
        if (overlaps(span(part, 0), eyes.x) && overlaps(span(part, 1), eyes.y) && overlaps(span(part, 2), eyes.z)) {
          problems.push(`${label(look)}: ${part.kind} at ${part.p.join(",")}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("can always be seen to have eyes — or glasses where the eyes are", () => {
    const problems = looks.filter((look) => {
      const head = figureParts(look, false).head;
      return look.glasses === "shades"
        ? !head.some((p) => p.kind === "glasses" && p.p[2] > 0.15)
        : head.filter((p) => p.kind === "eye" && p.p[2] > 0.15).length !== 2;
    });
    expect(problems.map(label)).toEqual([]);
  });

  it("puts nothing through a hat", () => {
    const problems: string[] = [];
    // A headband is round the head, not over it.
    for (const look of looks.filter((l) => l.hat !== "none" && l.hat !== "headband")) {
      const head = figureParts(look, false).head;
      const top = Math.max(...head.filter((p) => p.kind === "hat").map((p) => span(p, 1)[1]));
      for (const p of head.filter((q) => q.kind === "hair" || q.kind === "hairTop")) {
        if (span(p, 1)[1] > top + 1e-9) problems.push(`${label(look)}: hair above the hat`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("stands on the floor, and sits on the seat with its feet on the floor", () => {
    const problems: string[] = [];
    for (const look of looks) {
      for (const sitting of [false, true]) {
        const parts = figureParts(look, sitting, SEAT_TOP);
        let lowest = Infinity;
        for (const joint of Object.keys(parts) as Joint[]) {
          for (const part of parts[joint]) lowest = Math.min(lowest, bottomOf(joint, part, sitting));
        }
        if (Math.abs(lowest) > 1e-9) problems.push(`${label(look)} ${sitting ? "sitting" : "standing"}: lowest at ${lowest}`);
      }
      // Seated thighs rest ON the seat, not in it.
      const thighs = figureParts(look, true, SEAT_TOP).root.filter((p) => p.s[2] > 0.4);
      for (const t of thighs) {
        if (Math.abs(span(t, 1)[0] - SEAT_TOP) > 1e-9) problems.push(`${label(look)}: thigh not on the seat`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("wears what it was given: a skirt, shorts or trousers, in the chosen colour", () => {
    const colour = "#123456";
    for (const bottom of BOTTOM_STYLES) {
      const parts = figureParts({ ...DEFAULT_LOOK, bottom, bottomColor: colour }, false);
      const onLegs = parts.legL.some((p) => p.c === colour);
      const onHips = parts.torso.some((p) => p.c === colour);
      expect({ bottom, onLegs, onHips }).toEqual({
        bottom,
        onLegs: bottom !== "skirt",
        onHips: bottom === "skirt",
      });
    }
    // Standing legs reach from the hip to the floor.
    const leg = figureParts(DEFAULT_LOOK, false).legL.find((p) => p.kind === "cloth")!;
    expect(span(leg, 1)).toEqual([-HIP_Y, 0]);
  });

  it("only uses real colours", () => {
    const hex = /^#[0-9a-f]{6}$/;
    const bad = new Set<string>();
    for (const look of [...looks.slice(0, 200), ...Array.from({ length: 40 }, (_, i) => crowdLook(i))]) {
      for (const sitting of [false, true]) {
        for (const list of Object.values(figureParts(look, sitting))) {
          for (const p of list) if (!hex.test(p.c) || p.s.some((v) => v <= 0)) bad.add(`${label(look)} ${p.c}`);
        }
      }
    }
    expect([...bad]).toEqual([]);
  });

  it("shades a colour darker and lighter without leaving the range", () => {
    expect(shade("#808080", 0.5)).toBe("#404040");
    expect(shade("#808080", 2)).toBe("#ffffff");
    expect(shade("#ffffff", 1.2)).toBe("#ffffff");
    expect(shade("#000000", 0.8)).toBe("#000000");
  });
});
