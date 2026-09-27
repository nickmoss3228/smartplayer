import { describe, expect, it } from "vitest";
import { SCHOOL_VARIANTS, bundledRooms, canBuy, getVariant, starterRoomIds } from "../../config/schoolCatalog";
import { WALK_LANE, buildPlan, porchProps, walkerAt } from "./props";
import { arrivals, busStopX, groundsPlan, wayIn } from "./groundsLayout";

const variants = SCHOOL_VARIANTS.map((v) => v.id);

/** Every owned set along the catalog-order build chain. */
const chainOf = (variantId: string) => {
  const owned = starterRoomIds(variantId);
  const out = [[...owned]];
  const left = getVariant(variantId).rooms.map((r) => r.id).filter((id) => !owned.includes(id));
  while (left.length) {
    const next = left.find((id) => canBuy(variantId, owned, id));
    if (!next) break;
    for (const id of [next, ...bundledRooms(variantId, next)]) {
      owned.push(id);
      left.splice(left.indexOf(id), 1);
    }
    out.push([...owned]);
  }
  return out;
};

describe("the school grounds", () => {
  it("never puts anything where a room will one day stand", () => {
    for (const v of variants) {
      const g = groundsPlan(v);
      const all = buildPlan(getVariant(v).rooms.map((r) => r.id), v).rooms;
      const clash = (x0: number, z0: number, x1: number, z1: number) =>
        all.some((r) => x0 < r.x + r.w + 1 && x1 > r.x - 1 && z0 < r.z + r.d + 1 && z1 > r.z - 1);
      for (const f of g.features) {
        expect(clash(f.rect.x0, f.rect.z0, f.rect.x1, f.rect.z1), `${v} ${f.kind}`).toBe(false);
      }
      for (const t of g.items) {
        expect(clash(t.x - 0.8, t.z - 0.8, t.x + 0.8, t.z + 0.8), `${v} ${t.kind} at ${t.x},${t.z}`).toBe(false);
      }
    }
  });

  it("keeps everything on the plot, and the grounds inside the fence", () => {
    for (const v of variants) {
      const g = groundsPlan(v);
      const inside = (x: number, z: number, r: typeof g.tile) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
      for (const f of g.features) {
        expect(inside(f.rect.x0, f.rect.z0, g.fence) && inside(f.rect.x1, f.rect.z1, g.fence), `${v} ${f.kind}`).toBe(true);
      }
      for (const t of g.items) expect(inside(t.x, t.z, g.fence), `${v} tree`).toBe(true);
      for (const h of g.houses) {
        expect(inside(h.x, h.z, g.tile), `${v} house`).toBe(true);
        // The neighbours are over the fence, not in the playground.
        expect(inside(h.x, h.z, g.fence), `${v} house inside the fence`).toBe(false);
      }
      expect(g.fence.z1).toBe(g.pavement.z0);
      expect(g.road.z1).toBeLessThanOrEqual(g.tile.z1);
    }
  });

  it("finds room for a pitch on every campus", () => {
    for (const v of variants) {
      expect(groundsPlan(v).features.map((f) => f.kind), v).toContain("pitch");
    }
  });

  it("keeps every possible way in clear down to the street", () => {
    for (const v of variants) {
      const g = groundsPlan(v);
      for (const x of g.entrances) {
        for (const f of g.features) {
          const acrossLane = f.rect.x0 < x + 1.5 && f.rect.x1 > x - 1.5;
          const belowSchool = f.rect.z1 > g.fence.z1 - 8;
          expect(acrossLane && belowSchool, `${v} ${f.kind} blocks the way in at x=${x}`).toBe(false);
        }
        for (const t of g.items) {
          expect(Math.abs(t.x - x) < 1.5 && t.z > g.fence.z1 - 8, `${v} tree on the path at x=${x}`).toBe(false);
        }
      }
    }
  });

  it("gives every car park a way out to the road, and keeps it clear", () => {
    let carParks = 0;
    for (const v of variants) {
      const g = groundsPlan(v);
      for (const f of g.features.filter((ft) => ft.kind === "carPark")) {
        carParks++;
        const dw = g.driveways.find((d) => d.x > f.rect.x0 && d.x < f.rect.x1);
        expect(dw, `${v}: a car park with no driveway`).toBeTruthy();
        if (!dw) continue;
        // From the car park's front edge, all the way to the road.
        expect(dw.z0, v).toBe(f.rect.z1);
        expect(dw.z1, v).toBe(g.road.z0);
        expect(dw.x - dw.width / 2 >= f.rect.x0 && dw.x + dw.width / 2 <= f.rect.x1, `${v}: wider than its car park`).toBe(true);
        // Nothing standing in it.
        const inIt = (x: number, z: number, pad: number) =>
          Math.abs(x - dw.x) < dw.width / 2 + pad && z > dw.z0 - 0.5 && z < dw.z1 + 0.5;
        for (const l of g.lamps) expect(inIt(l.x, l.z, 0.3), `${v}: a lamp in the driveway`).toBe(false);
        for (const t of g.items) expect(inIt(t.x, t.z, 0.8), `${v}: a ${t.kind} in the driveway`).toBe(false);
        for (const x of g.entrances) {
          const stop = busStopX(g, x);
          expect(Math.abs(stop - dw.x) < dw.width / 2 + 2.5, `${v}: the bus stop blocks the driveway`).toBe(false);
        }
      }
    }
    // At least one campus has a car park, or this test proves nothing.
    expect(carParks).toBeGreaterThan(0);
  });

  it("lays out the same way every time", () => {
    for (const v of variants) expect(groundsPlan(v)).toEqual(groundsPlan(v));
  });

  it("has a way in from the street for every school along the build chain", () => {
    for (const v of variants) {
      const g = groundsPlan(v);
      for (const owned of chainOf(v)) {
        const plan = buildPlan(owned, v);
        const wi = wayIn(plan, g);
        expect(wi, `${v} [${owned.join(" ")}]`).not.toBeNull();
        expect(g.entrances, `${v} [${owned.join(" ")}] gate`).toContain(wi!.gateX);
      }
    }
  });

  it("walks students in and out without going through a room or the porch", () => {
    for (const v of variants) {
      const g = groundsPlan(v);
      for (const owned of chainOf(v)) {
        const plan = buildPlan(owned, v);
        const walkers = arrivals(wayIn(plan, g), g);
        const porch = porchProps(plan).filter((p) => p.type !== "path");
        const bad: string[] = [];
        for (const w of walkers) {
          for (let t = 0; t < 120; t += 0.37) {
            const at = walkerAt(w.path, t, undefined, w.lane ?? WALK_LANE);
            if (plan.rooms.some((r) => at.x > r.x + 0.2 && at.x < r.x + r.w - 0.2 && at.z > r.z + 0.2 && at.z < r.z + r.d - 0.2)) {
              bad.push(`${w.key} inside a room at ${at.x.toFixed(2)},${at.z.toFixed(2)}`);
            }
            for (const p of porch) {
              if (Math.hypot(p.x - at.x, p.z - at.z) < 0.55) bad.push(`${w.key} walks into the ${p.type}`);
            }
          }
        }
        expect(bad.slice(0, 5), `${v} [${owned.join(" ")}]`).toEqual([]);
      }
    }
  });
});
