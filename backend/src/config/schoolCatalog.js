// config/schoolCatalog.js
//
// The Dream School's entire economy: a campus of rooms you buy one at a time,
// three floorplans, and two free preferences. See docs/room-game-concept.md.
//
// A player owns a SET OF ROOMS. That set is the whole save — every rectangle,
// prop and person on screen is derived from it. There is still no item shop and
// no per-slot placement: each room has exactly one authored home, and buying it
// puts it there.
//
// Each room is priced in exactly ONE currency, by what the room is for:
//
//   bitAward  — the fabric of the school. The corridor, and every classroom.
//   bitWord   — rooms you go to in order to read and listen: library, listening
//               lab, assembly hall, reception.
//   bitPhrase — rooms you go to in order to talk: courtyard, cafeteria, gym,
//               the forecourt out front.
//
// The server is the source of truth for every number here. The frontend keeps a
// hand-maintained mirror at src/config/schoolCatalog.ts so it can draw the
// building and quote a price without a round-trip; the buy endpoint re-reads
// THIS file when the request lands, so a tampered mirror only ever earns a 400.

// ── Variants ────────────────────────────────────────────────────────────────
// The economy is shared — every player pays the same for the gym — but the
// SHAPE of the campus is not. A player is assigned one of three floorplans for
// life, so visiting someone else's school shows a different building rather
// than a recolour of your own.
//
// Every variant uses the same room ids and kinds; only the rectangles and the
// doorways differ. That is what lets the props, the seating and the routing be
// written once and work for all three.
//
// TWO RULES GOVERN WHERE A ROOM MAY GO, both forced by the fixed camera, which
// looks down from +x/+z and therefore only ever draws north and west walls:
//
//   1. A room placed north or west of another sits BEHIND it. Wherever two
//      rooms meet, that span of wall drops to knee height so the room behind
//      stays visible (Building.tsx computes this span by span).
//   2. A classroom's board hangs on its NORTH wall, so nothing may be built
//      directly behind that wall or the board is left floating over a knee-high
//      partition. In practice: every classroom sits on the campus's north edge.
//
// schoolCatalog.test.ts asserts rule 2, plus no-overlap and every-door-on-a-
// shared-edge, for all three variants over a spread of owned sets.

/**
 * A room, its price, and where it stands.
 *
 * `grows` is how a room reaches a neighbour that did not exist when it was
 * built. Each entry contributes its rect to a BOUNDING-BOX UNION once any of
 * its `when` rooms is owned — so growth in two directions composes without the
 * entries having to know about each other, and a campus can never shrink, by
 * construction rather than by test.
 *
 * The corridor is the reason this exists. Its children open onto x positions
 * the base corridor does not reach, and keying the growth on THE CHILD THAT
 * NEEDS IT means a door and the wall it pierces can never disagree — which is
 * exactly the bug that shipped when growth was keyed on a stage number instead
 * (classroomB arrived two stages before the corridor reached it).
 */
const room = (id, kind, currency, price, rect, opts = {}) => ({
  id,
  kind,
  currency,
  price,
  rect,
  grows: opts.grows ?? [],
  starter: opts.starter ?? false,
  outdoor: opts.outdoor ?? false,
});

/** The classroom reaches south to meet the corridor the moment there IS one.
 *  Shared by all three variants, which start from the same 8x7 hut. */
const CLASSROOM_GROWTH = [{ when: ["corridor"], rect: { x: 0, z: 0, w: 12, d: 8 } }];

const VARIANT_COURTYARD = {
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

const VARIANT_QUAD = {
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

const VARIANT_TERRACE = {
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

export const SCHOOL_VARIANTS = [VARIANT_COURTYARD, VARIANT_QUAD, VARIANT_TERRACE];
export const DEFAULT_VARIANT_ID = SCHOOL_VARIANTS[0].id;

export const getVariant = (id) =>
  SCHOOL_VARIANTS.find((v) => v.id === id) ?? SCHOOL_VARIANTS[0];

export const getRoomSpec = (variantId, roomId) =>
  getVariant(variantId).rooms.find((r) => r.id === roomId) ?? null;

/** The rooms a brand-new player already has. One classroom, and that is it. */
export const starterRoomIds = (variantId) =>
  getVariant(variantId).rooms.filter((r) => r.starter).map((r) => r.id);

/** A room's rectangle given what else is owned: the bounding-box union of its
 *  base rect and every growth whose trigger has been bought. */
function rectOf(spec, owned) {
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
export function roomsOwned(variantId, ownedIds) {
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

/**
 * Why a room cannot be bought right now, ignoring the wallet. Null means it can.
 *
 * The parent rule is what keeps an owned set a CONNECTED SUBTREE rooted at the
 * corridor: you cannot buy the gym before the courtyard it opens off. Without
 * it a player could strand a room whose doorway opens onto grass, and every
 * routing invariant in the test suite would be checking a campus no amount of
 * walking could cross.
 */
export function buyBlocker(variantId, ownedIds, roomId) {
  const owned = Array.isArray(ownedIds) ? ownedIds : [];
  if (!getRoomSpec(variantId, roomId)) return "unknown";
  if (owned.includes(roomId)) return "owned";
  const parent = getVariant(variantId).doors[roomId]?.parent ?? null;
  if (parent && !owned.includes(parent)) return "locked";
  return null;
}

export const canBuy = (variantId, ownedIds, roomId) =>
  buyBlocker(variantId, ownedIds, roomId) === null;

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
export const SCHOOL_STAGES = [
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

/** How many rooms it takes to reach each level. Index is the level.
 *
 *  Stretched when the campus went from twelve rooms to twenty: a level is how
 *  developed the school is, and reaching the top on a twelve-room prefix of a
 *  twenty-room campus would have the last eight rooms arrive with no more
 *  people in them. Migrated players are held up by their level floor, not by
 *  this table. */
export const LEVEL_AT_ROOMS = [1, 2, 3, 4, 6, 8, 10, 12, 15, 18];

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
export function levelFor(ownedIds, levelFloor = 0) {
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
export const LEGACY_STAGE_ROOMS = [
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

export const SCHOOL_LAYOUTS = [
  { id: "rows", name: "Rows", unlocksAtStage: 0 },
  { id: "u-shape", name: "U-shape", unlocksAtStage: 1 },
  { id: "clusters", name: "Clusters", unlocksAtStage: 2 },
  { id: "circle", name: "Circle", unlocksAtStage: 3 },
];

export const SCHOOL_WALLPAPERS = [
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

export const SCHOOL_FLOORS = [
  { id: "parquet", name: "Parquet", color: "#c39a63", alt: "#b78d57", unlocksAtStage: 0 },
  { id: "lino", name: "Linoleum", color: "#c9c3b6", alt: "#bdb7a9", unlocksAtStage: 0 },
  { id: "checker", name: "Checker", color: "#e2ded5", alt: "#5c6b7a", unlocksAtStage: 1 },
  { id: "concrete", name: "Concrete", color: "#b4b4b0", alt: "#a9a9a5", unlocksAtStage: 2 },
  { id: "carpet", name: "Carpet", color: "#a2727a", alt: "#96686f", unlocksAtStage: 3 },
  { id: "oak", name: "Dark Oak", color: "#7d5b3e", alt: "#6f5036", unlocksAtStage: 4 },
  { id: "terrazzo", name: "Terrazzo", color: "#ded8cc", alt: "#8e9a86", unlocksAtStage: 6 },
  { id: "slate-tile", name: "Slate Tile", color: "#8f969c", alt: "#7e858b", unlocksAtStage: 8 },
];

export const DEFAULT_LAYOUT_ID = SCHOOL_LAYOUTS[0].id;
export const DEFAULT_WALLPAPER_ID = SCHOOL_WALLPAPERS[0].id;
export const DEFAULT_FLOOR_ID = SCHOOL_FLOORS[0].id;

// ── Lookups ─────────────────────────────────────────────────────────────────

export const getStage = (index) =>
  SCHOOL_STAGES.find((stage) => stage.index === index);

// A look is only selectable once its level has been reached. Validated on the
// server as well as filtered on the client: the client filter is a courtesy,
// this is the rule.
const unlockedAt = (list, id, stage) => {
  const entry = list.find((e) => e.id === id);
  return entry && entry.unlocksAtStage <= stage ? entry : null;
};

export const getLayout = (id, stage) => unlockedAt(SCHOOL_LAYOUTS, id, stage);
export const getWallpaper = (id, stage) => unlockedAt(SCHOOL_WALLPAPERS, id, stage);
export const getFloor = (id, stage) => unlockedAt(SCHOOL_FLOORS, id, stage);

/** The three free preferences, and the lookup that validates each. Lets
 *  setSchoolLook handle "the school" and "one room" with the same loop instead
 *  of two nearly-identical blocks that can drift apart. */
export const LOOK_FIELDS = [
  ["layoutId", getLayout],
  ["wallpaperId", getWallpaper],
  ["floorId", getFloor],
];

/**
 * Which of the three a room kind can actually change.
 *
 * A desk layout only means something where there are desks, and an outdoor room
 * has grass rather than flooring. Enforced here rather than only in the UI that
 * hides the control: a room with a floor it never renders is a save that lies.
 */
export function customisable(kind, outdoor) {
  if (outdoor) return ["wallpaperId"];
  return kind === "classroom"
    ? ["layoutId", "wallpaperId", "floorId"]
    : ["wallpaperId", "floorId"];
}

/**
 * Which campus a player gets. Derived from their user id rather than rolled at
 * random, so it is stable without a migration and identical on every device —
 * and it is still persisted, so the assignment can be changed by hand later
 * without this function silently overriding it.
 */
export function variantForUserId(userId) {
  const s = String(userId ?? "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return SCHOOL_VARIANTS[hash % SCHOOL_VARIANTS.length].id;
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
export function weeksOwed(lastPaidAt, now = Date.now()) {
  const then = lastPaidAt ? new Date(lastPaidAt).getTime() : NaN;
  if (!Number.isFinite(then) || then > now) return 0;
  return Math.min(PAYROLL_MAX_WEEKS, Math.floor((now - then) / PAYROLL_WEEK_MS));
}

/** How many BitAward one week costs: the staff, plus the upkeep of the rooms
 *  they work in. Deliberately gentle — a quiz pass mints 5, so a finished
 *  twenty-room campus runs to about fourteen quizzes a week and a young school
 *  to two. */
export const weeklyWage = (teachers, roomCount) => teachers * 8 + roomCount * 2;

/** Everything owed right now. */
export const payrollDue = (teachers, roomCount, weeks) => weeklyWage(teachers, roomCount) * weeks;

/** 100 when paid up, 0 at the arrears cap. Derived FROM the cap rather than
 *  from a step of its own: a fixed 12 a week left morale at 4 when the arrears
 *  stopped accruing, so the worst a school could feel was very nearly the worst
 *  but not quite. Two constants that have to land on each other should be one. */
export const moraleFor = (weeks) =>
  Math.max(0, Math.min(100, Math.round(100 * (1 - weeks / PAYROLL_MAX_WEEKS))));
