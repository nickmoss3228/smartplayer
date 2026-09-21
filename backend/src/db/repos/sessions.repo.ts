// db/repos/sessions.repo.ts
//
// Live sessions — one row per signed-in device, capped at MAX_DEVICES. This is
// what makes a JWT revocable: authenticateToken requires the token's `jti` to
// still be here, so deleting a row kills that token instantly even though it
// remains cryptographically valid.
//
// ── What changed from the Mongo version ────────────────────────────────────
//
// sessions[] was an embedded array with `_id: false`, and every mutation
// rewrote the whole array. helpers/sessionStore.js carries a long comment about
// why: editing a Mongoose subdocument in place and reassigning the filtered
// array to the same path can silently fail to mark the path dirty, the write
// vanishes, and the user is left holding a token with no session row — signed
// out, with no error anywhere. That entire hazard is gone here. A row is a row.
//
// The `sessions.$.lastSeenAt` positional update in middleware/auth.js becomes
// an ordinary single-row UPDATE keyed by jti.

import { and, asc, eq, lt, ne, sql } from "drizzle-orm";

import { MAX_DEVICES, SESSION_TTL_MS } from "../../config/sessions.js";
import { db } from "../client.js";
import { newId } from "../ids.js";
import { userSession } from "../schema.js";
import type { Tx } from "../client.js";
import type { UserSession } from "../schema.js";

/** The shape the device picker and the /api/sessions endpoints render. */
export interface PublicDevice {
  deviceId: string;
  label: string;
  lastSeenAt: Date;
  createdAt: Date;
}

/** Never leaks `jti` — that IS the token. */
export function publicDevice(row: UserSession): PublicDevice {
  return {
    deviceId: row.deviceId,
    label: row.deviceLabel ?? "Unknown device",
    lastSeenAt: row.lastSeenAt,
    createdAt: row.createdAt,
  };
}

/**
 * Sessions that still count against the device cap.
 *
 * A session whose token has already expired cannot be used by anyone, so it
 * must not occupy a slot — otherwise a user is locked out by three devices they
 * abandoned months ago. In Mongo this was pruneDeadSessions() filtering an
 * array in memory on every read; here it is a WHERE clause, so dead rows never
 * leave the database in the first place.
 */
export async function liveSessions(
  userId: string,
  now = Date.now(),
  tx: Tx = db(),
): Promise<UserSession[]> {
  return tx
    .select()
    .from(userSession)
    .where(
      and(
        eq(userSession.userId, userId),
        sql`${userSession.lastSeenAt} > ${new Date(now - SESSION_TTL_MS)}`,
      ),
    )
    .orderBy(asc(userSession.lastSeenAt));
}

/**
 * Physically remove sessions that have aged out.
 *
 * Mongo only ever dropped dead rows as a side effect of a login rewriting the
 * array, so they accumulated on documents belonging to users who never came
 * back. Called at login here, and cheap enough to call from a sweep later.
 */
export async function pruneExpired(userId: string, now = Date.now(), tx: Tx = db()): Promise<number> {
  const result = await tx
    .delete(userSession)
    .where(
      and(eq(userSession.userId, userId), lt(userSession.lastSeenAt, new Date(now - SESSION_TTL_MS))),
    );
  return result.rowCount ?? 0;
}

export interface AttachInput {
  userId: string;
  jti: string;
  deviceId: string | null;
  deviceLabel: string | null;
  ipPrefix: string | null;
}

export type AttachResult =
  | { ok: true; session: UserSession }
  | { ok: false; atCapacity: true; devices: PublicDevice[] };

/**
 * Register this request's device, or report that every slot is taken.
 *
 * Must be called inside a transaction: the capacity check and the insert have
 * to be one atomic step, or two simultaneous logins on two new devices both
 * see two live sessions, both decide there is room, and the account ends up
 * with four. The Mongo version had exactly that race and lived with it.
 *
 * Rotating the jti for a device that is already signed in is deliberate: it
 * invalidates whatever token that device last held, so signing in again on a
 * device you are already signed in on leaves exactly one working token.
 */
export async function attach(
  input: AttachInput,
  now = Date.now(),
  tx: Tx = db(),
): Promise<AttachResult> {
  await pruneExpired(input.userId, now, tx);

  // A client that sends no deviceId (an old build) can never match an existing
  // row, so it always takes a fresh slot — wasteful but correct, and it
  // self-corrects once that client updates.
  const deviceId = input.deviceId ?? `legacy:${input.jti}`;

  const live = await liveSessions(input.userId, now, tx);
  const existing = live.find((row) => row.deviceId === deviceId);

  if (!existing && live.length >= MAX_DEVICES) {
    return { ok: false, atCapacity: true, devices: live.map(publicDevice) };
  }

  // ON CONFLICT on (user_id, device_id) is what makes "reuse this device's
  // slot" a single statement instead of a branch. The unique index is doing
  // the work that a find-then-mutate did before.
  const [session] = await tx
    .insert(userSession)
    .values({
      id: newId(),
      userId: input.userId,
      jti: input.jti,
      deviceId,
      deviceLabel: input.deviceLabel,
      ipPrefix: input.ipPrefix,
      createdAt: new Date(now),
      lastSeenAt: new Date(now),
    })
    .onConflictDoUpdate({
      target: [userSession.userId, userSession.deviceId],
      set: {
        jti: input.jti,
        deviceLabel: input.deviceLabel,
        ipPrefix: input.ipPrefix,
        lastSeenAt: new Date(now),
      },
    })
    .returning();

  if (!session) throw new Error("[sessions] attach inserted no row");
  return { ok: true, session };
}

/**
 * Bump lastSeenAt, on a throttle the caller decides.
 *
 * Fire-and-forget at the call site: this is bookkeeping for the admin panel's
 * "active now", and a failed bump must never fail the request it rode in on.
 */
export async function touch(jti: string, now = Date.now(), tx: Tx = db()): Promise<void> {
  await tx.update(userSession).set({ lastSeenAt: new Date(now) }).where(eq(userSession.jti, jti));
}

/**
 * Sign out one device.
 *
 * Returns the number of rows removed, because every caller branches on it —
 * `session.controller.js` answers 404 when nothing matched, which is how the
 * UI tells "already signed out" from "that is not your device".
 */
export async function removeByDeviceId(
  userId: string,
  deviceId: string,
  tx: Tx = db(),
): Promise<number> {
  const result = await tx
    .delete(userSession)
    .where(and(eq(userSession.userId, userId), eq(userSession.deviceId, deviceId)));
  return result.rowCount ?? 0;
}

/** Sign out the current device. Used by logout. */
export async function removeByJti(jti: string, tx: Tx = db()): Promise<number> {
  const result = await tx.delete(userSession).where(eq(userSession.jti, jti));
  return result.rowCount ?? 0;
}

/**
 * Sign out every device except one — the "free a slot" action behind the
 * device-limit 409, and the admin panel's "log out everywhere".
 *
 * Was `$pull: { sessions: { deviceId: { $ne: keep } } }`.
 */
export async function removeAllExcept(
  userId: string,
  keepDeviceId: string,
  tx: Tx = db(),
): Promise<number> {
  const result = await tx
    .delete(userSession)
    .where(and(eq(userSession.userId, userId), ne(userSession.deviceId, keepDeviceId)));
  return result.rowCount ?? 0;
}

/** Sign out everywhere. Admin action; also what a ban should do. */
export async function removeAll(userId: string, tx: Tx = db()): Promise<number> {
  const result = await tx.delete(userSession).where(eq(userSession.userId, userId));
  return result.rowCount ?? 0;
}
