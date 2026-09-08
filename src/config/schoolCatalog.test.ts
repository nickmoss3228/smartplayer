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
  LEGACY_STAGE_ROOMS,
  LEVEL_AT_ROOMS,
  MAX_STAGE,
  PAYROLL_MAX_WEEKS,
  PAYROLL_WEEK_MS,
  moraleFor,
  payrollDue,
  weeklyWage,
  weeksOwed,
  ROOM_LABELS,
  SchoolRoomRect,
  buyBlocker,
  canBuy,
  getStage,
  getVariant,
  levelFor,
  parentOf,
  roomsOwned,
  starterRoomIds,
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
  LEGACY_STAGE_ROOMS as SERVER_LEGACY_STAGE_ROOMS,
  STARTER_STAGE as SERVER_STARTER_STAGE,
  levelFor as serverLevelFor,
  moraleFor as serverMoraleFor,
  payrollDue as serverPayrollDue,
  weeklyWage as serverWeeklyWage,
  PAYROLL_MAX_WEEKS as SERVER_PAYROLL_MAX_WEEKS,
  roomsOwned as serverRoomsOwned,
  starterRoomIds as serverStarterRoomIds,
  variantForUserId,
} from '../../backend/src/config/schoolCatalog.js';

import {
  blockers,
  boardFrameOf,
  buildPlan,
  classroomsOf,
  commuterSeating,
  deskLayout,
  doorZones,
  footprintOf,
  freeWallRuns,
  peoplePlan,
  seatOf,
  seatSurfaces,
  stageProps,
  WALK_SPEED,
  wallOpenings,
  walkerAt,
} from '../modules/school/props';

/**
 * src/config/schoolCatalog.ts is a hand-maintained mirror of the backend
 * catalog, and the build sheet quotes its prices before the server charges the
 * real ones. Drift is silent and user-facing: the sheet promises 320 BitAward,
 * the server takes 550, and nothing throws anywhere a developer would see it.
 * Same contract the character/shop mirrors are held to in catalogMirror.test.ts.
 *
 * Everything below sweeps ALL THREE campus variants over a SPREAD OF OWNED
 * SETS, because a floorplan bug in the variant nobody has looked at is exactly
 * the kind that reaches a player.
 */

const layoutIds = SCHOOL_LAYOUTS.map((l) => l.id);
const variantIds = SCHOOL_VARIANTS.map((v) => v.id);
const roomIdsOf = (variantId: string) => getVariant(variantId).rooms.map((r) => r.id);

/**
 * Buy rooms one at a time, in the order a given chooser picks them, and yield
 * the owned set after every purchase. Only ever picks a room `canBuy` allows,
 * so every set it yields is one a real player could actually be holding.
 */
function purchaseRun(
  variantId: string,
  choose: (options: string[]) => string,
): string[][] {
  const owned = starterRoomIds(variantId);
  const runs: string[][] = [[...owned]];
  const left = roomIdsOf(variantId).filter((id) => !owned.includes(id));
  while (left.length) {
    const options = left.filter((id) => canBuy(variantId, owned, id));
    if (!options.length) throw new Error(`${variantId}: stranded with ${left.join(', ')} unreachable`);
    const picked = choose(options);
    owned.push(picked);
    left.splice(left.indexOf(picked), 1);
    runs.push([...owned]);
  }
  return runs;
}

/** Deterministic, so a failure reproduces from the label alone. */
const lcg = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;

/**
 * The owned sets every invariant below is checked against.
 *
 * Rooms used to be a pure function of one integer, so thirty plans — three
 * variants at ten stages — was the WHOLE space and the sweep was exhaustive.
 * Buying rooms one at a time makes the space 2^12 per variant, so this samples
 * it instead, and the sampling is chosen to cover the shapes that actually
 * break things:
 *
 *   • the CHAIN, buying in catalog order, which is the run almost every real
 *     player is somewhere along;
 *   • four SCRAMBLED runs per variant, which reach the lopsided campuses the
 *     chain never does — a gym and no library, a cafeteria wing with nothing
 *     east of the corridor — and which are where a room that quietly depended
 *     on a neighbour existing shows up;
 *   • the FULL set, the only one with every room in it at once.
 *
 * Both run kinds only ever buy what canBuy allows, so nothing here checks a
 * campus a player could not be holding. Roughly 100 plans against 30 before.
 */
const everyPlan = () =>
  variantIds.flatMap((variantId) => {
    const runs: { owned: string[]; how: string }[] = [];
    purchaseRun(variantId, (o) => o[0]).forEach((owned, i) =>
      runs.push({ owned, how: `chain-${String(i).padStart(2, '0')}` }),
    );
    for (let seed = 1; seed <= 4; seed++) {
      const rnd = lcg(seed * 7919);
      const run = purchaseRun(variantId, (o) => o[Math.floor(rnd() * o.length)]);
      // Only the tail of a scrambled run is interesting: its short prefixes are
      // the same handful of sets the chain already covers.
      run.slice(Math.floor(run.length / 2)).forEach((owned, i) =>
        runs.push({ owned, how: `mix${seed}-${i}` }),
      );
    }
    return runs.map(({ owned, how }) => ({
      variantId,
      owned,
      stage: getStage(levelFor(owned)),
      label: `${variantId}/${how} [${owned.join(' ')}]`,
      rooms: roomsOwned(variantId, owned),
      plan: buildPlan(owned, variantId),
    }));
  });

type AnyStage = {
  index: number;
  id: string;
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
  it('has the same levels, in the same order, with the same populations', () => {
    expect(economics(SCHOOL_STAGES)).toEqual(economics(SERVER_STAGES));
  });

  it('charges what it says it charges', () => {
    // The one that actually costs a player money if it drifts: the sheet quotes
    // this mirror, the server debits its own copy.
    const prices = (vs: readonly { id: string; rooms: readonly { id: string; currency: string; price: number }[] }[]) =>
      vs.map((v) => v.rooms.map((r) => [v.id, r.id, r.currency, r.price]));
    expect(prices(SCHOOL_VARIANTS)).toEqual(prices(SERVER_VARIANTS));
  });

  it('starts a new player with the same rooms', () => {
    for (const variantId of variantIds) {
      expect(starterRoomIds(variantId), variantId).toEqual(serverStarterRoomIds(variantId));
    }
  });

  it('agrees on what each old stage is worth in rooms', () => {
    expect(LEGACY_STAGE_ROOMS).toEqual(SERVER_LEGACY_STAGE_ROOMS);
  });

  it('derives the same level from the same rooms', () => {
    for (const variantId of variantIds) {
      for (const { owned } of everyPlan().filter((p) => p.variantId === variantId)) {
        for (const floor of [0, 4, 9]) {
          expect(levelFor(owned, floor), `${variantId} ${owned.length} rooms floor ${floor}`)
            .toBe(serverLevelFor(owned, floor));
        }
      }
    }
  });

  it('offers the same campus variants', () => {
    expect(variantIds).toEqual(SERVER_VARIANTS.map((v: { id: string }) => v.id));
  });

  it('lays out every variant and owned set on the same floorplan', () => {
    // The client draws the building from these rectangles; the server stores
    // only a room list and a variant id. They still have to agree, or a visitor
    // and the owner see different schools. Growth in particular is easy to get
    // subtly wrong on one side: the corridor's extent depends on which of its
    // children have been bought.
    for (const { variantId, owned, label } of everyPlan()) {
      expect(shape(roomsOwned(variantId, owned)), label).toEqual(
        shape(serverRoomsOwned(variantId, owned)),
      );
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

describe('room economy', () => {
  it('prices everything in non-negative whole coins, in one currency', () => {
    const currencies = ['bitAward', 'bitWord', 'bitPhrase'];
    for (const variant of SCHOOL_VARIANTS) {
      for (const spec of variant.rooms) {
        const where = `${variant.id}/${spec.id}`;
        expect(currencies, `${where} has an unknown currency`).toContain(spec.currency);
        expect(Number.isInteger(spec.price), `${where} has a fractional price`).toBe(true);
        expect(spec.price, `${where} has a negative price`).toBeGreaterThanOrEqual(0);
        // Only a starter room may be free. A purchasable room at zero would sit
        // in the sheet forever looking like a bug.
        if (!spec.starter) expect(spec.price, `${where} is free`).toBeGreaterThan(0);
      }
    }
  });

  it('gives every player exactly one room to begin with', () => {
    for (const variantId of variantIds) {
      const starters = starterRoomIds(variantId);
      expect(starters, variantId).toHaveLength(1);
      expect(getVariant(variantId).rooms[0].id, `${variantId} starter is not first`).toBe(starters[0]);
    }
  });

  it('spends all three currencies on every campus', () => {
    // The whole point of per-room pricing. A variant that only ever charged
    // BitAward would compile, pass everything else, and quietly make two
    // currencies pointless.
    for (const variant of SCHOOL_VARIANTS) {
      const used = new Set(variant.rooms.filter((r) => !r.starter).map((r) => r.currency));
      expect([...used].sort(), variant.id).toEqual(['bitAward', 'bitPhrase', 'bitWord']);
    }
  });

  it('names every room it offers to sell', () => {
    for (const variant of SCHOOL_VARIANTS) {
      for (const spec of variant.rooms) {
        expect(ROOM_LABELS[spec.id]?.name, `${variant.id}/${spec.id} has no label`).toBeTruthy();
      }
    }
  });

  it('indexes levels densely from zero', () => {
    expect(SCHOOL_STAGES.map((s) => s.index)).toEqual(SCHOOL_STAGES.map((_, i) => i));
    expect(MAX_STAGE).toBe(SCHOOL_STAGES.length - 1);
  });

  it('leaves the player a desk of their own', () => {
    // peoplePlan seats the player at one desk and NPCs at the rest, so a level
    // with students >= desks would seat somebody on top of the player.
    for (const stage of SCHOOL_STAGES) {
      expect(stage.students, `${stage.id}`).toBeLessThan(stage.desks);
      expect(stage.secondaryStudents, `${stage.id}`).toBeLessThanOrEqual(stage.secondaryDesks);
    }
  });

  it('never shrinks a campus', () => {
    // Growth is a bounding-box union, so this holds by construction — which is
    // exactly why it is worth asserting: the union is the reason, and a future
    // edit that replaces it with "last match wins" would silently break it.
    for (const variantId of variantIds) {
      const runs = purchaseRun(variantId, (o) => o[0]);
      for (let i = 1; i < runs.length; i++) {
        const before = roomsOwned(variantId, runs[i - 1]);
        const after = roomsOwned(variantId, runs[i]);
        for (const b of before) {
          const a = after.find((r) => r.id === b.id);
          expect(a, `${variantId} lost the ${b.id} after ${runs[i].length} rooms`).toBeDefined();
          expect(a!.x, `${variantId}/${b.id} moved east`).toBeLessThanOrEqual(b.x);
          expect(a!.z, `${variantId}/${b.id} moved south`).toBeLessThanOrEqual(b.z);
          expect(a!.x + a!.w, `${variantId}/${b.id} lost its east edge`).toBeGreaterThanOrEqual(b.x + b.w);
          expect(a!.z + a!.d, `${variantId}/${b.id} lost its south edge`).toBeGreaterThanOrEqual(b.z + b.d);
        }
      }
    }
  });

  it('gets every variant to five classrooms by the end', () => {
    for (const variantId of variantIds) {
      const classrooms = roomsOwned(variantId, roomIdsOf(variantId)).filter(
        (r) => r.kind === 'classroom',
      );
      expect(classrooms.length, variantId).toBe(5);
    }
  });

  it('builds the same set of room kinds on every campus', () => {
    // Variants differ in SHAPE, never in what you can buy. A room that existed
    // on one campus and not another would be a different game depending on a
    // hash of your user id.
    const kinds = (variantId: string) =>
      getVariant(variantId).rooms.map((r) => `${r.id}:${r.kind}`).sort();
    for (const variantId of variantIds) {
      expect(kinds(variantId), variantId).toEqual(kinds(variantIds[0]));
    }
  });
});

describe('what a player can buy', () => {
  it('lets every room be reached from the starter set', () => {
    // purchaseRun throws if it strands anything, so this is really "there is a
    // legal order that gets you the whole campus" — the thing that stops a room
    // being priced, drawn, and permanently unreachable.
    for (const variantId of variantIds) {
      const runs = purchaseRun(variantId, (o) => o[0]);
      expect(runs[runs.length - 1].sort(), variantId).toEqual([...roomIdsOf(variantId)].sort());
    }
  });

  it('roots every door tree at the corridor with no cycles', () => {
    for (const variantId of variantIds) {
      for (const id of roomIdsOf(variantId)) {
        const seen = new Set<string>([id]);
        let at: string | null = id;
        while (at) {
          const up: string | null = parentOf(variantId, at);
          if (up === null) break;
          expect(seen.has(up), `${variantId}: ${id} loops back through ${up}`).toBe(false);
          seen.add(up);
          at = up;
        }
        // Whatever the chain ends on must be a room with no parent, and the
        // corridor is the only one of those.
        expect(at, `${variantId}/${id} does not lead to the corridor`).toBe('corridor');
      }
    }
  });

  it('refuses a room whose way in has not been built', () => {
    for (const variantId of variantIds) {
      const starters = starterRoomIds(variantId);
      for (const id of roomIdsOf(variantId)) {
        const parent = parentOf(variantId, id);
        if (!parent || starters.includes(parent) || starters.includes(id)) continue;
        expect(buyBlocker(variantId, starters, id), `${variantId}/${id}`).toBe('locked');
      }
    }
  });

  it('refuses a room you already own, and one that does not exist', () => {
    for (const variantId of variantIds) {
      expect(buyBlocker(variantId, starterRoomIds(variantId), starterRoomIds(variantId)[0])).toBe('owned');
      expect(buyBlocker(variantId, starterRoomIds(variantId), 'swimming-pool')).toBe('unknown');
    }
  });

  it('never lowers a migrated player onto a level below the one they paid for', () => {
    // The level floor exists for exactly this. Without it a player at old stage
    // 6 lands on a level whose wallpaper list no longer contains the wallpaper
    // they had already chosen, and setSchoolLook starts refusing their own save.
    LEGACY_STAGE_ROOMS.forEach((rooms, stage) => {
      expect(levelFor(rooms, stage), `old stage ${stage}`).toBeGreaterThanOrEqual(stage);
    });
  });

  it('derives a level that only ever goes up', () => {
    expect(LEVEL_AT_ROOMS).toHaveLength(MAX_STAGE + 1);
    for (let i = 1; i < LEVEL_AT_ROOMS.length; i++) {
      expect(LEVEL_AT_ROOMS[i], `level ${i} needs no more rooms than ${i - 1}`)
        .toBeGreaterThan(LEVEL_AT_ROOMS[i - 1]);
    }
    for (const variantId of variantIds) {
      let last = -1;
      for (const owned of purchaseRun(variantId, (o) => o[0])) {
        const level = levelFor(owned);
        expect(level, `${variantId} at ${owned.length} rooms`).toBeGreaterThanOrEqual(last);
        last = level;
      }
    }
  });

  it('is total, whatever it is handed', () => {
    for (const junk of [[], ['nope'], undefined as unknown as string[]]) {
      const level = levelFor(junk);
      expect(Number.isInteger(level)).toBe(true);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(MAX_STAGE);
    }
    expect(levelFor([], NaN)).toBe(0);
    expect(levelFor([], 99)).toBe(MAX_STAGE);
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

  it('gives every classroom a wall its board can hang on', () => {
    // Building.tsx drops a wall span to knee height wherever two rooms meet, so
    // the room behind stays visible. A board hangs at 1.0-2.35m, so a board on a
    // partition floats — and the cutaway only ever draws the north and west
    // walls, so those are the only two a board can go on at all.
    //
    // This replaced a flat "never build anything north of a classroom". That
    // rule was true while the board was nailed to the north wall regardless;
    // it is the wrong rule now that `boardFrameOf` will take the west wall
    // instead, and keeping it would have pinned every new classroom to the
    // campus edge for no reason.
    for (const { plan, rooms, label } of everyPlan()) {
      for (const c of rooms.filter((r) => r.kind === 'classroom')) {
        expect(boardFrameOf(plan, c), `${label}: ${c.id} has no wall to hang a board on`).not.toBeNull();
      }
    }
  });

  it('faces every desk at the board, on whichever wall it is', () => {
    for (const { plan, rooms, label } of everyPlan()) {
      for (const c of rooms.filter((r) => r.kind === 'classroom')) {
        const frame = boardFrameOf(plan, c);
        if (!frame) continue;
        for (const layoutId of layoutIds) {
          for (const desk of deskLayout(plan, layoutId, c.id)) {
            // A student sits behind their desk and faces back into it, so the
            // desk's own facing is what points at the board. Whichever wall the
            // board took, every desk must be on the room side of it.
            const seat = seatOf(desk);
            const depth = frame.side === 'north' ? seat.z - c.z : seat.x - c.x;
            expect(
              depth,
              `${label}/${c.id}/${layoutId}: a seat sits behind the ${frame.side} board wall`,
            ).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('lays a classroom out against its west wall when the north one is taken', () => {
    // The point of the whole frame refactor, and nothing in the shipped catalog
    // exercises it yet — every current classroom has a free north wall, which is
    // exactly why the refactor could land without moving a single desk. So the
    // case is built here: wall the classroom in from the north and check it
    // turns to face west rather than giving up.
    for (const variantId of variantIds) {
      const owned = starterRoomIds(variantId);
      const plan = buildPlan(owned, variantId);
      const c = plan.rooms.find((r) => r.kind === 'classroom')!;
      expect(boardFrameOf(plan, c)!.side, `${variantId} should start facing north`).toBe('north');

      // A room pressed against the classroom's entire north wall.
      const blocked = {
        ...plan,
        rooms: [...plan.rooms, { id: 'blocker', kind: 'hall' as const, x: c.x, z: c.z - 6, w: c.w, d: 6 }],
      };
      const frame = boardFrameOf(blocked, c);
      expect(frame?.side, `${variantId}: a blocked classroom did not turn to its west wall`).toBe('west');

      const desks = deskLayout(blocked, 'rows', c.id);
      expect(desks.length, `${variantId}: a west-facing classroom lost its desks`).toBeGreaterThan(0);
      for (const desk of desks) {
        const seat = seatOf(desk);
        expect(seat.x, `${variantId}: a west-facing desk left the room`).toBeGreaterThan(c.x);
        expect(seat.x).toBeLessThan(c.x + c.w);
        expect(seat.z).toBeGreaterThan(c.z);
        expect(seat.z).toBeLessThan(c.z + c.d);
      }
      // And the board itself moved onto that wall rather than staying north.
      const board = stageProps(blocked).find((p) => p.key === `${c.id}-board`);
      expect(board, `${variantId}: a west-facing classroom lost its board`).toBeDefined();
      expect(Math.abs(board!.x - c.x), `${variantId}: the board did not move to the west wall`).toBeLessThan(0.5);
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
      const byId = new Map(
        roomsOwned(variantId, roomIdsOf(variantId)).map((r) => [r.id, r] as const),
      );

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
      const byId = new Map(
        roomsOwned(variantId, roomIdsOf(variantId)).map((r) => [r.id, r] as const),
      );
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
        // Outdoor rooms are in here too now: the yard and the forecourt are
        // walled, so walking out of one anywhere but a gateway is as wrong as
        // walking out through a classroom wall.
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

  it('cuts every classroom doorway into whichever wall is drawn across it', () => {
    // Deliberately not "the classroom has an opening of its own": only north
    // and west walls are drawn, so when the corridor is SOUTH of a classroom
    // the gap belongs to the corridor's north wall, not the classroom's. What
    // has to be true is that the wall standing across the doorway — whichever
    // room draws it — has a hole in it.
    for (const { plan, rooms, label } of everyPlan()) {
      const openings = wallOpenings(plan);
      const byId = new Map(rooms.map((r) => [r.id, r]));

      for (const c of classroomsOf(plan)) {
        const door = plan.doors[c.id];
        const parent = door?.parent ? byId.get(door.parent) : undefined;

        if (door && parent) {
          const cut = [c, parent].some((r) => {
            const holes = openings[r.id];
            if (!holes) return false;
            if (Math.abs(door.z - r.z) < 0.01) {
              return holes.north.some((h) => Math.abs(h.at - door.x) < 0.01);
            }
            if (Math.abs(door.x - r.x) < 0.01) {
              return holes.west.some((h) => Math.abs(h.at - door.z) < 0.01);
            }
            return false;
          });
          expect(cut, `${label}/${c.id}: its doorway has no gap in the wall`).toBe(true);
          continue;
        }

        // Before the corridor is built the classroom IS the school, and its
        // catalog doorway leads to a room that does not exist yet. It still
        // has to have a visible way in — the door onto whatever is west of it.
        const own = openings[c.id];
        expect(
          (own?.north.length ?? 0) + (own?.west.length ?? 0),
          `${label}/${c.id} has no way in at all`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe('roaming students keep out of each other', () => {
  it('never lets two of them stand in the same place', () => {
    // The reported bug, exactly: several people walk into a room, stop, and
    // end up standing inside one another, because nothing keeps them apart.
    //
    // The fix is not collision, it is arithmetic. Everybody roams the SAME
    // loop at the SAME speed and holds for the SAME time at the SAME stops,
    // and they are spread around it by DISTANCE rather than by waypoint index.
    // Their separation is therefore a constant of the loop, and `walkerAt` is
    // a pure function of the clock, so half an hour of school can be sampled
    // here rather than argued about.
    //
    // Two of them may still cross paths mid-corridor for a moment, which is
    // what people do; standing merged together is what they must never do.
    for (const { plan, label } of everyPlan()) {
      const wanderers = peoplePlan(plan, DEFAULT_LAYOUT_ID).wanderers;
      if (wanderers.length < 2) continue;

      let worst = Infinity;
      let when = 0;
      // Sampled every 1.3s: deliberately not a whole number of seconds, so the
      // sampling cannot land on the same phase of a loop again and again and
      // miss the moment two people meet.
      for (let t = 0; t < 1800; t += 1.3) {
        const at = wanderers.map((w) => walkerAt(w.path, t));
        for (let i = 0; i < at.length; i++) {
          for (let j = i + 1; j < at.length; j++) {
            if (at[i].walking && at[j].walking) continue;
            const gap = Math.hypot(at[i].x - at[j].x, at[i].z - at[j].z);
            if (gap < worst) {
              worst = gap;
              when = t;
            }
          }
        }
      }
      // A person is about 0.45m across. Two of them 0.7m apart read as two
      // people passing; any closer and they are one smudge.
      expect(worst, `${label}: two wanderers ${worst.toFixed(2)}m apart at t=${when}s`)
        .toBeGreaterThan(0.7);
    }
  }, 60_000);

  it('spaces them further apart in time than either of them ever stands still', () => {
    // Why the test above passes, stated directly rather than sampled. Two
    // wanderers reach any given stop this many seconds apart; as long as that
    // is longer than the stop itself, the first has always left before the
    // second arrives — no matter how long the page stays open.
    for (const { plan, label } of everyPlan()) {
      const wanderers = peoplePlan(plan, DEFAULT_LAYOUT_ID).wanderers;
      if (wanderers.length < 2) continue;

      const path = wanderers[0].path;
      let span = 0;
      let longestHold = 0;
      for (let i = 0; i < path.length; i++) {
        const a = path[i];
        const b = path[(i + 1) % path.length];
        span += Math.hypot(b.x - a.x, b.z - a.z);
        longestHold = Math.max(longestHold, b.hold ?? 0);
      }

      const apart = span / wanderers.length / WALK_SPEED;
      expect(
        apart,
        `${label}: wanderers arrive ${apart.toFixed(1)}s apart but stand still for ` +
          `up to ${longestHold.toFixed(1)}s`,
      ).toBeGreaterThan(longestHold + 1);
    }
  });

  it('walks every loop at a steady pace with no teleports', () => {
    // `spaceOut` splits the loop mid-leg to start each person in a different
    // place. A seam stitched back together wrongly would show up as somebody
    // jumping across the campus once a lap.
    //
    // Every FOURTH plan, unlike its neighbours here. What this checks is a
    // property of spaceOut and walkerAt — that a loop resumes where it was cut —
    // and a loop is a loop; sampling four hundred seconds of walking for two
    // people on each of a hundred and sixty campuses spent half a minute
    // re-proving the same arithmetic, and ran within a second of its own
    // timeout. The spacing test above is the one that genuinely needs every
    // campus, and it still gets them.
    for (const { plan, label } of everyPlan().filter((_, i) => i % 4 === 0)) {
      for (const w of peoplePlan(plan, DEFAULT_LAYOUT_ID).wanderers.slice(0, 2)) {
        let prev = walkerAt(w.path, 0);
        for (let t = 0.2; t < 400; t += 0.2) {
          const now = walkerAt(w.path, t);
          const moved = Math.hypot(now.x - prev.x, now.z - prev.z);
          // 0.2s at 1.15 m/s is 0.23m; anything much over that is a jump.
          expect(moved, `${label}/${w.key} jumped ${moved.toFixed(2)}m at t=${t.toFixed(1)}s`)
            .toBeLessThan(0.35);
          prev = now;
        }
      }
    }
  }, 60_000);
});

describe('nothing hangs in mid-air', () => {
  // A clock, a poster, a scoreboard and a window are all nailed to a wall, and
  // half the walls in this building are either a 0.95m partition (because
  // there is a room behind them) or an open doorway. Hang something on one of
  // those and it floats — which is exactly what reception's clock, the
  // corridor's poster and the gym's scoreboard were doing.
  const WALL_MOUNTED = new Set(['clock', 'window', 'poster', 'board', 'banner', 'noticeboard', 'scoreboard', 'alphabet']);

  it('mounts every wall prop on a wall that is actually drawn there', () => {
    for (const { plan, rooms, label } of everyPlan()) {
      const byId = new Map(rooms.map((r) => [r.id, r]));
      for (const prop of stageProps(plan)) {
        if (!WALL_MOUNTED.has(prop.type)) continue;
        const owner = byId.get(prop.key.split('-')[0]);
        if (!owner) continue;

        // North wall props sit at the room's z with ry 0; west wall props at
        // its x, turned a quarter turn.
        const onNorth = Math.abs(prop.z - owner.z) < 0.4;
        const side = onNorth ? 'north' : 'west';
        const at = onNorth ? prop.x : prop.z;
        const len = prop.len ?? 0.9;
        const runs = freeWallRuns(plan, owner, side);

        expect(
          runs.some(([s, e]) => at > s - 0.05 && at < e + 0.05),
          `${label}: ${prop.key} hangs on the ${side} wall at ${at.toFixed(2)}, ` +
            `where the drawn wall runs are [${runs.map(([s, e]) => `${s.toFixed(1)}-${e.toFixed(1)}`).join(', ')}]`,
        ).toBe(true);
        // And it has to FIT: half of it poking past the end of the wall is the
        // same bug with a smaller radius.
        expect(
          runs.some(([s, e]) => at - len / 2 > s - 0.35 && at + len / 2 < e + 0.35),
          `${label}: ${prop.key} is ${len}m wide and overhangs its wall`,
        ).toBe(true);
      }
    }
  });

  it('never puts a window on an interior wall', () => {
    // A window looking into the corridor is not a window. `freeWallRuns` only
    // returns stretches with nothing at all behind them, so passing the test
    // above already proves this — but this is the version of it that says what
    // the player noticed.
    for (const { plan, rooms, label } of everyPlan()) {
      const byId = new Map(rooms.map((r) => [r.id, r]));
      for (const prop of stageProps(plan).filter((p) => p.type === 'window')) {
        const owner = byId.get(prop.key.split('-')[0]);
        if (!owner) continue;
        const onNorth = Math.abs(prop.z - owner.z) < 0.4;
        for (const other of rooms) {
          if (other.id === owner.id) continue;
          const behind = onNorth
            ? Math.abs(other.z + other.d - owner.z) < 0.01 &&
              prop.x > other.x + 0.01 &&
              prop.x < other.x + other.w - 0.01
            : Math.abs(other.x + other.w - owner.x) < 0.01 &&
              prop.z > other.z + 0.01 &&
              prop.z < other.z + other.d - 0.01;
          expect(behind, `${label}: ${prop.key} looks into the ${other.id}`).toBe(false);
        }
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
  }, 30_000);

  it('leaves the teacher a clear lane in front of every board', () => {
    // Measured along the frame's DEPTH axis, not along world z. A classroom
    // whose board hangs on the west wall has its lane running north-south, and
    // checking z there asks whether the desks clear a wall the board is not on.
    for (const { plan, label } of everyPlan()) {
      for (const id of layoutIds) {
        for (const c of classroomsOf(plan)) {
          const frame = boardFrameOf(plan, c);
          if (!frame) continue;
          const depth = (s: { x: number; z: number }) =>
            frame.side === 'north' ? s.z - c.z : s.x - c.x;
          for (const desk of deskLayout(plan, id, c.id)) {
            expect(depth(desk), `${label}/${id}/${c.id}: desk in the lane`).toBeGreaterThan(2.0);
            expect(
              depth(seatOf(desk)),
              `${label}/${id}/${c.id}: student in the lane`,
            ).toBeGreaterThan(2.2);
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
  }, 30_000);
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
  }, 30_000);
});

describe('commuters', () => {
  it('gives every level the commuters it promises, or every one it can seat', () => {
    // Rooms are bought in the player's own order, so a campus can hold seven
    // rooms and still have only two places worth walking to. Asserting the
    // level's number flat would demand people the school has nowhere to put;
    // asserting only "no more than promised" would let them silently vanish.
    // The ceiling is what commuterSeating can actually hand out, and the plan
    // has to reach it.
    for (const { plan, stage, label } of everyPlan()) {
      const cast = peoplePlan(plan, DEFAULT_LAYOUT_ID);
      const hasCorridor = plan.rooms.some((r) => r.id === 'corridor');
      const seatable = commuterSeating(plan, stage.commuters).length;
      expect(cast.commuters.length, label).toBe(hasCorridor ? seatable : 0);
      expect(cast.commuters.length, `${label} promises more than the level`)
        .toBeLessThanOrEqual(stage.commuters);
    }
  });

  it('fills a complete campus with every commuter its level promises', () => {
    // The ceiling above is only honest if it is not always binding. A finished
    // school has somewhere for all of them, and if it stops having that, the
    // level table and the seating have drifted apart.
    for (const variantId of variantIds) {
      const owned = roomIdsOf(variantId);
      const plan = buildPlan(owned, variantId);
      const stage = getStage(levelFor(owned));
      expect(peoplePlan(plan, DEFAULT_LAYOUT_ID).commuters.length, variantId)
        .toBe(stage.commuters);
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

  const inBox = (p: { x: number; z: number }, box: { x0: number; x1: number; z0: number; z1: number }) =>
    p.x > box.x0 && p.x < box.x1 && p.z > box.z0 && p.z < box.z1;

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
      const seats = new Set(cast.commuters.flatMap((c) => c.seats));

      // Collected rather than asserted leg by leg. This is the innermost loop
      // in the suite — every route, every leg, against every solid box on the
      // campus — and an expect() per combination costs several times what the
      // geometry does. Reporting them together is also simply better: a route
      // that clips three things now names all three instead of the first.
      const through: string[] = [];
      for (const route of routes) {
        for (let i = 0; i < route.pts.length - 1; i++) {
          const a = route.pts[i];
          const b = route.pts[i + 1];
          for (const box of solids) {
            if (!hitsBox(a, b, box)) continue;
            // Sitting down is not walking through. A commuter's route begins
            // and ends ON a chair, a bench or a sofa, so the leg that reaches
            // one is allowed inside that one piece of furniture — and nothing
            // else, which is what keeps this a real guarantee. (The `never
            // seats anybody on thin air` test below is the other half: the
            // seat has to be a seat.)
            if ((seats.has(a as never) || seats.has(b as never)) && (inBox(a, box) || inBox(b, box))) {
              continue;
            }
            through.push(`${label}/${route.key} leg ${i} passes through ${box.key}`);
          }
        }
      }
      expect(through, 'routes cross furniture').toEqual([]);
    }
  }, 60_000);

  it('never seats anybody on thin air', () => {
    // Every reported "the characters are floating" bug in one assertion: the
    // lab booths with no stools, the receptionist behind a desk with no chair,
    // visitors sitting on the library rug at chair height, and everyone parked
    // three quarters of a metre in front of the bench they were meant to be on.
    for (const { plan, label } of everyPlan()) {
      for (const layoutId of layoutIds) {
        const surfaces = seatSurfaces(plan, layoutId);
        const cast = peoplePlan(plan, layoutId);
        const sitters = [
          ...(cast.playerSeat ? [{ key: 'player', spot: cast.playerSeat }] : []),
          ...cast.students.map((s) => ({ key: s.key, spot: s.spot })),
          ...cast.commuters.flatMap((c) =>
            c.seats.map((spot, i) => ({ key: `${c.key}[${i}]`, spot })),
          ),
        ];

        for (const { key, spot } of sitters) {
          expect(
            surfaces.some((box) => inBox(spot, box)),
            `${label}/${layoutId}: ${key} sits at ${spot.x.toFixed(2)},${spot.z.toFixed(2)} ` +
              `with no seat under them`,
          ).toBe(true);
        }
      }
    }
  }, 30_000);

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
  }, 30_000);

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
      ['archive', 'bookshelf'],
      ['studyHall', 'bookshelf'],
      ['staffRoom', 'armchair'],
      ['musicRoom', 'piano'],
      ['office', 'receptionDesk'],
      ['garden', 'planter'],
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
  }, 30_000);
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
    // The window loop skips whatever the board covers; on the narrow 8x7 wall a
    // brand-new player starts with, that silently swallowed every window
    // position once already.
    for (const variantId of variantIds) {
      const props = stageProps(buildPlan(starterRoomIds(variantId), variantId));
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
  }, 30_000);
});

describe('payroll and morale', () => {
  it('mirrors the server on every derived number', () => {
    for (const weeks of [0, 1, 3, 8, 60]) {
      expect(moraleFor(weeks), `morale at ${weeks} weeks`).toBe(serverMoraleFor(weeks));
      expect(weeklyWage(4, 20)).toBe(serverWeeklyWage(4, 20));
      expect(payrollDue(4, 20, weeks)).toBe(serverPayrollDue(4, 20, weeks));
    }
    expect(PAYROLL_MAX_WEEKS).toBe(SERVER_PAYROLL_MAX_WEEKS);
  });

  it('reads a school as paid up until a whole week has passed', () => {
    const now = Date.UTC(2026, 0, 29);
    const ago = (ms: number) => new Date(now - ms).toISOString();
    expect(weeksOwed(ago(0), now)).toBe(0);
    expect(weeksOwed(ago(PAYROLL_WEEK_MS - 1), now)).toBe(0);
    expect(weeksOwed(ago(PAYROLL_WEEK_MS), now)).toBe(1);
    expect(weeksOwed(ago(PAYROLL_WEEK_MS * 3.9), now)).toBe(3);
  });

  it('never charges for a date it cannot read, and never for the future', () => {
    // The one failure mode worth ruling out entirely: a field that did not load
    // must not read as months of arrears.
    const now = Date.UTC(2026, 0, 29);
    for (const junk of [null, undefined, '', 'not a date', new Date(now + 99999)]) {
      expect(weeksOwed(junk as never, now), String(junk)).toBe(0);
    }
  });

  it('bottoms morale out exactly where the arrears stop', () => {
    expect(moraleFor(0)).toBe(100);
    expect(moraleFor(PAYROLL_MAX_WEEKS)).toBe(0);
    expect(moraleFor(PAYROLL_MAX_WEEKS + 50)).toBe(0);
    for (let w = 1; w <= PAYROLL_MAX_WEEKS; w++) {
      expect(moraleFor(w), `week ${w}`).toBeLessThan(moraleFor(w - 1));
    }
  });

  it('thins the school without ever emptying it', () => {
    // Morale's ONLY effect. A neglected school is quieter, never smaller —
    // no room closes and nobody is removed, which was an explicit decision.
    for (const variantId of variantIds) {
      const owned = roomIdsOf(variantId);
      const full = peoplePlan(buildPlan(owned, variantId, 0, 100), DEFAULT_LAYOUT_ID);
      const empty = peoplePlan(buildPlan(owned, variantId, 0, 0), DEFAULT_LAYOUT_ID);

      expect(empty.students.length, variantId).toBeLessThan(full.students.length);
      expect(empty.wanderers.length, variantId).toBeLessThan(full.wanderers.length);
      // Still a school, not a ghost town.
      expect(empty.students.length, variantId).toBeGreaterThan(0);
      expect(empty.wanderers.length, variantId).toBeGreaterThan(0);
      // And nothing was taken away. This is the half of the decision that is
      // easy to break later: it would be very natural to "close" a room at zero
      // morale, and the whole point is that the school never loses anything.
      const dark = buildPlan(owned, variantId, 0, 0);
      expect(dark.rooms.length, variantId).toBe(owned.length);
      expect(stageProps(dark).length, variantId).toBe(
        stageProps(buildPlan(owned, variantId, 0, 100)).length,
      );
      expect(empty.teachers.length, variantId).toBe(full.teachers.length);
    }
  });

  it('leaves a paid-up school exactly as it was', () => {
    // 0.45 + 0.55 is the identity, which is why morale could be added without
    // moving a single existing count.
    for (const variantId of variantIds) {
      const owned = roomIdsOf(variantId);
      const plan = buildPlan(owned, variantId, 0, 100);
      const cast = peoplePlan(plan, DEFAULT_LAYOUT_ID);
      expect(cast.students.filter((s) => s.pose === 'desk' && s.key.startsWith('s')).length + 1)
        .toBe(plan.stage.students + 1);
      expect(cast.wanderers.length, variantId).toBe(plan.stage.wanderers);
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
