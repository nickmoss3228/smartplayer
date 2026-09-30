import { describe, expect, it } from "vitest";
import { SCHOOL_VARIANTS, starterRoomIds } from "../../config/schoolCatalog";
import { blockers, boundaryOpenings, buildPlan } from "./props";
import type { SchoolRoomRect } from "../../config/schoolCatalog";
import { CELL, findPath, nearestStandable, walkGrid } from "./walkGrid";

const full = SCHOOL_VARIANTS.map((v) => ({ label: v.id, plan: buildPlan(v.rooms.map((r) => r.id), v.id) }));
const starts = SCHOOL_VARIANTS.map((v) => ({ label: `${v.id} starter`, plan: buildPlan(starterRoomIds(v.id), v.id) }));

/** Every point along the path, a few centimetres apart. */
function* along(from: { x: number; z: number }, path: { x: number; z: number }[]) {
  let a = from;
  for (const b of path) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.05));
    for (let i = 0; i <= n; i++) yield { x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n };
    a = b;
  }
}

describe("walking the player round the school", () => {
  it("can reach the middle of every room from the corridor, in every campus", () => {
    for (const { label, plan } of [...full, ...starts]) {
      const g = walkGrid(plan);
      const hub = plan.rooms.find((r) => r.id === "corridor") ?? plan.rooms[0];
      const from = nearestStandable(g, { x: hub.x + hub.w / 2, z: hub.z + hub.d / 2 }, 6)!;
      expect(from, `${label}: nowhere to stand in the ${hub.id}`).not.toBeNull();
      for (const r of plan.rooms) {
        const to = nearestStandable(g, { x: r.x + r.w / 2, z: r.z + r.d / 2 }, Math.max(r.w, r.d));
        expect(to, `${label}: nowhere to stand in the ${r.id}`).not.toBeNull();
        expect(findPath(g, from, to!), `${label}: cannot walk to the ${r.id}`).not.toBeNull();
      }
    }
  });

  it("never walks through furniture or through a wall", () => {
    for (const { label, plan } of full) {
      const g = walkGrid(plan);
      const solid = blockers(plan);
      const hub = plan.rooms.find((r) => r.id === "corridor") ?? plan.rooms[0];
      const from = nearestStandable(g, { x: hub.x + hub.w / 2, z: hub.z + hub.d / 2 }, 6)!;
      const roomAt = (p: { x: number; z: number }) =>
        plan.rooms.find((o) => p.x > o.x && p.x < o.x + o.w && p.z > o.z && p.z < o.z + o.d);
      // A crossing from one room into the next has to be in a doorway of one
      // of them: within the opening's width along the wall they share.
      const throughDoor = (a: SchoolRoomRect, b: SchoolRoomRect, p: { x: number; z: number }) =>
        [a, b].some((r) => {
          const o = boundaryOpenings(plan, r);
          const near = (v: number, w: number) => Math.abs(v - w) < 0.4;
          return (
            (near(p.z, r.z) && o.north.some((d) => Math.abs(p.x - d.at) < d.width / 2)) ||
            (near(p.z, r.z + r.d) && o.south.some((d) => Math.abs(p.x - d.at) < d.width / 2)) ||
            (near(p.x, r.x) && o.west.some((d) => Math.abs(p.z - d.at) < d.width / 2)) ||
            (near(p.x, r.x + r.w) && o.east.some((d) => Math.abs(p.z - d.at) < d.width / 2))
          );
        });
      for (const r of plan.rooms) {
        const to = nearestStandable(g, { x: r.x + r.w / 2, z: r.z + r.d / 2 }, Math.max(r.w, r.d))!;
        let was = roomAt(from);
        for (const p of along(from, findPath(g, from, to) ?? [])) {
          const hit = solid.find((b) => p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1);
          expect(hit?.key, `${label}: the way to the ${r.id} walks through ${hit?.key}`).toBeUndefined();
          const now = roomAt(p);
          if (!now) {
            // On a wall line, between two rooms: only ever in a doorway.
            const touching = plan.rooms.filter(
              (o) => p.x > o.x - CELL && p.x < o.x + o.w + CELL && p.z > o.z - CELL && p.z < o.z + o.d + CELL,
            );
            expect(touching.length, `${label}: the way to the ${r.id} leaves the school at ${p.x.toFixed(2)},${p.z.toFixed(2)}`).toBeGreaterThan(0);
            continue;
          }
          if (was && now.id !== was.id) {
            expect(throughDoor(was, now, p), `${label}: the way to the ${r.id} goes through the wall from the ${was.id} into the ${now.id} at ${p.x.toFixed(2)},${p.z.toFixed(2)}`).toBe(true);
          }
          was = now;
        }
      }
    }
  });

  it("walks straight across an empty stretch rather than cell by cell", () => {
    const { plan } = full[0];
    const g = walkGrid(plan);
    const hub = plan.rooms.find((r) => r.id === "corridor")!;
    const a = nearestStandable(g, { x: hub.x + 2, z: hub.z + hub.d / 2 })!;
    const b = nearestStandable(g, { x: hub.x + 8, z: hub.z + hub.d / 2 })!;
    expect(findPath(g, a, b)!.length).toBeLessThanOrEqual(2);
  });

  it("finds somewhere to stand next to a chair someone would sit in", () => {
    const { plan } = starts[0];
    const g = walkGrid(plan);
    const chairs = blockers(plan).filter((b) => b.key.includes("chair"));
    for (const c of chairs.slice(0, 5)) {
      const spot = nearestStandable(g, { x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2 });
      expect(spot).not.toBeNull();
    }
  });
});
