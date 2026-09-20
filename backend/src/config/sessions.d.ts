// Type declarations for config/sessions.js.
//
// A BRIDGE, not a second source of truth. sessions.js stays plain JavaScript
// because the frontend's Vitest suite imports files in this directory directly
// by path (src/config/catalogMirror.test.ts and friends), and converting them
// to .ts would break those imports for no benefit.
//
// This file exists so the TypeScript data layer under src/db can use the same
// constants instead of copying them. Keep it in step with sessions.js by hand —
// there is nothing enforcing that, which is the cost of the bridge.
//
// Only the exports the data layer actually consumes are declared. Add more as
// they are needed rather than mirroring the whole module speculatively.

/** How many devices may hold a live session at once. */
export const MAX_DEVICES: number;

export const SESSION_TTL_DAYS: number;
/** A session unseen for longer than this no longer occupies a device slot. */
export const SESSION_TTL_MS: number;

/** How stale `lastSeenAt` may get before a request bothers to bump it. */
export const LAST_SEEN_THROTTLE_MS: number;

export const CONCURRENT_WINDOW_MS: number;

/** Cap on the rolling `recentIpPrefixes` list. */
export const MAX_TRACKED_NETWORKS: number;

/** Tokens minted before the session layer shipped are refused after this. */
export const LEGACY_TOKEN_GRACE_UNTIL: number;

export interface SessionRow {
  jti: string;
  deviceId: string;
  deviceLabel: string | null;
  ipPrefix: string | null;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface NetworkRow {
  prefix: string;
  firstSeenAt: Date | string;
  lastSeenAt: Date | string;
  count: number;
}

/** /24 for IPv4, /48 for IPv6. Never a full address. */
export function ipPrefix(ip: string | undefined | null): string | null;

/** Human-readable device name derived from a User-Agent, for the picker. */
export function deviceLabel(userAgent: string | undefined | null): string | null;

export function pruneDeadSessions<T extends { lastSeenAt?: Date | string }>(
  sessions: readonly T[] | undefined | null,
  now?: number,
): T[];

export function recordNetwork(
  existing: readonly NetworkRow[] | undefined | null,
  prefix: string | null,
  now?: number,
): NetworkRow[];

export function sharingScore(user: unknown, now?: number): unknown;
