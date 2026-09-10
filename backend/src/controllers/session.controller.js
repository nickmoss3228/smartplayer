// controllers/session.controller.js
//
// The user-facing half of device management: see your own devices, sign one
// out, and free a slot when a login has been refused for hitting the cap.
//
// Everything here operates strictly on the caller's own account. There is no
// endpoint that names another user — the admin equivalent lives behind
// adminAuth in admin.controller.js.

import { User } from "../models/User.js";
import { pruneDeadSessions } from "../config/sessions.js";
import {
  publicDevice,
  readDeviceId,
  verifyDeviceTicket,
} from "../helpers/sessionStore.js";

// GET /api/sessions — the devices currently signed in to this account.
export async function listSessions(req, res) {
  const live = pruneDeadSessions(req.user.sessions);
  res.json({
    devices: live.map((session) => ({
      ...publicDevice(session),
      // So the UI can label one row "this device" and avoid inviting the user
      // to sign out the browser they are looking at.
      current: session.jti === req.session?.jti,
    })),
  });
}

// DELETE /api/sessions/:deviceId — sign out one of my own devices.
export async function revokeSession(req, res) {
  const { deviceId } = req.params;

  const result = await User.updateOne(
    { _id: req.user._id },
    { $pull: { sessions: { deviceId } } }
  );

  // 404 rather than a silent success: "sign out my old laptop" quietly doing
  // nothing is exactly the failure a user would never notice.
  if (result.modifiedCount === 0) {
    return res.status(404).json({ message: "No such device on this account." });
  }

  res.json({ ok: true, deviceId });
}

// POST /api/sessions/evict  { ticket, deviceId }
//
// The escape hatch from a 409 DEVICE_LIMIT_REACHED. Unauthenticated by
// definition — the caller was just refused a token — so authorization comes
// from the short-lived, single-purpose ticket issued alongside that 409.
export async function evictSession(req, res) {
  const { ticket, deviceId } = req.body ?? {};

  if (!ticket || !deviceId) {
    return res.status(400).json({ message: "Ticket and deviceId are required." });
  }

  const userId = verifyDeviceTicket(ticket);
  if (!userId) {
    // Covers expired, malformed, and wrong-purpose tickets alike. They are not
    // distinguished on purpose: the caller can do nothing differently about
    // any of them beyond signing in again, and the ticket is the only thing
    // standing between an anonymous request and someone else's session list.
    return res
      .status(401)
      .json({ message: "This request expired. Please sign in again.", code: "TICKET_INVALID" });
  }

  const user = await User.findById(userId).select("sessions banned");
  if (!user) return res.status(401).json({ message: "Invalid ticket" });
  // A ban landing between the 409 and this call must not be worked around by
  // finishing the flow that was already in progress.
  if (user.banned) {
    return res
      .status(403)
      .json({ message: "This account has been banned.", code: "ACCOUNT_BANNED" });
  }

  // Scoped to the ticket's own user, so a valid ticket can only ever drop a
  // device belonging to the account it was issued for.
  const result = await User.updateOne(
    { _id: userId },
    { $pull: { sessions: { deviceId } } }
  );

  if (result.modifiedCount === 0) {
    return res.status(404).json({ message: "No such device on this account." });
  }

  // The client retries the login it was refused; the freed slot is now
  // available to the device it is retrying from.
  res.json({ ok: true, deviceId, retry: true });
}

// POST /api/sessions/revoke-others — keep this device, sign out every other.
// The "someone has my password" panic button, and the one action a user can
// take on their own without waiting for an admin.
export async function revokeOtherSessions(req, res) {
  const keepDeviceId = req.session?.deviceId ?? readDeviceId(req);

  if (!keepDeviceId) {
    // Without knowing which device to keep this would sign the caller out too.
    // That is arguably fine, but it is not what the endpoint promises, and a
    // clear refusal beats a surprising logout.
    return res
      .status(400)
      .json({ message: "Could not identify the current device." });
  }

  await User.updateOne(
    { _id: req.user._id },
    { $pull: { sessions: { deviceId: { $ne: keepDeviceId } } } }
  );

  res.json({ ok: true, keptDeviceId: keepDeviceId });
}
