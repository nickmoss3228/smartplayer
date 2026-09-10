import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { config } from "../config/env.js";
import {
  LAST_SEEN_THROTTLE_MS,
  LEGACY_TOKEN_GRACE_UNTIL,
  pruneDeadSessions,
} from "../config/sessions.js";

/**
 * Resolves a Bearer token to a user + session, or an explicit refusal.
 *
 * Extracted so authenticateToken and optionalAuth cannot drift. That is not
 * tidiness: optionalAuth guards PAID content, so if it skipped the ban check
 * or the session-revocation check below, a banned or signed-out user would
 * keep their purchases working on exactly the endpoint that matters. One copy
 * of the rules, two ways of reacting to them.
 *
 * @returns {{ok: true, user, session}|{ok: false, status: number, body: object}}
 */
async function resolveBearer(req) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return { ok: false, status: 401, body: { message: "Token required" } };
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    // Device tickets (helpers/sessionStore.js) are signed with this same
    // secret, so without this check one would verify here and a scoped,
    // five-minute, one-action credential would become a full session. Any
    // token carrying a `purpose` belongs to some other flow, not this one.
    if (decoded?.purpose) {
      return {
        ok: false,
        status: 401,
        body: { message: "Invalid token", code: "INVALID_TOKEN" },
      };
    }

    const user = await User.findById(decoded.userId).select("-password");

    // `code` is what the frontend interceptor (services/apiClient.ts) branches
    // on to tell "you've been suspended" apart from "your session expired" —
    // materially different information, since a banned user who sees the
    // generic message will just keep retrying a login that also 403s.
    if (!user) {
      return {
        ok: false,
        status: 401,
        body: { message: "Invalid token", code: "INVALID_TOKEN" },
      };
    }
    if (user.banned) {
      return {
        ok: false,
        status: 403,
        body: { message: "This account has been banned.", code: "ACCOUNT_BANNED" },
      };
    }

    const now = Date.now();
    const session = decoded.jti
      ? pruneDeadSessions(user.sessions, now).find((row) => row.jti === decoded.jti)
      : null;

    if (decoded.jti && !session) {
      // The token is cryptographically valid but its session row is gone —
      // signed out, evicted to make room for another device, or revoked by an
      // admin. This is the line that makes a JWT revocable at all, and the
      // distinct code lets the frontend say "you were signed out on this
      // device" instead of the misleading "your session expired".
      return {
        ok: false,
        status: 401,
        body: { message: "This session was signed out.", code: "SESSION_REVOKED" },
      };
    }

    if (!decoded.jti) {
      // A token minted before the session layer shipped. It carries no jti, so
      // there is nothing to match and no way to bind it to a device after the
      // fact — we cannot rewrite a token the client already holds. So it is
      // simply allowed through, unbound, until the grace window closes; the
      // user's next login mints a proper session-bound token.
      //
      // The window is set past one full token lifetime, so by the time it
      // closes every legacy token has expired on its own anyway. This branch
      // is what stops the deploy from signing out the entire userbase at once.
      if (now >= LEGACY_TOKEN_GRACE_UNTIL) {
        return {
          ok: false,
          status: 401,
          body: { message: "Please sign in again.", code: "SESSION_REVOKED" },
        };
      }
    }

    // Keep lastSeenAt fresh enough for the admin panel's "active now" and the
    // concurrency signal, without turning every authenticated request into a
    // write. Fire-and-forget: this is bookkeeping, and a failed bump must
    // never fail the request it was riding on.
    if (session) {
      const lastSeen = new Date(session.lastSeenAt ?? 0).getTime();
      if (!Number.isFinite(lastSeen) || now - lastSeen > LAST_SEEN_THROTTLE_MS) {
        User.updateOne(
          { _id: user._id, "sessions.jti": decoded.jti },
          { $set: { "sessions.$.lastSeenAt": new Date(now) } }
        ).catch((error) => console.error("Session lastSeenAt bump failed:", error));
      }
    }

    return { ok: true, user, session: session ?? null };
  } catch (error) {
    console.error("Token error:", error);
    // 401, not 403: a malformed or expired JWT is "you are not authenticated",
    // which leaves 403 to mean "authenticated but not allowed" (i.e. banned).
    // Safe to change because the interceptor treats both statuses identically.
    return {
      ok: false,
      status: 401,
      body: { message: "Invalid token", code: "INVALID_TOKEN" },
    };
  }
}

export async function authenticateToken(req, res, next) {
  const result = await resolveBearer(req);
  if (!result.ok) return res.status(result.status).json(result.body);

  req.user = result.user;
  // Which device this request came from. logout pulls exactly this row, and
  // the /api/sessions endpoints use it to mark "this device" in the list.
  req.session = result.session;
  next();
}

/**
 * Same verification, opposite reaction: a bad or absent token makes the
 * request ANONYMOUS instead of rejected.
 *
 * For endpoints that must serve guests and members from one URL — the story
 * catalogue and the story itself. Those pages are open to visitors by design,
 * but how much of a story comes back depends on who is asking, so the handler
 * needs the user when there is one and must not 401 when there is not.
 *
 * Downstream handlers MUST therefore treat `req.user` as possibly null. They
 * decide access through config/entitlements.js, which takes `authenticated` as
 * an explicit argument for exactly this reason.
 */
export async function optionalAuth(req, res, next) {
  const result = await resolveBearer(req);
  req.user = result.ok ? result.user : null;
  req.session = result.ok ? result.session : null;
  next();
}
