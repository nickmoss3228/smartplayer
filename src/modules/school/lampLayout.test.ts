import { describe, expect, it } from "vitest";
import { SCHOOL_VARIANTS, getVariant } from "../../config/schoolCatalog";
import { buildPlan } from "./props";
import { NEON, nightness, pendantsFor, roomLights } from "./lampLayout";

const fullPlans = SCHOOL_VARIANTS.map((v) => buildPlan(getVariant(v.id).rooms.map((r) => r.id), v.id));

describe("the school's own lights", () => {
  it("are off all day, on all night, and fade between", () => {
    expect(nightness(8)).toBe(0);
    expect(nightness(18.99)).toBe(0);
    expect(nightness(22)).toBe(1);
    expect(nightness(3)).toBe(1);
    expect(nightness(19.3)).toBeGreaterThan(0);
    expect(nightness(19.3)).toBeLessThan(1);
    expect(nightness(6.7)).toBeGreaterThan(0);
    expect(nightness(6.7)).toBeLessThan(1);
    expect(nightness(7)).toBe(0);
    // Only ever brighter through the evening fade.
    let last = 0;
    for (let h = 19; h <= 19.6; h += 0.05) {
      expect(nightness(h)).toBeGreaterThanOrEqual(last);
      last = nightness(h);
    }
  });

  it("hang a lamp in every indoor room, inside it, and none over the grounds", () => {
    for (const plan of fullPlans) {
      const lamps = pendantsFor(plan.rooms);
      for (const r of plan.rooms) {
        const mine = lamps.filter((l) => l.roomId === r.id);
        if (r.outdoor) {
          expect(mine, r.id).toEqual([]);
          continue;
        }
        expect(mine.length, r.id).toBeGreaterThanOrEqual(1);
        expect(mine.length, r.id).toBeLessThanOrEqual(3);
        for (const l of mine) {
          expect(l.x > r.x && l.x < r.x + r.w && l.z > r.z && l.z < r.z + r.d, `${r.id} lamp outside its room`).toBe(true);
        }
      }
    }
  });

  it("keep the real lights to a budget, biggest rooms first", () => {
    for (const plan of fullPlans) {
      const lights = roomLights(plan.rooms);
      expect(lights.length).toBeLessThanOrEqual(16);
      const biggest = [...plan.rooms].filter((r) => !r.outdoor).sort((a, b) => b.w * b.d - a.w * a.d)[0];
      expect(lights.some((l) => l.x === biggest.x + biggest.w / 2 && l.z === biggest.z + biggest.d / 2)).toBe(true);
    }
  });

  it("give every indoor kind of room a neon colour", () => {
    for (const plan of fullPlans) {
      for (const r of plan.rooms.filter((room) => !room.outdoor)) expect(NEON[r.kind], r.kind).toBeTruthy();
    }
  });
});
