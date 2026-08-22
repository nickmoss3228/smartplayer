import { describe, it, expect } from 'vitest';

import {
  SCHOOL_STAGES,
  SCHOOL_LAYOUTS,
  SCHOOL_WALLPAPERS,
  SCHOOL_FLOORS,
  SCHOOL_VARIANTS,
  DEFAULT_LAYOUT_ID,
  DEFAULT_WALLPAPER_ID,
  DEFAULT_FLOOR_ID,
  DEFAULT_VARIANT_ID,
  MAX_STAGE,
  SchoolRoomRect,
  getStage,
  getVariant,
  roomsAtStage,
} from './schoolCatalog';

import {
  SCHOOL_STAGES as SERVER_STAGES,
  SCHOOL_LAYOUTS as SERVER_LAYOUTS,
  SCHOOL_WALLPAPERS as SERVER_WALLPAPERS,
  SCHOOL_FLOORS as SERVER_FLOORS,
  SCHOOL_VARIANTS as SERVER_VARIANTS,
  DEFAULT_LAYOUT_ID as SERVER_DEFAULT_LAYOUT,
  DEFAULT_WALLPAPER_ID as SERVER_DEFAULT_WALLPAPER,
  DEFAULT_FLOOR_ID as SERVER_DEFAULT_FLOOR,
  DEFAULT_VARIANT_ID as SERVER_DEFAULT_VARIANT,
  STARTER_STAGE as SERVER_STARTER_STAGE,
  roomsAtStage as serverRoomsAtStage,
  variantForUserId,
} from '../../backend/src/config/schoolCatalog.js';

import {
  blockers,
  buildPlan,
  classroomsOf,
  deskLayout,
  doorZones,
  footprintOf,
  peoplePlan,
  seatOf,
  stageProps,
  wallOpenings,
} from '../modules/school/props';

/**
 * src/config/schoolCatalog.ts is a hand-maintained mirror of the backend
 * catalog, and the upgrade button quotes its prices before the server charges
 * the real ones. Drift is silent and user-facing: the button promises 320
 * BitAward, the server takes 550, and nothing throws anywhere a developer would
 * see it. Same contract the character/shop mirrors are held to in
 * catalogMirror.test.ts.
 *
 * Everything below sweeps ALL THREE campus variants at ALL TEN stages, because
 * a floorplan bug in the variant nobody has looked at is exactly the kind that
 * reaches a player.
 */

const layoutIds = SCHOOL_LAYOUTS.map((l) => l.id);
const variantIds = SCHOOL_VARIANTS.map((v) => v.id);

const everyPlan = () =>
  variantIds.flatMap((variantId) =>
    SCHOOL_STAGES.map((stage) => ({
      variantId,
      stage,
      label: `${variantId}/${stage.id}`,
      rooms: roomsAtStage(variantId, stage.index),
      plan: buildPlan(stage, variantId),
    })),
  );

type AnyStage = {
  index: number;
  id: string;
  cost: { bitAward: number; bitWord: number; bitPhrase: number };
  desks: number;
  students: number;
  secondaryDesks: number;
  secondaryStudents: number;
  teachers: number;
  wanderers: number;
  commuters: number;
};

type AnySurface = { id: string; unlocksAtStage: number };

const economics = (stages: readonly AnyStage[]) =>
  stages.map((s) => ({
    index: s.index,
    id: s.id,
    cost: s.cost,
    desks: s.desks,
    students: s.students,
    secondaryDesks: s.secondaryDesks,
    secondaryStudents: s.secondaryStudents,
    teachers: s.teachers,
    wanderers: s.wanderers,
    commuters: s.commuters,
  }));

const unlocks = (list: readonly AnySurface[]) =>
  list.map(({ id, unlocksAtStage }) => ({ id, unlocksAtStage }));

/** Normalised so an absent `outdoor` and an explicit `false` compare equal. */
const shape = (rooms: readonly SchoolRoomRect[]) =>
  rooms.map(({ id, kind, x, z, w, d, outdoor }) => ({
    id, kind, x, z, w, d, outdoor: outdoor ?? false,
  }));

describe('school catalog mirrors the server', () => {
  it('has the same stages, in the same order, at the same prices', () => {
    expect(economics(SCHOOL_STAGES)).toEqual(economics(SERVER_STAGES));
  });

  it('offers the same campus variants', () => {
    expect(variantIds).toEqual(SERVER_VARIANTS.map((v: { id: string }) => v.id));
  });

  it('lays out every variant and stage on the same floorplan', () => {
    // The client draws the building from these rectangles; the server stores
    // only an index and a variant id. They still have to agree, or a visitor
    // and the owner see different schools.
    for (const variantId of variantIds) {
      for (const stage of SCHOOL_STAGES) {
        expect(shape(roomsAtStage(variantId, stage.index)), `${variantId}/${stage.id}`).toEqual(
          shape(serverRoomsAtStage(variantId, stage.index)),
        );
      }
    }
  });

  it('agrees on every doorway', () => {
    for (const v of SCHOOL_VARIANTS) {
      const server = SERVER_VARIANTS.find((s: { id: string }) => s.id === v.id);
      expect(server, `${v.id} is missing from the server catalog`).toBeDefined();
      expect(v.doors, v.id).toEqual(server?.doors);
    }
  });

  it('agrees on which looks unlock when', () => {
    expect(unlocks(SCHOOL_LAYOUTS)).toEqual(unlocks(SERVER_LAYOUTS));
    expect(unlocks(SCHOOL_WALLPAPERS)).toEqual(unlocks(SERVER_WALLPAPERS));
    expect(unlocks(SCHOOL_FLOORS)).toEqual(unlocks(SERVER_FLOORS));
  });

  it('agrees on the defaults a new player starts with', () => {
    expect(DEFAULT_LAYOUT_ID).toBe(SERVER_DEFAULT_LAYOUT);
    expect(DEFAULT_WALLPAPER_ID).toBe(SERVER_DEFAULT_WALLPAPER);
    expect(DEFAULT_FLOOR_ID).toBe(SERVER_DEFAULT_FLOOR);
    expect(DEFAULT_VARIANT_ID).toBe(SERVER_DEFAULT_VARIANT);
    expect(SCHOOL_STAGES[SERVER_STARTER_STAGE]).toBeDefined();
  });
});

describe('variant assignment', () => {
  it('is stable for a given user id', () => {
    expect(variantForUserId('507f1f77bcf86cd799439011')).toBe(
      variantForUserId('507f1f77bcf86cd799439011'),
    );
  });

  it('only ever returns a variant that exists', () => {
    for (let i = 0; i < 200; i++) {
      expect(variantIds).toContain(variantForUserId(`507f1f77bcf86cd7994390${i}`));
    }
  });

  it('actually spreads players across all three campuses', () => {
    // The point of variants is that a visitor sees a different school. A hash
    // that collapsed onto one id would compile, pass every other test, and
    // quietly undo the whole feature.
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(variantForUserId(`user-${i}`));
    expect([...seen].sort()).toEqual([...variantIds].sort());
  });
});

describe('stage economy', () => {
  it('starts free and never gets cheaper', () => {
    expect(SCHOOL_STAGES[0].cost).toEqual({ bitAward: 0, bitWord: 0, bitPhrase: 0 });
    for (let i = 1; i < SCHOOL_STAGES.length; i++) {
      for (const currency of ['bitAward', 'bitWord', 'bitPhrase'] as const) {
        expect(
          SCHOOL_STAGES[i].cost[currency],
          `stage ${i} ${currency} is not more than stage ${i - 1}`,
        ).toBeGreaterThan(SCHOOL_STAGES[i - 1].cost[currency]);
      }
    }
  });

  it('prices everything in non-negative whole coins', () => {
    for (const stage of SCHOOL_STAGES) {
      for (const amount of Object.values(stage.cost)) {
        expect(Number.isInteger(amount), `${stage.id} has a fractional price`).toBe(true);
        expect(amount, `${stage.id} has a negative price`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('indexes stages densely from zero', () => {
    expect(SCHOOL_STAGES.map((s) => s.index)).toEqual(SCHOOL_STAGES.map((_, i) => i));
    expect(MAX_STAGE).toBe(SCHOOL_STAGES.length - 1);
  });

  it('leaves the player a desk of their own', () => {
    // peoplePlan seats the player at one desk and NPCs at the rest, so a stage
    // with students >= desks would seat somebody on top of the player.
    for (const stage of SCHOOL_STAGES) {
      expect(stage.students, `${stage.id}`).toBeLessThan(stage.desks);
      expect(stage.secondaryStudents, `${stage.id}`).toBeLessThanOrEqual(stage.secondaryDesks);
    }
  });

  it('never shrinks a campus', () => {
    for (const variantId of variantIds) {
      for (let i = 1; i < SCHOOL_STAGES.length; i++) {
        const before = roomsAtStage(variantId, i - 1).map((r) => r.id);
        const after = roomsAtStage(variantId, i).map((r) => r.id);
        for (const id of before) {
          expect(after, `${variantId} lost the ${id} at stage ${i}`).toContain(id);
        }
      }
    }
  });

  it('gets every variant to three classrooms by the end', () => {
    for (const variantId of variantIds) {
      const classrooms = roomsAtStage(variantId, MAX_STAGE).filter((r) => r.kind === 'classroom');
      expect(classrooms.length, variantId).toBe(3);
    }
  });
});

describe('floorplan geometry', () => {
  const area = (a: SchoolRoomRect, b: SchoolRoomRect) =>
    Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z));

  it('never overlaps two rooms', () => {
    // Overlapping rects would draw two floors in the same place and z-fight,
    // which on a phone reads as flickering rather than as a layout bug.
    for (const { rooms, label } of everyPlan()) {
      for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
          expect(
            area(rooms[i], rooms[j]),
            `${label}: ${rooms[i].id} overlaps ${rooms[j].id}`,
          ).toBe(0);
        }
      }
    }
  });

  it('gives every room positive extent', () => {
    for (const { rooms, label } of everyPlan()) {
      for (const room of rooms) {
        expect(room.w, `${label}/${room.id} has no width`).toBeGreaterThan(0);
        expect(room.d, `${label}/${room.id} has no depth`).toBeGreaterThan(0);
      }
    }
  });

  it('never places a room directly north of a classroom', () => {
    // Building.tsx drops a wall span to knee height wherever two rooms meet, so
    // the room behind stays visible. A classroom's board hangs at 1.0-2.35m on
    // its NORTH wall, so anything built north of a classroom leaves that board
    // floating over a 0.95m partition. Every floorplan is arranged around this
    // rule, and breaking it is invisible until you look at the render.
    for (const { rooms, label } of everyPlan()) {
      for (const c of rooms.filter((r) => r.kind === 'classroom')) {
        for (const other of rooms) {
          if (other.id === c.id) continue;
          const behind = Math.abs(other.z + other.d - c.z) < 0.01;
          const shares = Math.min(other.x + other.w, c.x + c.w) - Math.max(other.x, c.x) > 0.01;
          expect(
            behind && shares,
            `${label}: ${other.id} sits north of ${c.id}, stranding its board`,
          ).toBe(false);
        }
      }
    }
  });
});

describe('doorways', () => {
  it('puts every door on the edge the two rooms actually share', () => {
    // A door point that misses the shared edge produces no gap in the wall, and
    // the router happily walks people straight through the brickwork — which is
    // precisely the bug this pins down.
    for (const variantId of variantIds) {
      const variant = getVariant(variantId);
      const byId = new Map(roomsAtStage(variantId, MAX_STAGE).map((r) => [r.id, r]));

      for (const [roomId, door] of Object.entries(variant.doors)) {
        const room = byId.get(roomId);
        const parent = door.parent ? byId.get(door.parent) : undefined;
        expect(room, `${variantId}: door for unknown room ${roomId}`).toBeDefined();
        expect(parent, `${variantId}: ${roomId} has unknown parent ${door.parent}`).toBeDefined();
        if (!room || !parent) continue;

        const onSharedZ =
          (Math.abs(room.z - (parent.z + parent.d)) < 0.01 && Math.abs(door.z - room.z) < 0.01) ||
          (Math.abs(parent.z - (room.z + room.d)) < 0.01 && Math.abs(door.z - parent.z) < 0.01);
        const onSharedX =
          (Math.abs(room.x - (parent.x + parent.w)) < 0.01 && Math.abs(door.x - room.x) < 0.01) ||
          (Math.abs(parent.x - (room.x + room.w)) < 0.01 && Math.abs(door.x - parent.x) < 0.01);

        expect(
          onSharedZ || onSharedX,
          `${variantId}: the ${roomId} door is not on its shared edge with ${door.parent}`,
        ).toBe(true);
      }
    }
  });

  it('keeps every door inside the run the two rooms have in common', () => {
    for (const variantId of variantIds) {
      const variant = getVariant(variantId);
      const byId = new Map(roomsAtStage(variantId, MAX_STAGE).map((r) => [r.id, r]));
      for (const [roomId, door] of Object.entries(variant.doors)) {
        const room = byId.get(roomId);
        const parent = door.parent ? byId.get(door.parent) : undefined;
        if (!room || !parent) continue;

        const lo = Math.max(room.x, parent.x);
        const hi = Math.min(room.x + room.w, parent.x + parent.w);
        if (hi - lo > 0.01) {
          expect(door.x, `${variantId}/${roomId} door x off the shared run`).toBeGreaterThanOrEqual(lo - 0.01);
          expect(door.x, `${variantId}/${roomId} door x off the shared run`).toBeLessThanOrEqual(hi + 0.01);
        }
        const zlo = Math.max(room.z, parent.z);
        const zhi = Math.min(room.z + room.d, parent.z + parent.d);
        if (zhi - zlo > 0.01) {
          expect(door.z, `${variantId}/${roomId} door z off the shared run`).toBeGreaterThanOrEqual(zlo - 0.01);
          expect(door.z, `${variantId}/${roomId} door z off the shared run`).toBeLessThanOrEqual(zhi + 0.01);
        }
      }
    }
  });

  it('never walks anybody through a wall', () => {
    // THE test for this whole subsystem, and the one the reported bug needed.
    // Doors used to be points the router aimed at while the geometry drew an
    // unbroken wall across them, so people strolled through brickwork. Rather
    // than assert that a door produces an opening — which just restates the
    // implementation — this walks every route anybody actually follows and
    // checks each wall crossing lands inside a hole.
    interface Wall {
      roomId: string;
      side: 'north' | 'west';
      fixed: number;
      from: number;
      to: number;
    }

    for (const { plan, rooms, label } of everyPlan()) {
      const openings = wallOpenings(plan);
      const walls: Wall[] = [];
      for (const r of rooms) {
        if (r.outdoor) continue; // open ground has no walls to walk through
        walls.push({ roomId: r.id, side: 'north', fixed: r.z, from: r.x, to: r.x + r.w });
        walls.push({ roomId: r.id, side: 'west', fixed: r.x, from: r.z, to: r.z + r.d });
      }

      const cast = peoplePlan(plan, DEFAULT_LAYOUT_ID);
      const routes: { key: string; pts: { x: number; z: number }[] }[] = [
        ...cast.commuters.map((c) => ({ key: c.key, pts: [c.seats[0], ...c.path, c.seats[1]] })),
        ...cast.wanderers.map((w) => ({ key: w.key, pts: [...w.path, w.path[0]] })),
        ...cast.teachers.map((t) => ({ key: t.key, pts: [...t.path, t.path[0]] })),
      ];

      for (const route of routes) {
        for (let i = 0; i < route.pts.length - 1; i++) {
          const a = route.pts[i];
          const b = route.pts[i + 1];

          for (const wall of walls) {
            // Which coordinate the wall is fixed in, and which it runs along.
            const aPerp = wall.side === 'north' ? a.z : a.x;
            const bPerp = wall.side === 'north' ? b.z : b.x;
            const da = aPerp - wall.fixed;
            const db = bPerp - wall.fixed;
            // Only a strict sign change is a crossing; touching or running
            // along a wall is not walking through it.
            if (da === 0 || db === 0 || da * db > 0) continue;

            const t = da / (da - db);
            const aPar = wall.side === 'north' ? a.x : a.z;
            const bPar = wall.side === 'north' ? b.x : b.z;
            const hit = aPar + (bPar - aPar) * t;
            if (hit < wall.from - 0.01 || hit > wall.to + 0.01) continue;

            const holes =
              wall.side === 'north'
                ? (openings[wall.roomId]?.north ?? [])
                : (openings[wall.roomId]?.west ?? []);
            const through = holes.some((h) => Math.abs(hit - h.at) <= h.width / 2 + 0.05);

            expect(
              through,
              `${label}/${route.key} leg ${i} crosses the ${wall.roomId} ${wall.side} wall at ` +
                `${hit.toFixed(2)} with no doorway there`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it('gives every classroom a doorway of its own', () => {
    for (const { plan, label } of everyPlan()) {
      const openings = wallOpenings(plan);
      for (const c of classroomsOf(plan)) {
        const o = openings[c.id];
        expect(
          (o?.north.length ?? 0) + (o?.west.length ?? 0),
          `${label}/${c.id} has no way in`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe('desk layouts', () => {
  it("produces exactly each classroom's desk count, in every preset", () => {
    for (const { plan, stage, label } of everyPlan()) {
      for (const id of layoutIds) {
        for (const c of classroomsOf(plan)) {
          const want = c.id === 'classroom' ? stage.desks : stage.secondaryDesks;
          expect(deskLayout(plan, id, c.id), `${label}/${id}/${c.id}`).toHaveLength(want);
        }
      }
    }
  });

  it('keeps desks and the people at them inside their own classroom', () => {
    // The failure mode that is invisible in a screenshot of stage 9 but obvious
    // at stage 0: a preset tuned for the big room puts a student through the
    // wall of the small one.
    for (const { plan, label } of everyPlan()) {
      for (const id of layoutIds) {
        for (const c of classroomsOf(plan)) {
          for (const desk of deskLayout(plan, id, c.id)) {
            for (const point of [desk, seatOf(desk)]) {
              expect(point.x, `${label}/${id}/${c.id}: x=${point.x}`).toBeGreaterThan(c.x + 0.4);
              expect(point.x, `${label}/${id}/${c.id}: x=${point.x}`).toBeLessThan(c.x + c.w - 0.4);
              expect(point.z, `${label}/${id}/${c.id}: z=${point.z}`).toBeGreaterThan(c.z + 0.4);
              expect(point.z, `${label}/${id}/${c.id}: z=${point.z}`).toBeLessThan(c.z + c.d - 0.2);
            }
          }
        }
      }
    }
  });

  it('leaves the teacher a clear lane in front of every board', () => {
    for (const { plan, label } of everyPlan()) {
      for (const id of layoutIds) {
        for (const c of classroomsOf(plan)) {
          for (const desk of deskLayout(plan, id, c.id)) {
            expect(desk.z, `${label}/${id}/${c.id}: desk in the lane`).toBeGreaterThan(c.z + 2.0);
            expect(seatOf(desk).z, `${label}/${id}/${c.id}: student in the lane`).toBeGreaterThan(
              c.z + 2.2,
            );
          }
        }
      }
    }
  });

  it('never seats a student on top of another desk', () => {
    // The Clusters preset got this wrong once: four desks 0.7m apart with the
    // seats 0.78m out put every student inside the desk opposite them.
    for (const { plan, label } of everyPlan()) {
      for (const id of layoutIds) {
        for (const c of classroomsOf(plan)) {
          const desks = deskLayout(plan, id, c.id);
          for (const desk of desks) {
            const seat = seatOf(desk);
            for (const other of desks) {
              if (other === desk) continue;
              const gap = Math.hypot(seat.x - other.x, seat.z - other.z);
              expect(
                gap,
                `${label}/${id}/${c.id}: student ${gap.toFixed(2)}m from a desk`,
              ).toBeGreaterThan(0.55);
            }
          }
        }
      }
    }
  });
});

describe('the cast', () => {
  it('seats the player plus every student the stage promises', () => {
    for (const { plan, stage, label } of everyPlan()) {
      const cast = peoplePlan(plan, DEFAULT_LAYOUT_ID);
      expect(cast.playerSeat, `${label} has nowhere for the player to sit`).not.toBeNull();
      expect(cast.students.length).toBeGreaterThanOrEqual(stage.students);
      expect(cast.wanderers.length).toBe(stage.wanderers);
      expect(cast.teachers.length).toBeLessThanOrEqual(stage.teachers);
    }
  });

  it('gives every walker a path it can actually loop', () => {
    for (const { plan, label } of everyPlan()) {
      const cast = peoplePlan(plan, DEFAULT_LAYOUT_ID);
      for (const walker of [...cast.teachers, ...cast.wanderers]) {
        expect(walker.path.length, `${label}/${walker.key} cannot move`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('never seats two people in the same chair', () => {
    for (const { plan, label } of everyPlan()) {
      const cast = peoplePlan(plan, DEFAULT_LAYOUT_ID);
      const seats = [
        ...(cast.playerSeat ? [cast.playerSeat] : []),
        ...cast.students.map((s) => s.spot),
      ];
      for (let i = 0; i < seats.length; i++) {
        for (let j = i + 1; j < seats.length; j++) {
          const gap = Math.hypot(seats[i].x - seats[j].x, seats[i].z - seats[j].z);
          expect(gap, `${label}: two people ${gap.toFixed(2)}m apart`).toBeGreaterThan(0.5);
        }
      }
    }
  });
});

describe('commuters', () => {
  it('gives every stage the commuters it promises, once a corridor exists', () => {
    for (const { plan, stage, label } of everyPlan()) {
      const cast = peoplePlan(plan, DEFAULT_LAYOUT_ID);
      const hasCorridor = plan.rooms.some((r) => r.id === 'corridor');
      expect(cast.commuters.length, label).toBe(hasCorridor ? stage.commuters : 0);
    }
  });

  it('never routes two commuters to the same chair', () => {
    for (const { plan, label } of everyPlan()) {
      const seats = peoplePlan(plan, DEFAULT_LAYOUT_ID).commuters.flatMap((c) => c.seats);
      for (let i = 0; i < seats.length; i++) {
        for (let j = i + 1; j < seats.length; j++) {
          const gap = Math.hypot(seats[i].x - seats[j].x, seats[i].z - seats[j].z);
          expect(gap, `${label}: two commuters share a seat`).toBeGreaterThan(0.5);
        }
      }
    }
  });

  it('gives every commuter a walkable route with no teleports', () => {
    for (const { plan, label } of everyPlan()) {
      for (const c of peoplePlan(plan, DEFAULT_LAYOUT_ID).commuters) {
        const full = [c.seats[0], ...c.path, c.seats[1]];
        expect(full.length, `${label}/${c.key} has no route`).toBeGreaterThan(2);
        for (let i = 0; i < full.length - 1; i++) {
          const step = Math.hypot(full[i].x - full[i + 1].x, full[i].z - full[i + 1].z);
          // A leg longer than the campus is a routing bug, not a long walk.
          expect(step, `${label}/${c.key} leg ${i} is ${step.toFixed(1)}m`).toBeLessThan(50);
        }
      }
    }
  });

  it('sits commuters clear of the people already in the room', () => {
    for (const { plan, label } of everyPlan()) {
      const cast = peoplePlan(plan, DEFAULT_LAYOUT_ID);
      const resident = cast.students.map((x) => x.spot);
      for (const c of cast.commuters) {
        for (const seat of c.seats) {
          for (const r of resident) {
            const gap = Math.hypot(seat.x - r.x, seat.z - r.z);
            expect(
              gap,
              `${label}/${c.key} sits ${gap.toFixed(2)}m from a resident`,
            ).toBeGreaterThan(0.5);
          }
        }
      }
    }
  });
});


describe('nobody walks through anything', () => {
  /** Does segment a->b cross axis-aligned box? Slab method, with the segment
   *  parameterised on [0,1]. */
  const hitsBox = (
    a: { x: number; z: number },
    b: { x: number; z: number },
    box: { x0: number; x1: number; z0: number; z1: number },
  ) => {
    // Shrink the box slightly: a route legitimately ENDS at a seat tucked
    // against its own desk, and touching an edge is not passing through it.
    const pad = 0.06;
    const x0 = box.x0 + pad;
    const x1 = box.x1 - pad;
    const z0 = box.z0 + pad;
    const z1 = box.z1 - pad;
    if (x1 <= x0 || z1 <= z0) return false;

    let lo = 0;
    let hi = 1;
    for (const [p0, p1, min, max] of [
      [a.x, b.x, x0, x1],
      [a.z, b.z, z0, z1],
    ] as const) {
      const d = p1 - p0;
      if (Math.abs(d) < 1e-9) {
        if (p0 <= min || p0 >= max) return false;
      } else {
        let t0 = (min - p0) / d;
        let t1 = (max - p0) / d;
        if (t0 > t1) [t0, t1] = [t1, t0];
        lo = Math.max(lo, t0);
        hi = Math.min(hi, t1);
        if (lo >= hi) return false;
      }
    }
    return hi > lo;
  };

  it('never routes a person through a piece of furniture', () => {
    // The counterpart to the wall test, and the same reasoning: nobody steers
    // at runtime, every actor follows an authored polyline exactly, so checking
    // those polylines against every solid footprint is a complete guarantee
    // rather than a sample. This is what caught people walking through the
    // cafeteria servery and the gym's wall bars.
    for (const { plan, label } of everyPlan()) {
      const solids = blockers(plan);
      const cast = peoplePlan(plan, DEFAULT_LAYOUT_ID);

      const routes: { key: string; pts: { x: number; z: number }[] }[] = [
        ...cast.commuters.map((c) => ({ key: c.key, pts: [c.seats[0], ...c.path, c.seats[1]] })),
        ...cast.wanderers.map((w) => ({ key: w.key, pts: [...w.path, w.path[0]] })),
        ...cast.teachers.map((t) => ({ key: t.key, pts: [...t.path, t.path[0]] })),
      ];

      for (const route of routes) {
        for (let i = 0; i < route.pts.length - 1; i++) {
          for (const box of solids) {
            expect(
              hitsBox(route.pts[i], route.pts[i + 1], box),
              `${label}/${route.key} leg ${i} passes through ${box.key}`,
            ).toBe(false);
          }
        }
      }
    }
  });

  it('leaves every doorway clear of furniture', () => {
    for (const { plan, label } of everyPlan()) {
      const zones = doorZones(plan);
      for (const prop of stageProps(plan)) {
        const box = footprintOf(prop);
        if (!box) continue;
        for (const zone of zones) {
          const clash =
            box.x0 < zone.x1 - 0.01 &&
            box.x1 > zone.x0 + 0.01 &&
            box.z0 < zone.z1 - 0.01 &&
            box.z1 > zone.z0 + 0.01;
          expect(clash, `${label}: ${prop.key} stands in ${zone.key}`).toBe(false);
        }
      }
    }
  });

  it('still keeps the prop that makes each room that room', () => {
    // clearDoorways drops anything blocking a door, so it could in principle
    // eat the servery or the wall bars and leave an empty room that passes
    // every other test. These are the props whose absence would be a bug.
    const signature: [string, string][] = [
      ['cafeteria', 'cafeCounter'],
      ['gym', 'wallBars'],
      ['lobby', 'receptionDesk'],
      ['hall', 'stagePlatform'],
      ['library', 'bookshelf'],
      ['lab', 'booth'],
    ];
    for (const { plan, label } of everyPlan()) {
      const props = stageProps(plan);
      for (const [roomId, type] of signature) {
        if (!plan.rooms.some((r) => r.id === roomId)) continue;
        expect(
          props.some((x) => x.key.startsWith(`${roomId}-`) && x.type === type),
          `${label}: the ${roomId} lost its ${type}`,
        ).toBe(true);
      }
    }
  });
});

describe('props', () => {
  it('gives every classroom a board and every stage unique prop keys', () => {
    for (const { plan, label } of everyPlan()) {
      const props = stageProps(plan);
      const boards = props.filter((x) => x.type === 'board');
      expect(boards.length, `${label} board count`).toBe(classroomsOf(plan).length);
      const keys = props.map((x) => x.key);
      expect(new Set(keys).size, `${label} has duplicate prop keys`).toBe(keys.length);
    }
  });

  it('puts at least one window in the first classroom', () => {
    // The window loop skips whatever the board covers; on the narrow stage-0
    // wall that silently swallowed every window position once already.
    for (const variantId of variantIds) {
      const props = stageProps(buildPlan(SCHOOL_STAGES[0], variantId));
      expect(props.filter((x) => x.type === 'window').length, variantId).toBeGreaterThan(0);
    }
  });

  it('keeps every prop inside the room that generated it', () => {
    // Deliberately not "inside SOME room": a hall chair row that overshot into
    // the corridor behind it passed that weaker check while looking obviously
    // wrong on screen. Prop keys are prefixed with their room id, so each one
    // can be held to its own four walls.
    for (const { plan, rooms, label } of everyPlan()) {
      const byId = new Map(rooms.map((r) => [r.id, r]));
      for (const prop of stageProps(plan)) {
        const owner = byId.get(prop.key.split('-')[0]);
        expect(owner, `${label}: ${prop.key} has no owning room`).toBeDefined();
        if (!owner) continue;
        expect(prop.x, `${label}: ${prop.key} west of its room`).toBeGreaterThanOrEqual(owner.x - 0.35);
        expect(prop.x, `${label}: ${prop.key} east of its room`).toBeLessThanOrEqual(owner.x + owner.w + 0.35);
        expect(prop.z, `${label}: ${prop.key} north of its room`).toBeGreaterThanOrEqual(owner.z - 0.35);
        expect(prop.z, `${label}: ${prop.key} south of its room`).toBeLessThanOrEqual(owner.z + owner.d + 0.35);
      }
    }
  });
});

describe('getStage is total', () => {
  it('falls back to stage 0 rather than undefined', () => {
    // A payload from a backend that predates the `stage` field used to index
    // past the array and crash the page on the first property access.
    for (const bad of [undefined, null, NaN, -1, 99, 'x']) {
      expect(getStage(bad as unknown as number), `getStage(${String(bad)})`).toBeDefined();
    }
    expect(getStage(NaN).index).toBe(0);
    expect(getStage(99).index).toBe(MAX_STAGE);
    expect(getStage(2.7).index).toBe(2);
  });
});
