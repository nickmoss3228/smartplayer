import { describe, expect, it } from "vitest";
import {
  SCHOOL_VARIANTS,
  bundledRooms,
  canBuy,
  getVariant,
  starterRoomIds,
} from "../../config/schoolCatalog";
import { buildPlan } from "./props";
import {
  EAVE,
  EAVE_Y,
  ROOF_STEP,
  ROOF_TOP_Y,
  distAt,
  fasciaTriangles,
  finishRects,
  hipRoofTriangles,
  roofField,
  roofHeight,
  roofLattice,
} from "./roof";

/** Every owned set along the catalog-order build chain, for every campus. */
const chains = SCHOOL_VARIANTS.flatMap((v) => {
  const owned = starterRoomIds(v.id);
  const out = [{ variantId: v.id, owned: [...owned] }];
  const left = getVariant(v.id).rooms.map((r) => r.id).filter((id) => !owned.includes(id));
  while (left.length) {
    const next = left.find((id) => canBuy(v.id, owned, id));
    if (!next) break;
    for (const id of [next, ...bundledRooms(v.id, next)]) {
      owned.push(id);
      left.splice(left.indexOf(id), 1);
    }
    out.push({ variantId: v.id, owned: [...owned] });
  }
  return out.map((c) => ({ ...c, plan: buildPlan(c.owned, c.variantId), label: `${c.variantId}/${c.owned.length}` }));
});

/** Collects failures and asserts once: an expect() per sample point takes
 *  minutes over sixty campuses. */
const problems = () => {
  const list: string[] = [];
  return { fail: (msg: string) => void (list.length < 12 && list.push(msg)), list };
};

describe("the roof", () => {
  it("covers every indoor room, out to its eave", () => {
    const p = problems();
    for (const { plan, label } of chains) {
      const f = roofField(plan.rooms);
      if (!f) {
        p.fail(`${label}: no roof`);
        continue;
      }
      for (const r of plan.rooms.filter((room) => !room.outdoor)) {
        for (let x = r.x; x <= r.x + r.w; x += 0.5) {
          for (let z = r.z; z <= r.z + r.d; z += 0.5) {
            if (distAt(f, x, z) < EAVE - 1e-6) p.fail(`${label} ${r.id} (${x}, ${z})`);
          }
        }
      }
    }
    expect(p.list).toEqual([]);
  });

  it("leaves the grounds open to the sky past the eave", () => {
    const p = problems();
    for (const { plan, label } of chains) {
      const f = roofField(plan.rooms)!;
      for (const r of plan.rooms.filter((room) => room.outdoor)) {
        for (let x = r.x + EAVE + 0.25; x < r.x + r.w - EAVE; x += 0.5) {
          for (let z = r.z + EAVE + 0.25; z < r.z + r.d - EAVE; z += 0.5) {
            if (distAt(f, x, z) !== 0) p.fail(`${label} ${r.id} (${x}, ${z})`);
          }
        }
      }
    }
    expect(p.list).toEqual([]);
  });

  it("is one surface: every triangle faces up, between the eave and the cap", () => {
    const p = problems();
    for (const { plan, label } of chains) {
      const tris = hipRoofTriangles(roofField(plan.rooms)!);
      if (!tris.length || tris.length % 9) p.fail(`${label}: ${tris.length} floats`);
      for (let t = 0; t < tris.length; t += 9) {
        const [ax, ay, az, bx, by, bz, cx, cy, cz] = tris.subarray(t, t + 9);
        const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
        if (!(ny > 0)) p.fail(`${label} triangle ${t / 9} faces down`);
        for (const y of [ay, by, cy]) {
          if (y < EAVE_Y - 1e-5 || y > ROOF_TOP_Y + 1e-5) p.fail(`${label} triangle ${t / 9} at y ${y}`);
        }
      }
    }
    expect(p.list).toEqual([]);
  });

  it("puts every eave at the same height, on the eave line", () => {
    const p = problems();
    for (const { plan, label } of chains) {
      const f = roofField(plan.rooms)!;
      const fascia = fasciaTriangles(f, 0.2);
      if (!fascia.length) p.fail(`${label}: no fascia`);
      for (let k = 0; k < fascia.length; k += 3) {
        const [x, y, z] = fascia.subarray(k, k + 3);
        if (![EAVE_Y, EAVE_Y - 0.2].some((h) => Math.abs(h - y) < 1e-5)) p.fail(`${label} fascia at y ${y}`);
        // On the eave line, where the field is zero.
        if (distAt(f, x, z) !== 0) p.fail(`${label} fascia off the eave at (${x}, ${z})`);
      }
    }
    expect(p.list).toEqual([]);
  });

  it("has no creases the mesh cannot draw", () => {
    // The field is known at the middle of every mesh edge. If it is not the
    // straight line between the edge's two corners, a fold crosses that edge
    // and the mesh would flatten it into a seam.
    const p = problems();
    for (const { plan, label } of chains) {
      const f = roofField(plan.rooms)!;
      const h = (i: number, j: number) => roofHeight(f.dist[j * f.nx + i]);
      for (let j = 0; j + 2 < f.nz; j += 2) {
        for (let i = 0; i + 2 < f.nx; i += 2) {
          if (Math.abs(h(i + 1, j) - (h(i, j) + h(i + 2, j)) / 2) > 1e-5) p.fail(`${label} x-edge ${i},${j}`);
          if (Math.abs(h(i, j + 1) - (h(i, j) + h(i, j + 2)) / 2) > 1e-5) p.fail(`${label} z-edge ${i},${j}`);
        }
      }
    }
    expect(p.list).toEqual([]);
  });

  it("lays a flat finish across wall lines, clear of the edge", () => {
    const p = problems();
    for (const { plan, label } of chains) {
      const f = roofField(plan.rooms)!;
      const rects = finishRects(f, 0.75);
      if (!rects.length) p.fail(`${label}: no finish`);
      for (const r of rects) {
        for (let x = r.x + ROOF_STEP / 2; x < r.x + r.w; x += ROOF_STEP) {
          for (let z = r.z + ROOF_STEP / 2; z < r.z + r.d; z += ROOF_STEP) {
            if (distAt(f, x, z) < 0.75 - ROOF_STEP / 2 - 1e-6) p.fail(`${label} finish at (${x}, ${z})`);
          }
        }
      }
      // Merging is the point: a block is a few rectangles, not one per cell.
      const cells = rects.reduce((n, r) => n + (r.w * r.d) / (ROOF_STEP * ROOF_STEP), 0);
      if (rects.length > cells / 8) p.fail(`${label}: ${rects.length} rects for ${cells} cells`);
    }
    expect(p.list).toEqual([]);
  });

  it("keeps every roof fitting on the roof", () => {
    const p = problems();
    for (const { plan, label } of chains) {
      const f = roofField(plan.rooms)!;
      for (const [x, z] of roofLattice(f, 1.8, 1.6, 0.8, 0.55, 0.9)) {
        for (const [dx, dz] of [
          [-0.8, -0.55],
          [0.8, -0.55],
          [-0.8, 0.55],
          [0.8, 0.55],
        ]) {
          if (distAt(f, x + dx, z + dz) < 0.9) p.fail(`${label} panel at ${x},${z}`);
        }
      }
    }
    expect(p.list).toEqual([]);
  });
});
