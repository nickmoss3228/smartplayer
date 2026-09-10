// helpers/sessionStore.js
//
// The document-mutating half of the session layer. All the decision logic is
// pure and lives in config/sessions.js; this file is the part that touches a
// Mongoose document and mints JWTs, and is kept separate so the interesting
// rules stay unit-testable without a database.

import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import {
  MAX_DEVICES,
  deviceLabel,
  ipPrefix,
  pruneDeadSessions,
  recordNetwork,
} from "../config/sessions.js";

// Access tokens keep the 7-day life they always had. Shortening them to force
// faster revocation would be pointless work here: authenticateToken re-reads
// the user document on every request anyway, so pulling a session row already
// kills the token on its very next call. Refresh tokens would add a moving
// part and buy nothing.
const TOKEN_TTL = "7d";

// The one-shot token handed back with a 409 DEVICE_LIMIT_REACHED so the user
// can free a slot. Short by design: it exists for the seconds between "you
// have too many devices" and "I picked one to sign out".
const DEVICE_TICKET_TTL = "5m";
const DEVICE_TICKET_PURPOSE = "device_select";

/** The device this request claims to come from. Absent on old clients. */
export function readDeviceId(req) {
  const raw = req.get("X-Device-Id");
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  // Bounded to keep a hostile client from writing arbitrarily large strings
  // into a document that is re-read on every authenticated request.
  if (!trimmed || trimmed.length > 100) return null;
  return trimmed;
}

/** Everything about the caller the session layer records, in one place. */
export function describeRequest(req) {
  return {
    deviceId: readDeviceId(req),
    deviceLabel: deviceLabel(req.get("User-Agent")),
    ipPrefix: ipPrefix(req.ip),
  };
}

/** Shape a session row for the client. Never leaks jti — that IS the token. */
export function publicDevice(session) {
  return {
    deviceId: session.deviceId,
    label: session.deviceLabel ?? "Unknown device",
    lastSeenAt: session.lastSeenAt,
    createdAt: session.createdAt,
  };
}

/**
 * Register this request's device on the user and return a token bound to it.
 *
 * Returns { token } on success, or { atCapacity: true, devices } when the
 * device is new and every slot is taken. The caller decides what to do with
 * that — auth.controller.js turns it into a 409.
 *
 * Does NOT save. The caller saves, so a single login is one write.
 */
export function attachSession(user, req, { now = Date.now() } = {}) {
  const { deviceId, deviceLabel: label, ipPrefix: prefix } = describeRequest(req);

  // Sessions whose token has already expired can't be used by anyone, so they
  // must not occupy a slot. Doing this first is what stops a user being locked
  // out by three devices they abandoned months ago.
  //
  // Flattened to plain objects before anything is mutated. The rows come back
  // as Mongoose subdocuments, and editing one in place and then reassigning
  // the filtered array to the same path is the kind of thing that quietly
  // fails to mark the path dirty — the write vanishes and the user is left
  // holding a token with no session row, i.e. signed out. Plain objects are
  // cast cleanly on assignment.
  const live = pruneDeadSessions(user.sessions, now).map((session) => ({
    jti: session.jti,
    deviceId: session.deviceId,
    deviceLabel: session.deviceLabel,
    ipPrefix: session.ipPrefix,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
  }));

  // Match on deviceId, not jti: signing in again in the same browser has to
  // reuse that browser's slot rather than burn a second one. A client that
  // sends no deviceId (an old build) can never match, so it always takes a
  // fresh slot — correct, if slightly wasteful, and it self-corrects once the
  // client updates.
  const existing = deviceId ? live.find((session) => session.deviceId === deviceId) : null;

  if (!existing && live.length >= MAX_DEVICES) {
    user.sessions = live;
    user.loginSignals ??= {};
    user.loginSignals.blockedLoginCount = (user.loginSignals.blockedLoginCount ?? 0) + 1;
    user.loginSignals.lastBlockedAt = new Date(now);
    return { atCapacity: true, devices: live.map(publicDevice) };
  }

  const jti = crypto.randomUUID();

  if (existing) {
    // Rotating the jti here is deliberate: it invalidates whatever token this
    // device was last issued. Signing in on a device you are already signed in
    // on should leave exactly one working token, not two.
    existing.jti = jti;
    existing.deviceLabel = label;
    existing.ipPrefix = prefix;
    existing.lastSeenAt = new Date(now);
    user.sessions = live;
  } else {
    user.sessions = [
      ...live,
      {
        jti,
        // A client with no deviceId still gets a stable row to be revoked by.
        deviceId: deviceId ?? `legacy:${jti}`,
        deviceLabel: label,
        ipPrefix: prefix,
        createdAt: new Date(now),
        lastSeenAt: new Date(now),
      },
    ];
  }

  user.loginSignals ??= {};
  user.loginSignals.recentIpPrefixes = recordNetwork(
    user.loginSignals.recentIpPrefixes,
    prefix,
    now
  );

  return { token: signAccessToken(user._id, jti), jti };
}

export function signAccessToken(userId, jti) {
  return jwt.sign({ userId, jti }, config.jwtSecret, { expiresIn: TOKEN_TTL });
}

/**
 * Authorization for the device picker shown at the 409.
 *
 * At that moment the user has proved their password but holds no session
 * token, so freeing a slot needs SOMETHING to authorize it — and re-prompting
 * for the password they just typed would be absurd. This ticket is scoped to
 * exactly one action and lasts five minutes.
 */
export function signDeviceTicket(userId) {
  return jwt.sign({ userId, purpose: DEVICE_TICKET_PURPOSE }, config.jwtSecret, {
    expiresIn: DEVICE_TICKET_TTL,
  });
}

/**
 * Verify a device ticket, returning its userId or null.
 *
 * The `purpose` check is the load-bearing line. Both token types are signed
 * with the same secret, so without it a ticket would verify as an access token
 * in authenticateToken and vice versa — turning a five-minute, one-action
 * credential into a full session. authenticateToken performs the mirror check
 * and refuses any token carrying a purpose.
 */
export function verifyDeviceTicket(ticket) {
  try {
    const decoded = jwt.verify(ticket, config.jwtSecret);
    if (decoded?.purpose !== DEVICE_TICKET_PURPOSE) return null;
    return decoded.userId ?? null;
  } catch {
    return null;
  }
}

export { DEVICE_TICKET_PURPOSE };
