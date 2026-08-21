// Generates src/config/schoolCatalog.ts FROM backend/src/config/schoolCatalog.js
// so the two can never drift by hand. Re-run after editing the backend catalog.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Resolve relative to THIS file, not process.cwd(), so the script works from
// any directory (and from an npm script, whose cwd is the package root).
const here = dirname(fileURLToPath(import.meta.url));
import * as c from "../backend/src/config/schoolCatalog.js";

const j = (v) => JSON.stringify(v);
const rooms = c.SCHOOL_ROOMS.map(
  (r) => `  { id: ${j(r.id)}, name: ${j(r.name)}, zone: ${j(r.zone)}, order: ${r.order}, unlockPriceBitAward: ${r.unlockPriceBitAward}, slots: ${j(r.slots)}, idleAnim: ${j(r.idleAnim)} },`,
).join("\n");

const slots = Object.entries(c.SCHOOL_SLOTS)
  .map(([k, s]) => `  ${k}: { roomId: ${j(s.roomId)}, label: ${j(s.label)}, x: ${s.x}, y: ${s.y}, scale: ${s.scale} },`)
  .join("\n");

const items = c.SCHOOL_ITEMS.map(
  (i) => `  { id: ${j(i.id)}, slot: ${j(i.slot)}, roomId: ${j(i.roomId)}, name: ${j(i.name)}, priceBitWord: ${i.priceBitWord}, palette: { color: ${j(i.palette.color)}, accent: ${j(i.palette.accent)} }, variant: ${i.variant} },`,
).join("\n");

const actions = c.SCHOOL_ACTIONS.map(
  (a) => `  { id: ${j(a.id)}, roomId: ${j(a.roomId)}, name: ${j(a.name)}, priceBitPhrase: ${a.priceBitPhrase}, anim: ${j(a.anim)} },`,
).join("\n");

const slotIds = Object.keys(c.SCHOOL_SLOTS).map(j).join(" | ");
const roomIds = c.SCHOOL_ROOMS.map((r) => j(r.id)).join(" | ");
const anims = [...new Set([...c.SCHOOL_ROOMS.map(r => r.idleAnim), ...c.SCHOOL_ACTIONS.map(a => a.anim)])].map(j).join(" | ");

const out = `// config/schoolCatalog.ts
//
// GENERATED from backend/src/config/schoolCatalog.js — do not hand-edit. Run
// \`node _gen.mjs\` at the repo root after changing the backend catalog.
//
// The backend is the source of truth for every price; this mirror exists so the
// dollhouse can render names, prices and palettes without a round-trip. The
// server re-reads its own copy on each purchase, so a tampered client can only
// ever get a 400 back.

export type SchoolRoomId = ${roomIds};
export type SchoolSlotId = ${slotIds};
export type SchoolZone = "upper" | "main" | "garden";
export type SchoolAnim = ${anims};

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
${rooms}
];

export const SCHOOL_SLOTS: Record<SchoolSlotId, SchoolSlot> = {
${slots}
};

export const SCHOOL_ITEMS: SchoolItem[] = [
${items}
];

export const SCHOOL_ACTIONS: SchoolAction[] = [
${actions}
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

/** Key used by \`placed\` on both sides of the wire. */
export const placementKey = (roomId: string, slot: string) => \`\${roomId}:\${slot}\`;
`;

writeFileSync(join(here, "..", "src", "config", "schoolCatalog.ts"), out);
console.log(`generated src/config/schoolCatalog.ts — ${c.SCHOOL_ROOMS.length} rooms, ${Object.keys(c.SCHOOL_SLOTS).length} slots, ${c.SCHOOL_ITEMS.length} items, ${c.SCHOOL_ACTIONS.length} actions`);
