// config/schoolCatalog.js
//
// The Dream School's entire economy: ten stages, three campus layouts, and two
// free preferences. See docs/room-game-concept.md.
//
// There is no item shop. A player owns nothing individually — the school is at
// a stage, and a stage brings its rooms, furniture and people with it. That is
// why this file has no prices except the ten upgrade costs.
//
// The server is the source of truth for every number here. The frontend keeps a
// generated mirror at src/config/schoolCatalog.ts so it can draw the building
// and quote a price without a round-trip; the upgrade endpoint re-reads THIS
// file when the request lands, so a tampered mirror only ever earns a 400.

// ── Variants ────────────────────────────────────────────────────────────────
// The economy is shared — every player pays the same for stage 7 — but the
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
// schoolCatalog.test.ts asserts rule 2, plus no-overlap and never-shrinking,
// for all three variants at all ten stages.

/** A room that appears at stage `from`, optionally changing size later.
 *  `rects` is [stageIndex, rect] pairs; the latest one at or below the current
 *  stage wins. Only the classroom and the corridor actually grow. */
const room = (id, kind, from, rects, outdoor = false) => ({ id, kind, from, rects, outdoor });

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
    room("classroom", "classroom", 0, [[0, { x: 0, z: 0, w: 8, d: 7 }], [1, { x: 0, z: 0, w: 12, d: 8 }]]),
    room("library", "library", 2, [[2, { x: 12, z: 0, w: 7, d: 8 }]]),
    room("corridor", "corridor", 3, [[3, { x: 0, z: 8, w: 19, d: 3 }], [7, { x: 0, z: 8, w: 28, d: 3 }]]),
    room("lab", "lab", 3, [[3, { x: 0, z: 11, w: 8, d: 6 }]]),
    room("courtyard", "courtyard", 4, [[4, { x: 8, z: 11, w: 11, d: 9 }]], true),
    room("hall", "hall", 5, [[5, { x: -13, z: 0, w: 13, d: 11 }]]),
    room("lobby", "lobby", 6, [[6, { x: 0, z: 17, w: 8, d: 7 }]]),
    room("forecourt", "forecourt", 6, [[6, { x: 0, z: 24, w: 8, d: 4 }]], true),
    room("classroomB", "classroom", 7, [[7, { x: 19, z: 0, w: 9, d: 8 }]]),
    room("cafeteria", "cafeteria", 8, [[8, { x: -13, z: 11, w: 13, d: 12 }]]),
    room("classroomC", "classroom", 8, [[8, { x: -24, z: 0, w: 11, d: 11 }]]),
    room("gym", "gym", 9, [[9, { x: 8, z: 20, w: 11, d: 10 }]]),
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
    room("classroom", "classroom", 0, [[0, { x: 0, z: 0, w: 8, d: 7 }], [1, { x: 0, z: 0, w: 12, d: 8 }]]),
    room("library", "library", 2, [[2, { x: 12, z: 0, w: 8, d: 8 }]]),
    room("corridor", "corridor", 3, [[3, { x: 0, z: 8, w: 20, d: 3 }], [5, { x: -12, z: 8, w: 32, d: 3 }], [9, { x: -12, z: 8, w: 43, d: 3 }]]),
    room("lab", "lab", 3, [[3, { x: 12, z: 11, w: 8, d: 7 }]]),
    room("courtyard", "courtyard", 4, [[4, { x: 0, z: 11, w: 12, d: 10 }]], true),
    room("hall", "hall", 5, [[5, { x: -12, z: 0, w: 12, d: 8 }]]),
    room("lobby", "lobby", 6, [[6, { x: 0, z: 21, w: 12, d: 7 }]]),
    room("forecourt", "forecourt", 6, [[6, { x: 0, z: 28, w: 12, d: 4 }]], true),
    room("classroomB", "classroom", 7, [[7, { x: 20, z: 0, w: 9, d: 8 }]]),
    room("cafeteria", "cafeteria", 8, [[8, { x: -12, z: 11, w: 12, d: 10 }]]),
    room("classroomC", "classroom", 8, [[8, { x: -24, z: 0, w: 12, d: 8 }]]),
    room("gym", "gym", 9, [[9, { x: 20, z: 11, w: 11, d: 10 }]]),
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
    room("classroom", "classroom", 0, [[0, { x: 0, z: 0, w: 8, d: 7 }], [1, { x: 0, z: 0, w: 12, d: 8 }]]),
    room("library", "library", 2, [[2, { x: -9, z: 0, w: 9, d: 8 }]]),
    room("corridor", "corridor", 3, [[3, { x: -9, z: 8, w: 21, d: 3 }], [5, { x: -9, z: 8, w: 34, d: 3 }]]),
    room("lab", "lab", 3, [[3, { x: -9, z: 11, w: 9, d: 7 }]]),
    room("courtyard", "courtyard", 4, [[4, { x: 0, z: 11, w: 12, d: 9 }]], true),
    room("hall", "hall", 5, [[5, { x: 12, z: 0, w: 13, d: 8 }]]),
    room("lobby", "lobby", 6, [[6, { x: 0, z: 20, w: 12, d: 7 }]]),
    room("forecourt", "forecourt", 6, [[6, { x: 0, z: 27, w: 12, d: 4 }]], true),
    room("classroomB", "classroom", 7, [[7, { x: 25, z: 0, w: 9, d: 8 }]]),
    room("cafeteria", "cafeteria", 8, [[8, { x: 12, z: 11, w: 13, d: 9 }]]),
    room("classroomC", "classroom", 8, [[8, { x: -21, z: 0, w: 12, d: 8 }]]),
    room("gym", "gym", 9, [[9, { x: 12, z: 20, w: 13, d: 10 }]]),
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
  },
};

export const SCHOOL_VARIANTS = [VARIANT_COURTYARD, VARIANT_QUAD, VARIANT_TERRACE];
export const DEFAULT_VARIANT_ID = SCHOOL_VARIANTS[0].id;

export const getVariant = (id) =>
  SCHOOL_VARIANTS.find((v) => v.id === id) ?? SCHOOL_VARIANTS[0];

/** Which rectangle a room occupies at a given stage — the last override at or
 *  below it. */
function rectAt(spec, stageIndex) {
  let chosen = spec.rects[0][1];
  for (const [from, rect] of spec.rects) {
    if (from <= stageIndex) chosen = rect;
  }
  return chosen;
}

/** The full floorplan of one variant at one stage. */
export function roomsAtStage(variantId, stageIndex) {
  const variant = getVariant(variantId);
  return variant.rooms
    .filter((spec) => spec.from <= stageIndex)
    .map((spec) => ({
      id: spec.id,
      kind: spec.kind,
      ...rectAt(spec, stageIndex),
      ...(spec.outdoor ? { outdoor: true } : {}),
    }));
}

// ── Stages ──────────────────────────────────────────────────────────────────
// Shared across every variant: the same price buys the same amount of school,
// whichever shape yours happens to be.
//
// `desks` drives the main classroom's layout presets; `students` is how many of
// those desks are occupied by NPCs, and the two differ by at least one because
// the player's own avatar always takes a desk. `secondaryDesks`/
// `secondaryStudents` apply to EVERY other classroom the variant has, so adding
// a fourth classroom later needs no new fields. `wanderers` roam; `commuters`
// walk between rooms and sit down at each end.
export const SCHOOL_STAGES = [
  {
    index: 0,
    id: "one-room",
    name: "One Room",
    blurb: "A board, four desks, and everyone who showed up.",
    cost: { bitAward: 0, bitWord: 0, bitPhrase: 0 },
    desks: 4, students: 3, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 1, wanderers: 0, commuters: 0,
  },
  {
    index: 1,
    id: "full-class",
    name: "Full Class",
    blurb: "The walls move out. Nine desks, and a shelf worth reading.",
    cost: { bitAward: 40, bitWord: 20, bitPhrase: 10 },
    desks: 9, students: 6, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 1, wanderers: 0, commuters: 0,
  },
  {
    index: 2,
    id: "reading-corner",
    name: "Reading Corner",
    blurb: "A library wing, a rug, and two people who never leave it.",
    cost: { bitAward: 90, bitWord: 45, bitPhrase: 25 },
    desks: 9, students: 6, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 1, wanderers: 0, commuters: 0,
  },
  {
    index: 3,
    id: "listening-lab",
    name: "Listening Lab",
    blurb: "A corridor with footsteps in it, and booths at the end of it.",
    cost: { bitAward: 180, bitWord: 90, bitPhrase: 50 },
    desks: 12, students: 9, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 1, wanderers: 3, commuters: 1,
  },
  {
    index: 4,
    id: "courtyard",
    name: "Courtyard",
    blurb: "Open air, one tree, and somewhere to be between lessons.",
    cost: { bitAward: 320, bitWord: 160, bitPhrase: 90 },
    desks: 12, students: 9, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 1, wanderers: 5, commuters: 2,
  },
  {
    index: 5,
    id: "assembly-hall",
    name: "Assembly Hall",
    blurb: "A stage, a banner, and a shelf with something to put on it.",
    cost: { bitAward: 550, bitWord: 275, bitPhrase: 160 },
    desks: 12, students: 10, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 2, wanderers: 6, commuters: 2,
  },
  {
    index: 6,
    id: "front-desk",
    name: "Front Desk",
    blurb: "A way in, and someone at reception to meet whoever uses it.",
    cost: { bitAward: 800, bitWord: 400, bitPhrase: 230 },
    desks: 12, students: 10, secondaryDesks: 0, secondaryStudents: 0,
    teachers: 2, wanderers: 7, commuters: 3,
  },
  {
    index: 7,
    id: "second-classroom",
    name: "Second Classroom",
    blurb: "A second English room — flags, a globe, and the whole alphabet.",
    cost: { bitAward: 1100, bitWord: 550, bitPhrase: 320 },
    desks: 12, students: 10, secondaryDesks: 8, secondaryStudents: 6,
    teachers: 3, wanderers: 8, commuters: 4,
  },
  {
    index: 8,
    id: "cafeteria",
    name: "Cafeteria",
    blurb: "Trays, long tables, a third classroom, and the loudest room here.",
    cost: { bitAward: 1500, bitWord: 750, bitPhrase: 430 },
    desks: 12, students: 10, secondaryDesks: 8, secondaryStudents: 6,
    teachers: 4, wanderers: 9, commuters: 5,
  },
  {
    index: 9,
    id: "gymnasium",
    name: "Gymnasium",
    blurb: "Wall bars, a scoreboard, and room to make some noise.",
    cost: { bitAward: 2000, bitWord: 1000, bitPhrase: 580 },
    desks: 12, students: 10, secondaryDesks: 8, secondaryStudents: 7,
    teachers: 4, wanderers: 10, commuters: 6,
  },
];

export const STARTER_STAGE = 0;
export const MAX_STAGE = SCHOOL_STAGES.length - 1;

// ── Free preferences ────────────────────────────────────────────────────────
// Nothing here costs a coin — the only sink in the game is the upgrade button.
// They gate on stage instead: a new stage is worth pressing partly because it
// hands you new ways to redecorate what you already had.

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

// What the one button costs right now, or null when the school is fully built.
export const getNextStage = (currentIndex) =>
  SCHOOL_STAGES.find((stage) => stage.index === currentIndex + 1) ?? null;

// A look is only selectable once its stage has been reached. Validated on the
// server as well as filtered on the client: the client filter is a courtesy,
// this is the rule.
const unlockedAt = (list, id, stage) => {
  const entry = list.find((e) => e.id === id);
  return entry && entry.unlocksAtStage <= stage ? entry : null;
};

export const getLayout = (id, stage) => unlockedAt(SCHOOL_LAYOUTS, id, stage);
export const getWallpaper = (id, stage) => unlockedAt(SCHOOL_WALLPAPERS, id, stage);
export const getFloor = (id, stage) => unlockedAt(SCHOOL_FLOORS, id, stage);

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
