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
