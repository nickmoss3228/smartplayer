// config/schoolCatalog.ts
//
// MIRROR of backend/src/config/schoolCatalog.js — keep the two in step by hand
// when you change a price, a room or a floorplan. The server re-reads its own
// copy when a purchase request lands, so a stale or tampered mirror can only
// ever earn a 400; what it buys us is being able to draw the building and quote
// the next price without a round-trip. schoolCatalog.test.ts compares the two
// directly and fails the build if they drift.
//
// Only the shared economy and geometry live here. Where the desks, plants and
// windows actually stand is a rendering concern and lives in
// modules/school/props.ts — the server has no opinion about it.

export type RoomKind =
  | "classroom"
  | "library"
  | "corridor"
  | "lab"
  | "courtyard"
  | "hall"
  | "lobby"
  | "forecourt"
  | "cafeteria"
  | "gym"
  // The second ring. A kind, not an id, because more than one room can be of
  // each — props are dispatched by kind (FURNISHERS in props.ts).
  | "staff"
  | "office"
  | "music"
  | "garden";

/** The three currencies a room can be priced in. Each room takes exactly one:
 *  see the backend catalog's header for which kind of room takes which. */
export type Currency = "bitAward" | "bitWord" | "bitPhrase";

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Axis-aligned rectangle on the ground plane, in tiles (1 tile = 1 metre).
 *  x/z are the north-west corner. */
export interface SchoolRoomRect extends Rect {
  id: string;
  kind: RoomKind;
  /** Courtyard and forecourt: no roof, no walls, ground instead of flooring. */
  outdoor?: boolean;
}

/** How a room reaches a neighbour that did not exist when it was built. Every
 *  matching entry contributes to a bounding-box union, so growth in two
 *  directions composes and a campus can never shrink. */
export interface RoomGrowth {
  /** Grow once ANY of these rooms is owned. */
  when: string[];
  rect: Rect;
}

/** A room you can buy, its one price, and its one authored home. */
export interface RoomSpec {
  id: string;
  kind: RoomKind;
  currency: Currency;
  price: number;
  /** Owned from the very first load. Only the first classroom. */
  starter: boolean;
  rect: Rect;
  grows: RoomGrowth[];
  outdoor: boolean;
}

/** Where a room connects to the one you pass through to reach the corridor.
 *  The point sits ON their shared edge, which is what lets Building.tsx cut a
 *  doorway there and People walk through it rather than through the wall.
 *
 *  `parent` is also the purchase rule: a room cannot be bought until the room
 *  you would walk in through has been. */
export interface DoorNode {
  parent: string | null;
  x: number;
  z: number;
}

export interface SchoolVariant {
  id: string;
  name: string;
  rooms: RoomSpec[];
  doors: Record<string, DoorNode>;
}

export interface SchoolStage {
  index: number;
  id: string;
  name: string;
  blurb: string;
  /** Main classroom. */
  desks: number;
  students: number;
  /** Applied to EVERY other classroom the variant has at this level. */
  secondaryDesks: number;
  secondaryStudents: number;
  teachers: number;
  /** Roam without stopping anywhere. */
  wanderers: number;
  /** Walk between two rooms and sit down at each end. */
  commuters: number;
}

export type LayoutId = "rows" | "u-shape" | "clusters" | "circle";

export interface SchoolLayout {
  id: LayoutId;
  name: string;
  unlocksAtStage: number;
}

export interface SchoolSurface {
  id: string;
  name: string;
  color: string;
  /** Second colour: wall trim, or the alternating floor tile. */
  trim?: string;
  alt?: string;
  unlocksAtStage: number;
}

interface RoomOpts {
  grows?: RoomGrowth[];
  starter?: boolean;
  outdoor?: boolean;
}

const room = (
  id: string,
  kind: RoomKind,
  currency: Currency,
  price: number,
  rect: Rect,
  opts: RoomOpts = {},
): RoomSpec => ({
  id,
  kind,
  currency,
  price,
  rect,
  grows: opts.grows ?? [],
  starter: opts.starter ?? false,
  outdoor: opts.outdoor ?? false,
});

/** The classroom reaches south to meet the corridor the moment there IS one. */
const CLASSROOM_GROWTH: RoomGrowth[] = [
  { when: ["corridor"], rect: { x: 0, z: 0, w: 12, d: 8 } },
];

const VARIANT_COURTYARD: SchoolVariant = {
  id: "courtyard",
  name: "Courtyard School",
  // Rooms wrap around a central open yard, with the hall out to the west.
  //
  //   x=-24     x=-13    x=0        x=12  x=19  x=28
  //  z=0 +--------+--------+----------+-----+-----+
  //      | CLS C  |  HALL  | CLASSROOM| LIB |CLS B|
  //  z=8 |        |        +----------+-----+-----+
  //      |        |        |      CORRIDOR       |
  // z=11 +--------+--------+---+-----------+
  //               |CAFETERIA|LAB| COURTYARD |
  // z=17          |        +---+           |
  //               |        |LOB|           |
  // z=20          |        |   +-----------+
  // z=23          +--------+   |    GYM    |
  // z=24                   +---+           |
  // z=28                   |FORE           |
  // z=30                   |CRT+-----------+
  rooms: [
    room("classroom", "classroom", "bitAward", 0, { x: 0, z: 0, w: 8, d: 7 }, { starter: true, grows: CLASSROOM_GROWTH }),
    room("corridor", "corridor", "bitAward", 60, { x: 0, z: 8, w: 19, d: 3 }, {
      grows: [
        { when: ["classroomB", "archive"], rect: { x: 19, z: 8, w: 9, d: 3 } },
        { when: ["classroomD", "musicRoom"], rect: { x: 28, z: 8, w: 9, d: 3 } },
      ],
    }),
    room("library", "library", "bitWord", 80, { x: 12, z: 0, w: 7, d: 8 }),
    room("lab", "lab", "bitWord", 400, { x: 0, z: 11, w: 8, d: 6 }),
    room("courtyard", "courtyard", "bitPhrase", 160, { x: 8, z: 11, w: 11, d: 9 }, { outdoor: true }),
    room("hall", "hall", "bitWord", 900, { x: -13, z: 0, w: 13, d: 11 }),
    room("lobby", "lobby", "bitWord", 1900, { x: 0, z: 17, w: 8, d: 7 }),
    room("forecourt", "forecourt", "bitPhrase", 300, { x: 0, z: 24, w: 8, d: 4 }, { outdoor: true }),
    room("classroomB", "classroom", "bitAward", 2200, { x: 19, z: 0, w: 9, d: 8 }),
    room("cafeteria", "cafeteria", "bitPhrase", 600, { x: -13, z: 11, w: 13, d: 12 }),
    room("classroomC", "classroom", "bitAward", 4300, { x: -24, z: 0, w: 11, d: 11 }),
    room("gym", "gym", "bitPhrase", 840, { x: 8, z: 20, w: 11, d: 10 }),
    // The second ring. East of the courtyard and south of the cafeteria, plus
    // one classroom out past the north row on either side.
    room("archive", "library", "bitWord", 2400, { x: 19, z: 11, w: 9, d: 7 }),
    room("staffRoom", "staff", "bitPhrase", 900, { x: 19, z: 18, w: 9, d: 7 }),
    room("musicRoom", "music", "bitPhrase", 1400, { x: 28, z: 11, w: 9, d: 8 }),
    room("office", "office", "bitAward", 3000, { x: 28, z: 19, w: 9, d: 6 }),
    room("studyHall", "library", "bitWord", 4900, { x: -24, z: 11, w: 11, d: 9 }),
    room("garden", "garden", "bitPhrase", 1900, { x: -13, z: 23, w: 13, d: 8 }, { outdoor: true }),
    room("classroomD", "classroom", "bitAward", 5200, { x: 28, z: 0, w: 9, d: 8 }),
    // Its north wall is the study hall, so its board hangs on the WEST wall
    // instead — the first room in the catalog to need boardFrameOf.
    room("classroomE", "classroom", "bitAward", 6400, { x: -24, z: 20, w: 11, d: 8 }),
  ],
  doors: {
    classroom: { parent: "corridor", x: 10, z: 8 },
    library: { parent: "corridor", x: 15.5, z: 8 },
    classroomB: { parent: "corridor", x: 23.5, z: 8 },
    lab: { parent: "corridor", x: 4, z: 11 },
    courtyard: { parent: "corridor", x: 13, z: 11 },
    hall: { parent: "corridor", x: 0, z: 9.5 },
    classroomC: { parent: "hall", x: -13, z: 5.5 },
    lobby: { parent: "lab", x: 4, z: 17 },
    forecourt: { parent: "lobby", x: 4, z: 24 },
    cafeteria: { parent: "hall", x: -6.5, z: 11 },
    gym: { parent: "courtyard", x: 13, z: 20 },
    // On the aisle, not down the middle. A library-kind room keeps a clear run
    // down its east side and fills the rest; a door in the centre of one puts
    // whoever walks through the room straight over the reading table. Same for
    // the music room, which keeps its east side clear for the same reason.
    archive: { parent: "corridor", x: 27.1, z: 11 },
    staffRoom: { parent: "archive", x: 27.1, z: 18 },
    musicRoom: { parent: "corridor", x: 36, z: 11 },
    office: { parent: "musicRoom", x: 36, z: 19 },
    studyHall: { parent: "classroomC", x: -18.5, z: 11 },
    garden: { parent: "cafeteria", x: -6.5, z: 23 },
    classroomD: { parent: "corridor", x: 32.5, z: 8 },
    classroomE: { parent: "studyHall", x: -18.5, z: 20 },
  },
};

const VARIANT_QUAD: SchoolVariant = {
  id: "quad",
  name: "Quad School",
  // One long teaching terrace along the north, everything else hanging south of
  // a single corridor. Wider and shallower than the Courtyard.
  //
  //  x=-24    x=-12   x=0        x=12   x=20   x=29
  //  z=0 +-------+-------+----------+------+------+
  //      | CLS C | HALL  | CLASSROOM| LIB  | CLS B|
  //  z=8 +-------+-------+----------+------+------+
  //      |               CORRIDOR                 |
  // z=11 +-------+----------+-------+------+------+
  //      |CAFETERIA| COURTYARD | LAB |  GYM |
  // z=18 |         |           +-----+      |
  // z=21 +---------+-----------+     |      |
  //                | LOBBY     |     +------+
  // z=28           +-----------+
  //                | FORECOURT |
  // z=32           +-----------+
  rooms: [
    room("classroom", "classroom", "bitAward", 0, { x: 0, z: 0, w: 8, d: 7 }, { starter: true, grows: CLASSROOM_GROWTH }),
    // Two independent extensions. West is needed by anything hanging off the
    // corridor at negative x; east by classroomB and the gym.
    room("corridor", "corridor", "bitAward", 60, { x: 0, z: 8, w: 20, d: 3 }, {
      grows: [
        { when: ["hall", "cafeteria"], rect: { x: -12, z: 8, w: 12, d: 3 } },
        { when: ["classroomB", "gym"], rect: { x: 20, z: 8, w: 11, d: 3 } },
        { when: ["classroomD"], rect: { x: 31, z: 8, w: 10, d: 3 } },
      ],
    }),
    room("library", "library", "bitWord", 80, { x: 12, z: 0, w: 8, d: 8 }),
    room("lab", "lab", "bitWord", 400, { x: 12, z: 11, w: 8, d: 7 }),
    room("courtyard", "courtyard", "bitPhrase", 160, { x: 0, z: 11, w: 12, d: 10 }, { outdoor: true }),
    room("hall", "hall", "bitWord", 900, { x: -12, z: 0, w: 12, d: 8 }),
    room("lobby", "lobby", "bitWord", 1900, { x: 0, z: 21, w: 12, d: 7 }),
    room("forecourt", "forecourt", "bitPhrase", 300, { x: 0, z: 28, w: 12, d: 4 }, { outdoor: true }),
    room("classroomB", "classroom", "bitAward", 2200, { x: 20, z: 0, w: 9, d: 8 }),
    room("cafeteria", "cafeteria", "bitPhrase", 600, { x: -12, z: 11, w: 12, d: 10 }),
    room("classroomC", "classroom", "bitAward", 4300, { x: -24, z: 0, w: 12, d: 8 }),
    room("gym", "gym", "bitPhrase", 840, { x: 20, z: 11, w: 11, d: 10 }),
    // The second ring hangs off the row below the corridor, and the west end
    // steps down past classroomC.
    room("archive", "library", "bitWord", 2400, { x: 12, z: 18, w: 8, d: 8 }),
    room("staffRoom", "staff", "bitPhrase", 900, { x: -12, z: 21, w: 12, d: 8 }),
    room("musicRoom", "music", "bitPhrase", 1400, { x: 20, z: 21, w: 11, d: 8 }),
    room("office", "office", "bitAward", 3000, { x: 20, z: 29, w: 11, d: 7 }),
    room("studyHall", "library", "bitWord", 4900, { x: -24, z: 8, w: 12, d: 8 }),
    room("garden", "garden", "bitPhrase", 1900, { x: 12, z: 28, w: 8, d: 8 }, { outdoor: true }),
    room("classroomD", "classroom", "bitAward", 5200, { x: 31, z: 0, w: 10, d: 8 }),
    // Board on the WEST wall: the study hall is pressed against its north side.
    room("classroomE", "classroom", "bitAward", 6400, { x: -24, z: 16, w: 12, d: 8 }),
  ],
  doors: {
    classroom: { parent: "corridor", x: 6, z: 8 },
    library: { parent: "corridor", x: 16, z: 8 },
    classroomB: { parent: "corridor", x: 24.5, z: 8 },
    hall: { parent: "corridor", x: -6, z: 8 },
    classroomC: { parent: "hall", x: -12, z: 4 },
    lab: { parent: "corridor", x: 16, z: 11 },
    courtyard: { parent: "corridor", x: 6, z: 11 },
    cafeteria: { parent: "corridor", x: -6, z: 11 },
    gym: { parent: "corridor", x: 25.5, z: 11 },
    lobby: { parent: "courtyard", x: 6, z: 21 },
    forecourt: { parent: "lobby", x: 6, z: 28 },
    archive: { parent: "lab", x: 16, z: 18 },
    staffRoom: { parent: "cafeteria", x: -6, z: 21 },
    musicRoom: { parent: "gym", x: 30, z: 21 },
    office: { parent: "musicRoom", x: 30, z: 29 },
    studyHall: { parent: "classroomC", x: -18, z: 8 },
    garden: { parent: "forecourt", x: 12, z: 30 },
    classroomD: { parent: "corridor", x: 36, z: 8 },
    classroomE: { parent: "studyHall", x: -18, z: 16 },
  },
};

const VARIANT_TERRACE: SchoolVariant = {
  id: "terrace",
  name: "Terrace School",
  // A long east-west street with the teaching rooms strung along the north and
  // the big spaces stepping down to the south-east.
  //
  //  x=-21   x=-9   x=0        x=12       x=25    x=34
  //  z=0 +------+------+----------+----------+------+
  //      | CLS C| LIB  | CLASSROOM|   HALL   | CLS B|
  //  z=8 +------+------+----------+----------+------+
  //      |            CORRIDOR               |
  // z=11 +------+----------+----------+
  //      | LAB  | COURTYARD| CAFETERIA|
  // z=18 +------+          |          |
  // z=20        +----------+----------+
  //             |  LOBBY   |   GYM    |
  // z=27        +----------+          |
  //             | FORECOURT|          |
  // z=31        +----------+----------+
  rooms: [
    room("classroom", "classroom", "bitAward", 0, { x: 0, z: 0, w: 8, d: 7 }, { starter: true, grows: CLASSROOM_GROWTH }),
    room("corridor", "corridor", "bitAward", 60, { x: -9, z: 8, w: 21, d: 3 }, {
      grows: [{ when: ["hall", "cafeteria"], rect: { x: 12, z: 8, w: 13, d: 3 } }],
    }),
    room("library", "library", "bitWord", 80, { x: -9, z: 0, w: 9, d: 8 }),
    room("lab", "lab", "bitWord", 400, { x: -9, z: 11, w: 9, d: 7 }),
    room("courtyard", "courtyard", "bitPhrase", 160, { x: 0, z: 11, w: 12, d: 9 }, { outdoor: true }),
    room("hall", "hall", "bitWord", 900, { x: 12, z: 0, w: 13, d: 8 }),
    room("lobby", "lobby", "bitWord", 1900, { x: 0, z: 20, w: 12, d: 7 }),
    room("forecourt", "forecourt", "bitPhrase", 300, { x: 0, z: 27, w: 12, d: 4 }, { outdoor: true }),
    room("classroomB", "classroom", "bitAward", 2200, { x: 25, z: 0, w: 9, d: 8 }),
    room("cafeteria", "cafeteria", "bitPhrase", 600, { x: 12, z: 11, w: 13, d: 9 }),
    room("classroomC", "classroom", "bitAward", 4300, { x: -21, z: 0, w: 12, d: 8 }),
    room("gym", "gym", "bitPhrase", 840, { x: 12, z: 20, w: 13, d: 10 }),
    // The street keeps running east, and the west end steps down past the lab.
    room("archive", "library", "bitWord", 2400, { x: -9, z: 18, w: 9, d: 8 }),
    room("staffRoom", "staff", "bitPhrase", 900, { x: 25, z: 11, w: 11, d: 8 }),
    room("musicRoom", "music", "bitPhrase", 1400, { x: 25, z: 19, w: 11, d: 8 }),
    room("office", "office", "bitAward", 3000, { x: 25, z: 27, w: 11, d: 7 }),
    room("studyHall", "library", "bitWord", 4900, { x: -21, z: 8, w: 12, d: 8 }),
    room("garden", "garden", "bitPhrase", 1900, { x: -9, z: 26, w: 9, d: 8 }, { outdoor: true }),
    room("classroomD", "classroom", "bitAward", 5200, { x: 34, z: 0, w: 12, d: 8 }),
    // Board on the WEST wall: the study hall is pressed against its north side.
    room("classroomE", "classroom", "bitAward", 6400, { x: -21, z: 16, w: 12, d: 8 }),
  ],
  doors: {
    classroom: { parent: "corridor", x: 6, z: 8 },
    library: { parent: "corridor", x: -4.5, z: 8 },
    hall: { parent: "corridor", x: 18, z: 8 },
    classroomB: { parent: "hall", x: 25, z: 4 },
    classroomC: { parent: "library", x: -9, z: 4 },
    lab: { parent: "corridor", x: -4.5, z: 11 },
    courtyard: { parent: "corridor", x: 6, z: 11 },
    cafeteria: { parent: "corridor", x: 18, z: 11 },
    lobby: { parent: "courtyard", x: 6, z: 20 },
    forecourt: { parent: "lobby", x: 6, z: 27 },
    gym: { parent: "cafeteria", x: 18, z: 20 },
    archive: { parent: "lab", x: -4.5, z: 18 },
    // North end of the shared edge, not the middle: a doorway carries a 1.9m
    // clearance zone and clearDoorways deletes whatever stands in it, which
    // halfway down this wall meant one of the cafeteria's two long tables —
    // leaving visitSeats offering a bench that was no longer there.
    staffRoom: { parent: "cafeteria", x: 25, z: 12.5 },
    musicRoom: { parent: "staffRoom", x: 35, z: 19 },
    office: { parent: "musicRoom", x: 35, z: 27 },
    studyHall: { parent: "classroomC", x: -15, z: 8 },
    garden: { parent: "forecourt", x: 0, z: 29 },
    classroomD: { parent: "classroomB", x: 34, z: 4 },
    classroomE: { parent: "studyHall", x: -15, z: 16 },
  },
};

export const SCHOOL_VARIANTS: SchoolVariant[] = [VARIANT_COURTYARD, VARIANT_QUAD, VARIANT_TERRACE];
export const DEFAULT_VARIANT_ID = SCHOOL_VARIANTS[0].id;

export const getVariant = (id: string): SchoolVariant =>
  SCHOOL_VARIANTS.find((v) => v.id === id) ?? SCHOOL_VARIANTS[0];

export const getRoomSpec = (variantId: string, roomId: string): RoomSpec | null =>
  getVariant(variantId).rooms.find((r) => r.id === roomId) ?? null;

/** The rooms a brand-new player already has. One classroom, and that is it. */
export const starterRoomIds = (variantId: string): string[] =>
  getVariant(variantId).rooms.filter((r) => r.starter).map((r) => r.id);

/** A room's rectangle given what else is owned: the bounding-box union of its
 *  base rect and every growth whose trigger has been bought. */
function rectOf(spec: RoomSpec, owned: readonly string[]): Rect {
  let { x, z } = spec.rect;
  let x1 = x + spec.rect.w;
  let z1 = z + spec.rect.d;
  for (const g of spec.grows) {
    if (!g.when.some((id) => owned.includes(id))) continue;
    x = Math.min(x, g.rect.x);
    z = Math.min(z, g.rect.z);
    x1 = Math.max(x1, g.rect.x + g.rect.w);
    z1 = Math.max(z1, g.rect.z + g.rect.d);
  }
  return { x, z, w: x1 - x, d: z1 - z };
}

/** The full floorplan for one variant and one set of owned rooms. */
export function roomsOwned(variantId: string, ownedIds: readonly string[]): SchoolRoomRect[] {
  const owned = Array.isArray(ownedIds) ? ownedIds : [];
  return getVariant(variantId)
    .rooms.filter((spec) => owned.includes(spec.id))
    .map((spec) => ({
      id: spec.id,
      kind: spec.kind,
      ...rectOf(spec, owned),
      ...(spec.outdoor ? { outdoor: true } : {}),
    }));
}

/** Why a room cannot be bought right now, ignoring the wallet. Null means it
 *  can. `locked` is the parent rule, which keeps an owned set a connected
 *  subtree rooted at the corridor — see the backend copy for why that matters. */
export type BuyBlocker = "unknown" | "owned" | "locked";

export function buyBlocker(
  variantId: string,
  ownedIds: readonly string[],
  roomId: string,
): BuyBlocker | null {
  const owned = Array.isArray(ownedIds) ? ownedIds : [];
  if (!getRoomSpec(variantId, roomId)) return "unknown";
  if (owned.includes(roomId)) return "owned";
  const parent = getVariant(variantId).doors[roomId]?.parent ?? null;
  if (parent && !owned.includes(parent)) return "locked";
  return null;
}

export const canBuy = (variantId: string, ownedIds: readonly string[], roomId: string): boolean =>
  buyBlocker(variantId, ownedIds, roomId) === null;

/** The room you walk in through, which is also the room you must own first.
 *  Null for the corridor, which is the root of the tree. */
export const parentOf = (variantId: string, roomId: string): string | null =>
  getVariant(variantId).doors[roomId]?.parent ?? null;

/** Everything not yet owned, in catalog order, with why you cannot have it
 *  yet. The build list renders this straight through: a room you cannot reach
 *  is still worth showing, because seeing the gym behind the courtyard is what
 *  tells you which room to buy next. */
export function buildableRooms(
  variantId: string,
  ownedIds: readonly string[],
): { spec: RoomSpec; blocker: BuyBlocker | null }[] {
  return getVariant(variantId)
    .rooms.filter((spec) => !ownedIds.includes(spec.id))
    .map((spec) => ({ spec, blocker: buyBlocker(variantId, ownedIds, spec.id) }));
}

// ── Levels ──────────────────────────────────────────────────────────────────
//
// How developed the school is. DERIVED from how many rooms you own rather than
// stored, so the room set stays the single save. It drives how many people turn
// up and which free looks are selectable; it is not a price list and nothing
// charges for it.
//
// The names and blurbs are still keyed `school.stages.<id>` in the locale
// files, and the field is still `stage` everywhere downstream, because renaming
// a concept the player never sees would churn both catalogs, the badge, the
// reveal card and two translation files to buy nothing.
export const SCHOOL_STAGES: SchoolStage[] = [
  {
    index: 0,
    id: "one-room",
    name: "One Room",
    blurb: "A board, four desks, and everyone who showed up.",
    desks: 4, students: 3, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 1, wanderers: 0, commuters: 0,
  },
  {
    index: 1,
    id: "full-class",
    name: "Full Class",
    blurb: "The walls move out. Nine desks, and a shelf worth reading.",
    desks: 9, students: 6, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 1, wanderers: 0, commuters: 0,
  },
  {
    index: 2,
    id: "reading-corner",
    name: "Reading Corner",
    blurb: "A library wing, a rug, and two people who never leave it.",
    desks: 9, students: 6, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 1, wanderers: 0, commuters: 0,
  },
  {
    index: 3,
    id: "listening-lab",
    name: "Listening Lab",
    blurb: "A corridor with footsteps in it, and booths at the end of it.",
    desks: 12, students: 9, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 1, wanderers: 3, commuters: 1,
  },
  {
    index: 4,
    id: "courtyard",
    name: "Courtyard",
    blurb: "Open air, one tree, and somewhere to be between lessons.",
    desks: 12, students: 9, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 1, wanderers: 5, commuters: 2,
  },
  {
    index: 5,
    id: "assembly-hall",
    name: "Assembly Hall",
    blurb: "A stage, a banner, and a shelf with something to put on it.",
    desks: 12, students: 10, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 2, wanderers: 6, commuters: 2,
  },
  {
    index: 6,
    id: "front-desk",
    name: "Front Desk",
    blurb: "A way in, and someone at reception to meet whoever uses it.",
    desks: 12, students: 10, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 2, wanderers: 7, commuters: 3,
  },
  {
    index: 7,
    id: "second-classroom",
    name: "Second Classroom",
    blurb: "A second English room — flags, a globe, and the whole alphabet.",
    desks: 12, students: 10, secondaryDesks: 8, secondaryStudents: 6,
    teachers: 3, wanderers: 8, commuters: 4,
  },
  {
    index: 8,
    id: "cafeteria",
    name: "Cafeteria",
    blurb: "Trays, long tables, a third classroom, and the loudest room here.",
    desks: 12, students: 10, secondaryDesks: 8, secondaryStudents: 6,
    teachers: 4, wanderers: 9, commuters: 5,
  },
  {
    index: 9,
    id: "gymnasium",
    name: "Gymnasium",
    blurb: "Wall bars, a scoreboard, and room to make some noise.",
    desks: 12, students: 10, secondaryDesks: 8, secondaryStudents: 7,
    teachers: 4, wanderers: 10, commuters: 6,
  },
];

export const STARTER_STAGE = 0;
export const MAX_STAGE = SCHOOL_STAGES.length - 1;

/** How many rooms it takes to reach each level. Index is the level. */
export const LEVEL_AT_ROOMS: number[] = [1, 2, 3, 4, 6, 8, 10, 12, 15, 18];

/**
 * The level a room set earns, floored by `levelFloor`.
 *
 * The floor exists for players migrated off the old ten-stage economy. Their
 * rooms do not always re-earn the level they had paid for — the old stage 1
 * bought the classroom's extension rather than a room at all — and a level that
 * went DOWN would invalidate a wallpaper they had already chosen, leaving them
 * unable to reselect their own saved look. Their old stage index is kept as the
 * floor, so nobody ever moves backwards. A new player's floor is 0.
 *
 * Total by construction, like `getStage`: a non-numeric floor or a junk room
 * list yields level 0, not undefined.
 */
export function levelFor(ownedIds: readonly string[], levelFloor = 0): number {
  const count = Array.isArray(ownedIds) ? ownedIds.length : 0;
  let level = 0;
  for (let i = 0; i < LEVEL_AT_ROOMS.length; i++) {
    if (LEVEL_AT_ROOMS[i] <= count) level = i;
  }
  const floor = Number.isInteger(levelFloor) ? levelFloor : 0;
  return Math.min(MAX_STAGE, Math.max(0, level, floor));
}

/**
 * Which rooms each of the old ten stages put on screen, frozen as a literal.
 *
 * Used once per player, by ensureSchool, to turn a stage index into the room
 * set they had already paid for. Deliberately NOT derived from the catalog
 * above: the catalog is free to move from here on, and this table must keep
 * saying what the game looked like on the day it changed. Identical for all
 * three variants, because the old `from` stage of a room never differed
 * between them.
 */
export const LEGACY_STAGE_ROOMS: string[][] = [
  ["classroom"],
  ["classroom"],
  ["classroom", "library"],
  ["classroom", "library", "corridor", "lab"],
  ["classroom", "library", "corridor", "lab", "courtyard"],
  ["classroom", "library", "corridor", "lab", "courtyard", "hall"],
  ["classroom", "library", "corridor", "lab", "courtyard", "hall", "lobby", "forecourt"],
  ["classroom", "library", "corridor", "lab", "courtyard", "hall", "lobby", "forecourt", "classroomB"],
  ["classroom", "library", "corridor", "lab", "courtyard", "hall", "lobby", "forecourt", "classroomB", "cafeteria", "classroomC"],
  ["classroom", "library", "corridor", "lab", "courtyard", "hall", "lobby", "forecourt", "classroomB", "cafeteria", "classroomC", "gym"],
];

// ── Free preferences ────────────────────────────────────────────────────────
// Nothing here costs a coin — the coins go on rooms. They gate on level
// instead: a new room is worth buying partly because it hands you new ways to
// redecorate what you already had.

export const SCHOOL_LAYOUTS: SchoolLayout[] = [
  { id: "rows", name: "Rows", unlocksAtStage: 0 },
  { id: "u-shape", name: "U-shape", unlocksAtStage: 1 },
  { id: "clusters", name: "Clusters", unlocksAtStage: 2 },
  { id: "circle", name: "Circle", unlocksAtStage: 3 },
];

export const SCHOOL_WALLPAPERS: SchoolSurface[] = [
  { id: "chalk", name: "Chalk White", color: "#e9e6df", trim: "#cfcabf", unlocksAtStage: 0 },
  { id: "mint", name: "Mint", color: "#d7e8dd", trim: "#b3cdbd", unlocksAtStage: 0 },
  { id: "butter", name: "Butter", color: "#f0e4c4", trim: "#d6c49b", unlocksAtStage: 1 },
  { id: "rose", name: "Dusty Rose", color: "#e8d5d3", trim: "#c9adaa", unlocksAtStage: 2 },
  { id: "slate", name: "Slate Blue", color: "#ccd6e3", trim: "#a6b5c8", unlocksAtStage: 3 },
  { id: "plum", name: "Plum", color: "#ddd2e4", trim: "#bcaac8", unlocksAtStage: 4 },
  { id: "ink", name: "Ink", color: "#9fa8bd", trim: "#7d879c", unlocksAtStage: 5 },
  { id: "sage", name: "Sage", color: "#cfd8c3", trim: "#adb89f", unlocksAtStage: 6 },
  { id: "clay", name: "Clay", color: "#e0c6ae", trim: "#c2a58b", unlocksAtStage: 7 },
  { id: "harbour", name: "Harbour", color: "#b8ccd4", trim: "#94adb7", unlocksAtStage: 8 },
  { id: "cocoa", name: "Cocoa", color: "#bda893", trim: "#9c8874", unlocksAtStage: 9 },
];

export const SCHOOL_FLOORS: SchoolSurface[] = [
  { id: "parquet", name: "Parquet", color: "#c39a63", alt: "#b78d57", unlocksAtStage: 0 },
  { id: "lino", name: "Linoleum", color: "#c9c3b6", alt: "#bdb7a9", unlocksAtStage: 0 },
  { id: "checker", name: "Checker", color: "#e2ded5", alt: "#5c6b7a", unlocksAtStage: 1 },
  { id: "concrete", name: "Concrete", color: "#b4b4b0", alt: "#a9a9a5", unlocksAtStage: 2 },
  { id: "carpet", name: "Carpet", color: "#a2727a", alt: "#96686f", unlocksAtStage: 3 },
  { id: "oak", name: "Dark Oak", color: "#7d5b3e", alt: "#6f5036", unlocksAtStage: 4 },
  { id: "terrazzo", name: "Terrazzo", color: "#ded8cc", alt: "#8e9a86", unlocksAtStage: 6 },
  { id: "slate-tile", name: "Slate Tile", color: "#8f969c", alt: "#7e858b", unlocksAtStage: 8 },
];

export const DEFAULT_LAYOUT_ID: LayoutId = SCHOOL_LAYOUTS[0].id;
export const DEFAULT_WALLPAPER_ID = SCHOOL_WALLPAPERS[0].id;
export const DEFAULT_FLOOR_ID = SCHOOL_FLOORS[0].id;

// ── Lookups ─────────────────────────────────────────────────────────────────

/** Total by construction. An out-of-range or non-numeric index used to index
 *  past the end of the array and hand back `undefined`, and the first
 *  `stage.name` downstream took the whole page down with a white screen — which
 *  is exactly what a response missing `stage` (an older backend, a partial
 *  payload) looked like in practice. Falling back to level 0 turns that into a
 *  school you can look at while you work out what went wrong. */
export const getStage = (index: number): SchoolStage =>
  SCHOOL_STAGES[
    Number.isFinite(index) ? Math.min(MAX_STAGE, Math.max(0, Math.floor(index))) : 0
  ];

/** The level a room set earns, as a stage record rather than an index — the
 *  shape everything downstream of buildPlan actually wants. */
export const stageFor = (ownedIds: readonly string[], levelFloor = 0): SchoolStage =>
  getStage(levelFor(ownedIds, levelFloor));

export const getWallpaper = (id: string): SchoolSurface =>
  SCHOOL_WALLPAPERS.find((w) => w.id === id) ?? SCHOOL_WALLPAPERS[0];

export const getFloor = (id: string): SchoolSurface =>
  SCHOOL_FLOORS.find((f) => f.id === id) ?? SCHOOL_FLOORS[0];

export const getLayoutId = (id: string): LayoutId =>
  (SCHOOL_LAYOUTS.find((l) => l.id === id)?.id ?? DEFAULT_LAYOUT_ID) as LayoutId;

/** The bounding box of a floorplan, used to frame the camera.
 *
 *  `cx`/`cz` are the box centre — right for sizing and for the pan leash. But
 *  the campus is L-shaped from the corridor on, and once it is complete a
 *  quarter of the box is ground nothing has been built on, so aiming the camera
 *  at the box centre points it at grass and pushes the school into a corner.
 *  `fx`/`fz` are the area-weighted centroid of the rooms instead: where the
 *  school actually IS. */
export function planBounds(rooms: SchoolRoomRect[]) {
  const minX = Math.min(...rooms.map((r) => r.x));
  const maxX = Math.max(...rooms.map((r) => r.x + r.w));
  const minZ = Math.min(...rooms.map((r) => r.z));
  const maxZ = Math.max(...rooms.map((r) => r.z + r.d));

  let area = 0;
  let sx = 0;
  let sz = 0;
  for (const r of rooms) {
    const a = r.w * r.d;
    area += a;
    sx += a * (r.x + r.w / 2);
    sz += a * (r.z + r.d / 2);
  }

  return {
    minX, maxX, minZ, maxZ,
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
    fx: area ? sx / area : (minX + maxX) / 2,
    fz: area ? sz / area : (minZ + maxZ) / 2,
    w: maxX - minX,
    d: maxZ - minZ,
  };
}

// ── Payroll ─────────────────────────────────────────────────────────────────
//
// The one thing the school asks of you rather than the other way round. Wages
// come due weekly; you pay them from BitAward, and a school left unpaid gets
// quieter rather than smaller. NOTHING IS EVER TAKEN AWAY — no room closes, no
// teacher leaves, no progress is lost. This is a language app whose currency
// comes from studying, and a fortnight of real life should not be able to
// dismantle what somebody built.
//
// The entire save is ONE DATE. Weeks owed and morale are both derived from it,
// the same way the level is derived from the room list — two stored numbers
// that must agree with a third is a bug waiting to be written.

export const PAYROLL_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Nobody comes back from a year away owing fifty-two weeks. The arrears stop
 *  at a fortnight-and-a-half's worth, which is enough to notice and not enough
 *  to be a wall. */
export const PAYROLL_MAX_WEEKS = 8;

/** Whole weeks since the last payment, clamped. Total by construction: a
 *  missing or unparseable date reads as "paid just now", because charging
 *  somebody for a field that failed to load is the one outcome worth ruling
 *  out entirely. */
export function weeksOwed(lastPaidAt: string | Date | null | undefined, now = Date.now()): number {
  const then = lastPaidAt ? new Date(lastPaidAt).getTime() : NaN;
  if (!Number.isFinite(then) || then > now) return 0;
  return Math.min(PAYROLL_MAX_WEEKS, Math.floor((now - then) / PAYROLL_WEEK_MS));
}

/** How many BitAward one week costs: the staff, plus the upkeep of the rooms
 *  they work in. Deliberately gentle — a quiz pass mints 5, so a finished
 *  twenty-room campus runs to about fourteen quizzes a week and a young school
 *  to two. */
export const weeklyWage = (teachers: number, roomCount: number): number => teachers * 8 + roomCount * 2;

/** Everything owed right now. */
export const payrollDue = (teachers: number, roomCount: number, weeks: number): number => weeklyWage(teachers, roomCount) * weeks;

/** 100 when paid up, 0 at the arrears cap. Derived FROM the cap rather than
 *  from a step of its own: a fixed 12 a week left morale at 4 when the arrears
 *  stopped accruing, so the worst a school could feel was very nearly the worst
 *  but not quite. Two constants that have to land on each other should be one. */
export const moraleFor = (weeks: number): number =>
  Math.max(0, Math.min(100, Math.round(100 * (1 - weeks / PAYROLL_MAX_WEEKS))));

// ── Room labels ─────────────────────────────────────────────────────────────
//
// Display copy for the build sheet. Frontend-only and deliberately NOT part of
// SchoolVariant: the server charges for rooms but never names them, and putting
// this in the mirrored data would mean translating a string the server has no
// use for on both sides of the wire.
//
// English lives here as the fallback, the same arrangement the stage names
// have: the UI reads `school.rooms.<id>.name` and falls back to this, so a room
// added without a translation still renders something a player can read.

export interface RoomLabel {
  name: string;
  blurb: string;
}

export const ROOM_LABELS: Record<string, RoomLabel> = {
  classroom: { name: "Classroom", blurb: "A board, some desks, and everyone who showed up." },
  corridor: { name: "Corridor", blurb: "The spine. Every other room opens off it." },
  library: { name: "Library", blurb: "A reading wing, a rug, and two people who never leave it." },
  lab: { name: "Listening Lab", blurb: "Booths, headphones, and the same track one more time." },
  courtyard: { name: "Courtyard", blurb: "Open air, one tree, and somewhere to be between lessons." },
  hall: { name: "Assembly Hall", blurb: "A stage, a banner, and a shelf with something to put on it." },
  lobby: { name: "Reception", blurb: "A front desk, and someone behind it to meet whoever comes in." },
  forecourt: { name: "Forecourt", blurb: "The way in off the street, with a gate that says so." },
  classroomB: { name: "Second Classroom", blurb: "Another English room — flags, a globe, the whole alphabet." },
  cafeteria: { name: "Cafeteria", blurb: "Trays, long tables, and the loudest room here." },
  classroomC: { name: "Third Classroom", blurb: "A third English room, out past the hall." },
  gym: { name: "Gymnasium", blurb: "Wall bars, a scoreboard, and room to make some noise." },
  archive: { name: "Archive", blurb: "The stacks. Older books, and nobody talking." },
  studyHall: { name: "Study Hall", blurb: "Desks, chairs, and somewhere quiet to use them." },
  staffRoom: { name: "Staff Room", blurb: "Armchairs, a kettle, and the one room with nothing to teach in it." },
  musicRoom: { name: "Music Room", blurb: "A piano, a small stage, and somewhere to be heard." },
  office: { name: "Head's Office", blurb: "A desk, a trophy shelf, and whoever is running this place." },
  garden: { name: "Garden", blurb: "Raised beds, a tree, and two benches out of the wind." },
  classroomD: { name: "Fourth Classroom", blurb: "Another English room, out at the east end." },
  classroomE: { name: "Fifth Classroom", blurb: "The far corner — its board hangs on the west wall." },
};

export const roomLabel = (id: string): RoomLabel =>
  ROOM_LABELS[id] ?? { name: id, blurb: "" };

// ── Per-room looks ──────────────────────────────────────────────────────────
//
// A room may override any of the three free preferences. What it does not
// override falls through to the school's own setting, which is what every room
// used before this existed — so a player who never opens customize mode sees
// exactly what they saw before, and a room with no entry costs nothing to store.
//
// Deliberately sparse rather than a full record per room: twenty rooms times
// three ids, almost all of them equal to the default, is a save that grows
// without saying anything.

export interface RoomPreset {
  layoutId?: string;
  wallpaperId?: string;
  floorId?: string;
}

export type RoomPresets = Record<string, RoomPreset>;

/** The three ids a school falls back to for any room that has not overridden
 *  them. Named apart from SchoolState so the catalog stays free of the wire
 *  format. */
export interface BaseLook {
  layoutId: string;
  wallpaperId: string;
  floorId: string;
}

export interface RoomLook {
  layoutId: LayoutId;
  wallpaper: SchoolSurface;
  floor: SchoolSurface;
  /** True when this room differs from the school default, which is the only
   *  thing the customize panel needs in order to offer a "reset". */
  custom: boolean;
}

export function lookFor(roomId: string, presets: RoomPresets, base: BaseLook): RoomLook {
  const p = presets?.[roomId] ?? {};
  return {
    layoutId: getLayoutId(p.layoutId ?? base.layoutId),
    wallpaper: getWallpaper(p.wallpaperId ?? base.wallpaperId),
    floor: getFloor(p.floorId ?? base.floorId),
    custom: Boolean(p.layoutId || p.wallpaperId || p.floorId),
  };
}

/** Which of the three a room kind can actually change.
 *
 *  A desk layout only means something where there are desks, and an outdoor
 *  room has grass rather than flooring — offering either would be a control
 *  that visibly does nothing, which is worse than not offering it. */
export function customisable(kind: RoomKind, outdoor: boolean): (keyof RoomPreset)[] {
  if (outdoor) return ["wallpaperId"];
  return kind === "classroom"
    ? ["layoutId", "wallpaperId", "floorId"]
    : ["wallpaperId", "floorId"];
}
