// config/schoolCatalog.ts
//
// GENERATED from backend/src/config/schoolCatalog.js — do not hand-edit. Run
// `node _gen.mjs` at the repo root after changing the backend catalog.
//
// The backend is the source of truth for every price; this mirror exists so the
// dollhouse can render names, prices and palettes without a round-trip. The
// server re-reads its own copy on each purchase, so a tampered client can only
// ever get a 400 back.

export type SchoolRoomId = "classroom" | "library" | "listening-lab" | "art-room" | "cafeteria" | "theatre" | "garden";
export type SchoolSlotId = "board" | "desks" | "teacherDesk" | "shelves" | "nook" | "rug" | "booth" | "speakers" | "labPoster" | "easel" | "supplies" | "wallArt" | "counter" | "cafeTables" | "cafePlants" | "stage" | "seats" | "curtain" | "tree" | "bench" | "flowers";
export type SchoolZone = "upper" | "main" | "garden";
export type SchoolAnim = "write" | "read" | "listen" | "paint" | "sip" | "bow" | "stretch" | "cheer" | "ponder" | "browse" | "nap" | "dance" | "note" | "brush" | "admire" | "toast" | "chat" | "spin" | "applause" | "water" | "gaze";

export interface SchoolRoom {
  id: SchoolRoomId;
  name: string;
  zone: SchoolZone;
  order: number;
  unlockPriceBitAward: number;
  slots: SchoolSlotId[];
  idleAnim: SchoolAnim;
}

export interface SchoolSlot {
  roomId: SchoolRoomId;
  label: string;
  /** Position inside the room cell, as a fraction of its box. */
  x: number;
  y: number;
  scale: number;
}

export interface SchoolPalette {
  color: string;
  accent: string;
}

export interface SchoolItem {
  id: string;
  slot: SchoolSlotId;
  roomId: SchoolRoomId;
  name: string;
  priceBitWord: number;
  palette: SchoolPalette;
  /** 0 | 1 | 2 — which shape variant the slot's sprite renderer draws. */
  variant: number;
}

export interface SchoolAction {
  id: string;
  roomId: SchoolRoomId;
  name: string;
  priceBitPhrase: number;
  anim: SchoolAnim;
}

export const SCHOOL_ROOMS: SchoolRoom[] = [
  { id: "classroom", name: "Classroom", zone: "main", order: 0, unlockPriceBitAward: 0, slots: ["board","desks","teacherDesk"], idleAnim: "write" },
  { id: "library", name: "Library", zone: "main", order: 1, unlockPriceBitAward: 50, slots: ["shelves","nook","rug"], idleAnim: "read" },
  { id: "listening-lab", name: "Listening Lab", zone: "main", order: 2, unlockPriceBitAward: 90, slots: ["booth","speakers","labPoster"], idleAnim: "listen" },
  { id: "art-room", name: "Art Room", zone: "upper", order: 0, unlockPriceBitAward: 130, slots: ["easel","supplies","wallArt"], idleAnim: "paint" },
  { id: "cafeteria", name: "Cafeteria", zone: "upper", order: 1, unlockPriceBitAward: 170, slots: ["counter","cafeTables","cafePlants"], idleAnim: "sip" },
  { id: "theatre", name: "Theatre", zone: "upper", order: 2, unlockPriceBitAward: 300, slots: ["stage","seats","curtain"], idleAnim: "bow" },
  { id: "garden", name: "Garden", zone: "garden", order: 0, unlockPriceBitAward: 210, slots: ["tree","bench","flowers"], idleAnim: "stretch" },
];

export const SCHOOL_SLOTS: Record<SchoolSlotId, SchoolSlot> = {
  board: { roomId: "classroom", label: "Board", x: 0.24, y: 0.34, scale: 1 },
  desks: { roomId: "classroom", label: "Desks", x: 0.62, y: 0.66, scale: 1 },
  teacherDesk: { roomId: "classroom", label: "Teacher Desk", x: 0.26, y: 0.7, scale: 0.8 },
  shelves: { roomId: "library", label: "Shelves", x: 0.24, y: 0.44, scale: 1 },
  nook: { roomId: "library", label: "Reading Nook", x: 0.7, y: 0.64, scale: 1 },
  rug: { roomId: "library", label: "Rug", x: 0.46, y: 0.82, scale: 1 },
  booth: { roomId: "listening-lab", label: "Booth", x: 0.64, y: 0.6, scale: 1 },
  speakers: { roomId: "listening-lab", label: "Speakers", x: 0.22, y: 0.64, scale: 0.9 },
  labPoster: { roomId: "listening-lab", label: "Poster", x: 0.44, y: 0.3, scale: 0.9 },
  easel: { roomId: "art-room", label: "Easel", x: 0.3, y: 0.6, scale: 1 },
  supplies: { roomId: "art-room", label: "Supplies", x: 0.68, y: 0.72, scale: 0.9 },
  wallArt: { roomId: "art-room", label: "Wall Art", x: 0.58, y: 0.3, scale: 0.9 },
  counter: { roomId: "cafeteria", label: "Counter", x: 0.26, y: 0.62, scale: 1 },
  cafeTables: { roomId: "cafeteria", label: "Tables", x: 0.64, y: 0.72, scale: 1 },
  cafePlants: { roomId: "cafeteria", label: "Plants", x: 0.86, y: 0.58, scale: 0.85 },
  stage: { roomId: "theatre", label: "Stage", x: 0.5, y: 0.62, scale: 1 },
  seats: { roomId: "theatre", label: "Seats", x: 0.5, y: 0.86, scale: 1 },
  curtain: { roomId: "theatre", label: "Curtain", x: 0.5, y: 0.28, scale: 1 },
  tree: { roomId: "garden", label: "Tree", x: 0.18, y: 0.52, scale: 1 },
  bench: { roomId: "garden", label: "Bench", x: 0.52, y: 0.74, scale: 1 },
  flowers: { roomId: "garden", label: "Flowers", x: 0.82, y: 0.76, scale: 0.9 },
};

export const SCHOOL_ITEMS: SchoolItem[] = [
  { id: "board-slate", slot: "board", roomId: "classroom", name: "Slate Board", priceBitWord: 4, palette: { color: "#2f4f4a", accent: "#e8f1ee" }, variant: 0 },
  { id: "board-white", slot: "board", roomId: "classroom", name: "Whiteboard", priceBitWord: 8, palette: { color: "#f4f7fb", accent: "#5b7c9d" }, variant: 1 },
  { id: "board-star", slot: "board", roomId: "classroom", name: "Starmap Board", priceBitWord: 14, palette: { color: "#2b2f5e", accent: "#f6d365" }, variant: 2 },
  { id: "desks-plain", slot: "desks", roomId: "classroom", name: "Plain Desks", priceBitWord: 4, palette: { color: "#c9a173", accent: "#8a6a45" }, variant: 0 },
  { id: "desks-pastel", slot: "desks", roomId: "classroom", name: "Pastel Desks", priceBitWord: 8, palette: { color: "#f0c3c8", accent: "#c98d97" }, variant: 1 },
  { id: "desks-cloud", slot: "desks", roomId: "classroom", name: "Cloud Desks", priceBitWord: 14, palette: { color: "#dbe7f6", accent: "#93b3d6" }, variant: 2 },
  { id: "teacher-oak", slot: "teacherDesk", roomId: "classroom", name: "Oak Desk", priceBitWord: 4, palette: { color: "#b07f4d", accent: "#8a5f36" }, variant: 0 },
  { id: "teacher-ivory", slot: "teacherDesk", roomId: "classroom", name: "Ivory Desk", priceBitWord: 8, palette: { color: "#f2ece1", accent: "#c9bda6" }, variant: 1 },
  { id: "teacher-moon", slot: "teacherDesk", roomId: "classroom", name: "Moonwood Desk", priceBitWord: 14, palette: { color: "#8f8fc4", accent: "#5d5d93" }, variant: 2 },
  { id: "shelves-oak", slot: "shelves", roomId: "library", name: "Oak Shelves", priceBitWord: 4, palette: { color: "#a9793f", accent: "#7d5a35" }, variant: 0 },
  { id: "shelves-tall", slot: "shelves", roomId: "library", name: "Tall Shelves", priceBitWord: 8, palette: { color: "#8c6b4f", accent: "#5f4632" }, variant: 1 },
  { id: "shelves-spiral", slot: "shelves", roomId: "library", name: "Spiral Stacks", priceBitWord: 14, palette: { color: "#6b5b95", accent: "#eddcf7" }, variant: 2 },
  { id: "nook-cushion", slot: "nook", roomId: "library", name: "Cushion Nook", priceBitWord: 4, palette: { color: "#e5b7a1", accent: "#bd8a74" }, variant: 0 },
  { id: "nook-window", slot: "nook", roomId: "library", name: "Window Seat", priceBitWord: 8, palette: { color: "#bcd6c8", accent: "#87ab97" }, variant: 1 },
  { id: "nook-canopy", slot: "nook", roomId: "library", name: "Canopy Nook", priceBitWord: 14, palette: { color: "#d8c2f0", accent: "#9f81c9" }, variant: 2 },
  { id: "rug-round", slot: "rug", roomId: "library", name: "Round Rug", priceBitWord: 4, palette: { color: "#d9c4a3", accent: "#b39a76" }, variant: 0 },
  { id: "rug-star", slot: "rug", roomId: "library", name: "Star Rug", priceBitWord: 8, palette: { color: "#9db8d4", accent: "#f4e4b8" }, variant: 1 },
  { id: "rug-galaxy", slot: "rug", roomId: "library", name: "Galaxy Rug", priceBitWord: 14, palette: { color: "#3b3f78", accent: "#f6d365" }, variant: 2 },
  { id: "booth-basic", slot: "booth", roomId: "listening-lab", name: "Study Booth", priceBitWord: 4, palette: { color: "#cdd6de", accent: "#93a4b3" }, variant: 0 },
  { id: "booth-padded", slot: "booth", roomId: "listening-lab", name: "Padded Booth", priceBitWord: 8, palette: { color: "#b8c9bf", accent: "#7e9689" }, variant: 1 },
  { id: "booth-dream", slot: "booth", roomId: "listening-lab", name: "Dream Pod", priceBitWord: 14, palette: { color: "#c3b4ea", accent: "#7c69b8" }, variant: 2 },
  { id: "speakers-small", slot: "speakers", roomId: "listening-lab", name: "Desk Speakers", priceBitWord: 4, palette: { color: "#4a4a52", accent: "#8f939c" }, variant: 0 },
  { id: "speakers-tower", slot: "speakers", roomId: "listening-lab", name: "Tower Speakers", priceBitWord: 8, palette: { color: "#33333a", accent: "#d0a75f" }, variant: 1 },
  { id: "speakers-bloom", slot: "speakers", roomId: "listening-lab", name: "Bloom Speakers", priceBitWord: 14, palette: { color: "#e0b7d8", accent: "#8c5f88" }, variant: 2 },
  { id: "poster-waves", slot: "labPoster", roomId: "listening-lab", name: "Waveform Poster", priceBitWord: 4, palette: { color: "#f2efe6", accent: "#5b7c9d" }, variant: 0 },
  { id: "poster-owl", slot: "labPoster", roomId: "listening-lab", name: "Night Owl Poster", priceBitWord: 8, palette: { color: "#2d3a55", accent: "#f2c14e" }, variant: 1 },
  { id: "poster-aurora", slot: "labPoster", roomId: "listening-lab", name: "Aurora Poster", priceBitWord: 14, palette: { color: "#22405a", accent: "#7fe0c4" }, variant: 2 },
  { id: "easel-pine", slot: "easel", roomId: "art-room", name: "Pine Easel", priceBitWord: 4, palette: { color: "#caa477", accent: "#957247" }, variant: 0 },
  { id: "easel-splash", slot: "easel", roomId: "art-room", name: "Splash Easel", priceBitWord: 8, palette: { color: "#efe3d0", accent: "#e0705f" }, variant: 1 },
  { id: "easel-gilded", slot: "easel", roomId: "art-room", name: "Gilded Easel", priceBitWord: 14, palette: { color: "#d8b25f", accent: "#8a6a24" }, variant: 2 },
  { id: "supplies-jars", slot: "supplies", roomId: "art-room", name: "Paint Jars", priceBitWord: 4, palette: { color: "#dfd3c0", accent: "#9b8c74" }, variant: 0 },
  { id: "supplies-rack", slot: "supplies", roomId: "art-room", name: "Brush Rack", priceBitWord: 8, palette: { color: "#b5c9b0", accent: "#7c9377" }, variant: 1 },
  { id: "supplies-prism", slot: "supplies", roomId: "art-room", name: "Prism Set", priceBitWord: 14, palette: { color: "#cfd8ff", accent: "#7d8ad6" }, variant: 2 },
  { id: "art-sketch", slot: "wallArt", roomId: "art-room", name: "Sketch Frame", priceBitWord: 4, palette: { color: "#f4f1e8", accent: "#a89e88" }, variant: 0 },
  { id: "art-landscape", slot: "wallArt", roomId: "art-room", name: "Landscape", priceBitWord: 8, palette: { color: "#cfe2d2", accent: "#6f9c7d" }, variant: 1 },
  { id: "art-nebula", slot: "wallArt", roomId: "art-room", name: "Nebula Canvas", priceBitWord: 14, palette: { color: "#3a2f5e", accent: "#e59bd0" }, variant: 2 },
  { id: "counter-wood", slot: "counter", roomId: "cafeteria", name: "Wood Counter", priceBitWord: 4, palette: { color: "#bb8a5c", accent: "#8b6440" }, variant: 0 },
  { id: "counter-tile", slot: "counter", roomId: "cafeteria", name: "Tiled Counter", priceBitWord: 8, palette: { color: "#e6e9ec", accent: "#9aa7b1" }, variant: 1 },
  { id: "counter-honey", slot: "counter", roomId: "cafeteria", name: "Honey Bar", priceBitWord: 14, palette: { color: "#e8b96b", accent: "#a8763a" }, variant: 2 },
  { id: "tables-round", slot: "cafeTables", roomId: "cafeteria", name: "Round Tables", priceBitWord: 4, palette: { color: "#d6c5aa", accent: "#a89073" }, variant: 0 },
  { id: "tables-booth", slot: "cafeTables", roomId: "cafeteria", name: "Booth Seating", priceBitWord: 8, palette: { color: "#c2a0a8", accent: "#8f6f78" }, variant: 1 },
  { id: "tables-picnic", slot: "cafeTables", roomId: "cafeteria", name: "Picnic Tables", priceBitWord: 14, palette: { color: "#b7cfa6", accent: "#7f9a6f" }, variant: 2 },
  { id: "plants-pot", slot: "cafePlants", roomId: "cafeteria", name: "Potted Fern", priceBitWord: 4, palette: { color: "#7fa06a", accent: "#b4805a" }, variant: 0 },
  { id: "plants-hanging", slot: "cafePlants", roomId: "cafeteria", name: "Hanging Vines", priceBitWord: 8, palette: { color: "#6f9c6b", accent: "#c8b79a" }, variant: 1 },
  { id: "plants-bloom", slot: "cafePlants", roomId: "cafeteria", name: "Blooming Pots", priceBitWord: 14, palette: { color: "#8fbf7a", accent: "#ef9fbc" }, variant: 2 },
  { id: "stage-wood", slot: "stage", roomId: "theatre", name: "Wooden Stage", priceBitWord: 4, palette: { color: "#a9793f", accent: "#7a5527" }, variant: 0 },
  { id: "stage-marble", slot: "stage", roomId: "theatre", name: "Marble Stage", priceBitWord: 8, palette: { color: "#eae7e0", accent: "#b2aca0" }, variant: 1 },
  { id: "stage-starlit", slot: "stage", roomId: "theatre", name: "Starlit Stage", priceBitWord: 14, palette: { color: "#2f2a55", accent: "#f6d365" }, variant: 2 },
  { id: "seats-simple", slot: "seats", roomId: "theatre", name: "Simple Seats", priceBitWord: 4, palette: { color: "#8f6f78", accent: "#66505a" }, variant: 0 },
  { id: "seats-velvet", slot: "seats", roomId: "theatre", name: "Velvet Seats", priceBitWord: 8, palette: { color: "#8d3f52", accent: "#5d2637" }, variant: 1 },
  { id: "seats-cloud", slot: "seats", roomId: "theatre", name: "Cloud Seats", priceBitWord: 14, palette: { color: "#c8cfe8", accent: "#8f9ac0" }, variant: 2 },
  { id: "curtain-red", slot: "curtain", roomId: "theatre", name: "Red Curtain", priceBitWord: 4, palette: { color: "#a33a45", accent: "#6f242c" }, variant: 0 },
  { id: "curtain-teal", slot: "curtain", roomId: "theatre", name: "Teal Curtain", priceBitWord: 8, palette: { color: "#2f6f6a", accent: "#1e4b48" }, variant: 1 },
  { id: "curtain-aurora", slot: "curtain", roomId: "theatre", name: "Aurora Curtain", priceBitWord: 14, palette: { color: "#5b4a8f", accent: "#9fe0d2" }, variant: 2 },
  { id: "tree-young", slot: "tree", roomId: "garden", name: "Young Tree", priceBitWord: 4, palette: { color: "#7fa06a", accent: "#8a6a45" }, variant: 0 },
  { id: "tree-blossom", slot: "tree", roomId: "garden", name: "Blossom Tree", priceBitWord: 8, palette: { color: "#f0b7cb", accent: "#8a6a45" }, variant: 1 },
  { id: "tree-ancient", slot: "tree", roomId: "garden", name: "Ancient Oak", priceBitWord: 14, palette: { color: "#5f8a57", accent: "#6b5138" }, variant: 2 },
  { id: "bench-plain", slot: "bench", roomId: "garden", name: "Plain Bench", priceBitWord: 4, palette: { color: "#b58a5c", accent: "#8a6440" }, variant: 0 },
  { id: "bench-iron", slot: "bench", roomId: "garden", name: "Iron Bench", priceBitWord: 8, palette: { color: "#6b7280", accent: "#454b54" }, variant: 1 },
  { id: "bench-swing", slot: "bench", roomId: "garden", name: "Garden Swing", priceBitWord: 14, palette: { color: "#d8c2a8", accent: "#9c8466" }, variant: 2 },
  { id: "flowers-daisy", slot: "flowers", roomId: "garden", name: "Daisies", priceBitWord: 4, palette: { color: "#f4f1e0", accent: "#e9c46a" }, variant: 0 },
  { id: "flowers-tulip", slot: "flowers", roomId: "garden", name: "Tulips", priceBitWord: 8, palette: { color: "#e07a8f", accent: "#7fa06a" }, variant: 1 },
  { id: "flowers-moon", slot: "flowers", roomId: "garden", name: "Moonflowers", priceBitWord: 14, palette: { color: "#cdd4f5", accent: "#8f9ad8" }, variant: 2 },
];

export const SCHOOL_ACTIONS: SchoolAction[] = [
  { id: "act-cheer", roomId: "classroom", name: "Raise a hand", priceBitPhrase: 6, anim: "cheer" },
  { id: "act-ponder", roomId: "classroom", name: "Ponder", priceBitPhrase: 10, anim: "ponder" },
  { id: "act-browse", roomId: "library", name: "Browse shelves", priceBitPhrase: 8, anim: "browse" },
  { id: "act-nap", roomId: "library", name: "Cosy nap", priceBitPhrase: 12, anim: "nap" },
  { id: "act-dance", roomId: "listening-lab", name: "Headphone sway", priceBitPhrase: 8, anim: "dance" },
  { id: "act-note", roomId: "listening-lab", name: "Take notes", priceBitPhrase: 12, anim: "note" },
  { id: "act-brush", roomId: "art-room", name: "Broad strokes", priceBitPhrase: 8, anim: "brush" },
  { id: "act-admire", roomId: "art-room", name: "Step back", priceBitPhrase: 12, anim: "admire" },
  { id: "act-toast", roomId: "cafeteria", name: "Raise a cup", priceBitPhrase: 8, anim: "toast" },
  { id: "act-chat", roomId: "cafeteria", name: "Chatter", priceBitPhrase: 12, anim: "chat" },
  { id: "act-spin", roomId: "theatre", name: "Twirl", priceBitPhrase: 14, anim: "spin" },
  { id: "act-applause", roomId: "theatre", name: "Applause", priceBitPhrase: 18, anim: "applause" },
  { id: "act-water", roomId: "garden", name: "Water plants", priceBitPhrase: 8, anim: "water" },
  { id: "act-gaze", roomId: "garden", name: "Stargaze", priceBitPhrase: 16, anim: "gaze" },
];

const roomById = new Map(SCHOOL_ROOMS.map((r) => [r.id, r] as const));
const itemById = new Map(SCHOOL_ITEMS.map((i) => [i.id, i] as const));
const actionById = new Map(SCHOOL_ACTIONS.map((a) => [a.id, a] as const));

export const getSchoolRoom = (id: string): SchoolRoom | null => roomById.get(id as SchoolRoomId) ?? null;
export const getSchoolItem = (id: string): SchoolItem | null => itemById.get(id) ?? null;
export const getSchoolAction = (id: string): SchoolAction | null => actionById.get(id) ?? null;

export const getItemsBySlot = (slot: SchoolSlotId): SchoolItem[] =>
  SCHOOL_ITEMS.filter((i) => i.slot === slot);

export const getActionsByRoom = (roomId: SchoolRoomId): SchoolAction[] =>
  SCHOOL_ACTIONS.filter((a) => a.roomId === roomId);

export const getRoomsByZone = (zone: SchoolZone): SchoolRoom[] =>
  SCHOOL_ROOMS.filter((r) => r.zone === zone).sort((a, b) => a.order - b.order);

/** Key used by `placed` on both sides of the wire. */
export const placementKey = (roomId: string, slot: string) => `${roomId}:${slot}`;
