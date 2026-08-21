// config/schoolCatalog.js
//
// "Dream School" — the game that replaced the office-decorating Room. The
// player earns three currencies by listening and spends each on a different
// kind of thing, so none of them is dead weight:
//
//   bitAward  -> unlocking ROOMS   (big, slow, the thing you save toward)
//   bitWord   -> FURNITURE         (steady, what you spend most sessions)
//   bitPhrase -> ACTIONS           (small, flavour — what the avatar does)
//
// Mirrored by src/config/schoolCatalog.ts on the frontend. THIS file is the
// source of truth for anything that costs money; the mirror carries the same
// data so the UI can render without a round-trip, but the server re-reads
// prices here on every purchase and never trusts the client.
//
// Art is deliberately procedural: an item carries a palette, and the slot it
// belongs to decides which shape gets drawn (modules/school/sprites.tsx).
// Swapping in real artwork later means changing the sprite renderers, not this
// catalog — the same tradeoff the old shopCatalog made with its swatch field.

// ── Rooms ───────────────────────────────────────────────────────────────────
// zone places the room in the dollhouse cutaway: two indoor floors stacked
// above an outdoor strip. order is the column within that zone.
export const SCHOOL_ROOMS = [
  {
    id: "classroom",
    name: "Classroom",
    zone: "main",
    order: 0,
    unlockPriceBitAward: 0, // free: the school must never open empty
    slots: ["board", "desks", "teacherDesk"],
    idleAnim: "write",
  },
  {
    id: "library",
    name: "Library",
    zone: "main",
    order: 1,
    unlockPriceBitAward: 50,
    slots: ["shelves", "nook", "rug"],
    idleAnim: "read",
  },
  {
    id: "listening-lab",
    name: "Listening Lab",
    zone: "main",
    order: 2,
    unlockPriceBitAward: 90,
    slots: ["booth", "speakers", "labPoster"],
    idleAnim: "listen",
  },
  {
    id: "art-room",
    name: "Art Room",
    zone: "upper",
    order: 0,
    unlockPriceBitAward: 130,
    slots: ["easel", "supplies", "wallArt"],
    idleAnim: "paint",
  },
  {
    id: "cafeteria",
    name: "Cafeteria",
    zone: "upper",
    order: 1,
    unlockPriceBitAward: 170,
    slots: ["counter", "cafeTables", "cafePlants"],
    idleAnim: "sip",
  },
  {
    id: "theatre",
    name: "Theatre",
    zone: "upper",
    order: 2,
    // The most expensive room on purpose — the plan asked for something that
    // feels like saving toward something big. Its phrase-staging feature comes
    // later; for now it unlocks and decorates like any other room.
    unlockPriceBitAward: 300,
    slots: ["stage", "seats", "curtain"],
    idleAnim: "bow",
  },
  {
    id: "garden",
    name: "Garden",
    zone: "garden",
    order: 0,
    unlockPriceBitAward: 210,
    slots: ["tree", "bench", "flowers"],
    idleAnim: "stretch",
  },
];

// ── Slots ───────────────────────────────────────────────────────────────────
// Fixed positions, per the plan: no free placement, no grid snapping. Each
// slot names where its sprite sits inside the cell, as fractions of the cell
// box, so the renderer stays resolution-independent.
export const SCHOOL_SLOTS = {
  board:       { roomId: "classroom",     label: "Board",        x: 0.24, y: 0.34, scale: 1.0 },
  desks:       { roomId: "classroom",     label: "Desks",        x: 0.62, y: 0.66, scale: 1.0 },
  teacherDesk: { roomId: "classroom",     label: "Teacher Desk", x: 0.26, y: 0.70, scale: 0.8 },

  shelves:     { roomId: "library",       label: "Shelves",      x: 0.24, y: 0.44, scale: 1.0 },
  nook:        { roomId: "library",       label: "Reading Nook", x: 0.70, y: 0.64, scale: 1.0 },
  rug:         { roomId: "library",       label: "Rug",          x: 0.46, y: 0.82, scale: 1.0 },

  booth:       { roomId: "listening-lab", label: "Booth",        x: 0.64, y: 0.60, scale: 1.0 },
  speakers:    { roomId: "listening-lab", label: "Speakers",     x: 0.22, y: 0.64, scale: 0.9 },
  labPoster:   { roomId: "listening-lab", label: "Poster",       x: 0.44, y: 0.30, scale: 0.9 },

  easel:       { roomId: "art-room",      label: "Easel",        x: 0.30, y: 0.60, scale: 1.0 },
  supplies:    { roomId: "art-room",      label: "Supplies",     x: 0.68, y: 0.72, scale: 0.9 },
  wallArt:     { roomId: "art-room",      label: "Wall Art",     x: 0.58, y: 0.30, scale: 0.9 },

  counter:     { roomId: "cafeteria",     label: "Counter",      x: 0.26, y: 0.62, scale: 1.0 },
  cafeTables:  { roomId: "cafeteria",     label: "Tables",       x: 0.64, y: 0.72, scale: 1.0 },
  cafePlants:  { roomId: "cafeteria",     label: "Plants",       x: 0.86, y: 0.58, scale: 0.85 },

  stage:       { roomId: "theatre",       label: "Stage",        x: 0.50, y: 0.62, scale: 1.0 },
  seats:       { roomId: "theatre",       label: "Seats",        x: 0.50, y: 0.86, scale: 1.0 },
  curtain:     { roomId: "theatre",       label: "Curtain",      x: 0.50, y: 0.28, scale: 1.0 },

  tree:        { roomId: "garden",        label: "Tree",         x: 0.18, y: 0.52, scale: 1.0 },
  bench:       { roomId: "garden",        label: "Bench",        x: 0.52, y: 0.74, scale: 1.0 },
  flowers:     { roomId: "garden",        label: "Flowers",      x: 0.82, y: 0.76, scale: 0.9 },
};

// ── Furniture (bitWord) ─────────────────────────────────────────────────────
// Three options per slot, priced by visual weight. The plan asked that small
// things stay cheap so there is always something affordable to buy.
const f = (id, slot, name, priceBitWord, color, accent, variant) => ({
  id,
  slot,
  roomId: SCHOOL_SLOTS[slot].roomId,
  name,
  priceBitWord,
  palette: { color, accent },
  variant,
});

export const SCHOOL_ITEMS = [
  // Classroom
  f("board-slate",    "board",       "Slate Board",       4, "#2f4f4a", "#e8f1ee", 0),
  f("board-white",    "board",       "Whiteboard",        8, "#f4f7fb", "#5b7c9d", 1),
  f("board-star",     "board",       "Starmap Board",    14, "#2b2f5e", "#f6d365", 2),
  f("desks-plain",    "desks",       "Plain Desks",       4, "#c9a173", "#8a6a45", 0),
  f("desks-pastel",   "desks",       "Pastel Desks",      8, "#f0c3c8", "#c98d97", 1),
  f("desks-cloud",    "desks",       "Cloud Desks",      14, "#dbe7f6", "#93b3d6", 2),
  f("teacher-oak",    "teacherDesk", "Oak Desk",           4, "#b07f4d", "#8a5f36", 0),
  f("teacher-ivory",  "teacherDesk", "Ivory Desk",        8, "#f2ece1", "#c9bda6", 1),
  f("teacher-moon",   "teacherDesk", "Moonwood Desk",    14, "#8f8fc4", "#5d5d93", 2),

  // Library
  f("shelves-oak",    "shelves",     "Oak Shelves",       4, "#a9793f", "#7d5a35", 0),
  f("shelves-tall",   "shelves",     "Tall Shelves",      8, "#8c6b4f", "#5f4632", 1),
  f("shelves-spiral", "shelves",     "Spiral Stacks",    14, "#6b5b95", "#eddcf7", 2),
  f("nook-cushion",   "nook",        "Cushion Nook",      4, "#e5b7a1", "#bd8a74", 0),
  f("nook-window",    "nook",        "Window Seat",       8, "#bcd6c8", "#87ab97", 1),
  f("nook-canopy",    "nook",        "Canopy Nook",      14, "#d8c2f0", "#9f81c9", 2),
  f("rug-round",      "rug",         "Round Rug",          4, "#d9c4a3", "#b39a76", 0),
  f("rug-star",       "rug",         "Star Rug",          8, "#9db8d4", "#f4e4b8", 1),
  f("rug-galaxy",     "rug",         "Galaxy Rug",       14, "#3b3f78", "#f6d365", 2),

  // Listening Lab
  f("booth-basic",    "booth",       "Study Booth",       4, "#cdd6de", "#93a4b3", 0),
  f("booth-padded",   "booth",       "Padded Booth",      8, "#b8c9bf", "#7e9689", 1),
  f("booth-dream",    "booth",       "Dream Pod",        14, "#c3b4ea", "#7c69b8", 2),
  f("speakers-small", "speakers",    "Desk Speakers",      4, "#4a4a52", "#8f939c", 0),
  f("speakers-tower", "speakers",    "Tower Speakers",    8, "#33333a", "#d0a75f", 1),
  f("speakers-bloom", "speakers",    "Bloom Speakers",   14, "#e0b7d8", "#8c5f88", 2),
  f("poster-waves",   "labPoster",   "Waveform Poster",    4, "#f2efe6", "#5b7c9d", 0),
  f("poster-owl",     "labPoster",   "Night Owl Poster",  8, "#2d3a55", "#f2c14e", 1),
  f("poster-aurora",  "labPoster",   "Aurora Poster",    14, "#22405a", "#7fe0c4", 2),

  // Art Room
  f("easel-pine",     "easel",       "Pine Easel",        4, "#caa477", "#957247", 0),
  f("easel-splash",   "easel",       "Splash Easel",      8, "#efe3d0", "#e0705f", 1),
  f("easel-gilded",   "easel",       "Gilded Easel",     14, "#d8b25f", "#8a6a24", 2),
  f("supplies-jars",  "supplies",    "Paint Jars",         4, "#dfd3c0", "#9b8c74", 0),
  f("supplies-rack",  "supplies",    "Brush Rack",        8, "#b5c9b0", "#7c9377", 1),
  f("supplies-prism", "supplies",    "Prism Set",        14, "#cfd8ff", "#7d8ad6", 2),
  f("art-sketch",     "wallArt",     "Sketch Frame",       4, "#f4f1e8", "#a89e88", 0),
  f("art-landscape",  "wallArt",     "Landscape",         8, "#cfe2d2", "#6f9c7d", 1),
  f("art-nebula",     "wallArt",     "Nebula Canvas",    14, "#3a2f5e", "#e59bd0", 2),

  // Cafeteria
  f("counter-wood",   "counter",     "Wood Counter",      4, "#bb8a5c", "#8b6440", 0),
  f("counter-tile",   "counter",     "Tiled Counter",     8, "#e6e9ec", "#9aa7b1", 1),
  f("counter-honey",  "counter",     "Honey Bar",        14, "#e8b96b", "#a8763a", 2),
  f("tables-round",   "cafeTables",  "Round Tables",      4, "#d6c5aa", "#a89073", 0),
  f("tables-booth",   "cafeTables",  "Booth Seating",     8, "#c2a0a8", "#8f6f78", 1),
  f("tables-picnic",  "cafeTables",  "Picnic Tables",    14, "#b7cfa6", "#7f9a6f", 2),
  f("plants-pot",     "cafePlants",  "Potted Fern",        4, "#7fa06a", "#b4805a", 0),
  f("plants-hanging", "cafePlants",  "Hanging Vines",     8, "#6f9c6b", "#c8b79a", 1),
  f("plants-bloom",   "cafePlants",  "Blooming Pots",    14, "#8fbf7a", "#ef9fbc", 2),

  // Theatre
  f("stage-wood",     "stage",       "Wooden Stage",      4, "#a9793f", "#7a5527", 0),
  f("stage-marble",   "stage",       "Marble Stage",      8, "#eae7e0", "#b2aca0", 1),
  f("stage-starlit",  "stage",       "Starlit Stage",    14, "#2f2a55", "#f6d365", 2),
  f("seats-simple",   "seats",       "Simple Seats",      4, "#8f6f78", "#66505a", 0),
  f("seats-velvet",   "seats",       "Velvet Seats",      8, "#8d3f52", "#5d2637", 1),
  f("seats-cloud",    "seats",       "Cloud Seats",      14, "#c8cfe8", "#8f9ac0", 2),
  f("curtain-red",    "curtain",     "Red Curtain",       4, "#a33a45", "#6f242c", 0),
  f("curtain-teal",   "curtain",     "Teal Curtain",      8, "#2f6f6a", "#1e4b48", 1),
  f("curtain-aurora", "curtain",     "Aurora Curtain",   14, "#5b4a8f", "#9fe0d2", 2),

  // Garden
  f("tree-young",     "tree",        "Young Tree",        4, "#7fa06a", "#8a6a45", 0),
  f("tree-blossom",   "tree",        "Blossom Tree",      8, "#f0b7cb", "#8a6a45", 1),
  f("tree-ancient",   "tree",        "Ancient Oak",      14, "#5f8a57", "#6b5138", 2),
  f("bench-plain",    "bench",       "Plain Bench",        4, "#b58a5c", "#8a6440", 0),
  f("bench-iron",     "bench",       "Iron Bench",        8, "#6b7280", "#454b54", 1),
  f("bench-swing",    "bench",       "Garden Swing",     14, "#d8c2a8", "#9c8466", 2),
  f("flowers-daisy",  "flowers",     "Daisies",            4, "#f4f1e0", "#e9c46a", 0),
  f("flowers-tulip",  "flowers",     "Tulips",            8, "#e07a8f", "#7fa06a", 1),
  f("flowers-moon",   "flowers",     "Moonflowers",      14, "#cdd4f5", "#8f9ad8", 2),
];

// ── Actions (bitPhrase) ─────────────────────────────────────────────────────
// Every room already animates the avatar for free (SCHOOL_ROOMS[].idleAnim) —
// buying an action adds another animation to that room's cycle rather than
// unlocking motion that was previously missing. Cheap by design: bitPhrase is
// the currency a player accumulates fastest.
const a = (id, roomId, name, priceBitPhrase, anim) => ({
  id,
  roomId,
  name,
  priceBitPhrase,
  anim,
});

export const SCHOOL_ACTIONS = [
  a("act-cheer",    "classroom",     "Raise a hand",   6, "cheer"),
  a("act-ponder",   "classroom",     "Ponder",        10, "ponder"),
  a("act-browse",   "library",       "Browse shelves", 8, "browse"),
  a("act-nap",      "library",       "Cosy nap",      12, "nap"),
  a("act-dance",    "listening-lab", "Headphone sway", 8, "dance"),
  a("act-note",     "listening-lab", "Take notes",    12, "note"),
  a("act-brush",    "art-room",      "Broad strokes",  8, "brush"),
  a("act-admire",   "art-room",      "Step back",     12, "admire"),
  a("act-toast",    "cafeteria",     "Raise a cup",    8, "toast"),
  a("act-chat",     "cafeteria",     "Chatter",       12, "chat"),
  a("act-spin",     "theatre",       "Twirl",         14, "spin"),
  a("act-applause", "theatre",       "Applause",      18, "applause"),
  a("act-water",    "garden",        "Water plants",   8, "water"),
  a("act-gaze",     "garden",        "Stargaze",      16, "gaze"),
];

// ── Lookups ─────────────────────────────────────────────────────────────────
const roomById = new Map(SCHOOL_ROOMS.map((r) => [r.id, r]));
const itemById = new Map(SCHOOL_ITEMS.map((i) => [i.id, i]));
const actionById = new Map(SCHOOL_ACTIONS.map((x) => [x.id, x]));

export const getSchoolRoom = (id) => roomById.get(id) ?? null;
export const getSchoolItem = (id) => itemById.get(id) ?? null;
export const getSchoolAction = (id) => actionById.get(id) ?? null;

// The room every account starts with, so the dollhouse is never empty.
export const STARTER_ROOM_IDS = SCHOOL_ROOMS.filter(
  (r) => r.unlockPriceBitAward === 0,
).map((r) => r.id);
