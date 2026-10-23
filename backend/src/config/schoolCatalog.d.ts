// Type declarations for config/schoolCatalog.js — see sessions.d.ts for why
// these bridge files exist rather than converting the config to TypeScript.
//
// Only the defaults the data layer needs when inserting a new user. The
// catalog arrays themselves stay untyped here; nothing in src/db reads them.

/** SCHOOL_LAYOUTS[0].id — the layout a new account starts on. */
export const DEFAULT_LAYOUT_ID: string;
/** SCHOOL_WALLPAPERS[0].id */
export const DEFAULT_WALLPAPER_ID: string;
/** SCHOOL_FLOORS[0].id */
export const DEFAULT_FLOOR_ID: string;
/** SCHOOL_VARIANTS[0].id — overwritten per user, derived from their id. */
export const DEFAULT_VARIANT_ID: string;

/** 0. The level floor for accounts migrated off the old ten-stage economy. */
export const STARTER_STAGE: number;
export const MAX_STAGE: number;

/** Which campus shape a player gets — a stable hash of their id. */
export function variantForUserId(userId: string): string;

/** The rooms a brand-new player already has on a given campus variant. */
export function starterRoomIds(variantId: string): string[];

// ── The rest of the catalog ─────────────────────────────────────────────────
// Declared loosely: the frontend mirror test (src/config/schoolCatalog.test.ts)
// imports these to compare the two catalogs field by field, and without a
// declaration `npm run typecheck:test` rejected every one of them. The shapes
// are the frontend's own types, restated minimally; the mirror test is what
// holds the VALUES together.

type Currency = "bitAward" | "bitWord" | "bitPhrase";
interface Rect { x: number; z: number; w: number; d: number }
interface RoomSpec {
  id: string;
  kind: string;
  currency: Currency;
  price: number;
  starter: boolean;
  rect: Rect;
  grows: { when: string[]; rect: Rect }[];
  outdoor: boolean;
  bundledWith: string | null;
}
interface SchoolVariant {
  id: string;
  name: string;
  rooms: RoomSpec[];
  doors: Record<string, { parent: string | null; x: number; z: number }>;
}

export const SCHOOL_STAGES: Record<string, unknown>[];
export const SCHOOL_LAYOUTS: { id: string; name: string; unlocksAtStage: number }[];
export const SCHOOL_WALLPAPERS: { id: string; unlocksAtStage: number }[];
export const SCHOOL_FLOORS: { id: string; unlocksAtStage: number }[];
export const SCHOOL_VARIANTS: SchoolVariant[];
export const LEGACY_STAGE_ROOMS: string[][];
export const PAYROLL_MAX_WEEKS: number;

export function levelFor(ownedIds: readonly string[], levelFloor?: number): number;
export function moraleFor(weeks: number): number;
export function weeklyWage(teachers: number, roomCount: number): number;
export function payrollDue(teachers: number, roomCount: number, weeks: number): number;
export function roomsOwned(variantId: string, ownedIds: readonly string[]): (Rect & { id: string; kind: string; outdoor?: boolean })[];
export function buyBlocker(variantId: string, ownedIds: readonly string[], roomId: string): string | null;
export function bundledRooms(variantId: string, roomId: string): string[];
export function withBundles(variantId: string, ownedIds: readonly string[]): string[];

export const EXTERIOR_SLOTS: string[];
export const EXTERIOR_STYLES: { id: string; slot: string; currency: Currency; price: number }[];
export const DEFAULT_EXTERIOR: Record<string, string>;
export const SCHOOL_NAME_MAX: number;
export function getExteriorStyle(id: string): { id: string; slot: string; currency: Currency; price: number } | null;
export function canWearStyle(owned: readonly string[], slot: string, id: string): boolean;
export function cleanSchoolName(raw: unknown): string | null;
