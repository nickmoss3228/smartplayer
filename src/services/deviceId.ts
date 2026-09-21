// services/deviceId.ts
//
// A stable per-browser identifier, sent as X-Device-Id on every request so the
// backend can tell "this is the same browser signing in again" from "this is a
// fourth device" (see backend config/sessions.js).
//
// Deliberately a random UUID rather than a browser fingerprint. Fingerprinting
// would be more tamper-resistant, but it is user-hostile, breaks whenever a
// browser updates, and would silently consume a device slot every time it
// shifted. A random id is honest about what it is: this deters passing a
// password around between people, it is not a defence against someone who
// wants to defeat their own account's device cap.
//
// NOT cleared on sign-out (see clearLocalSession in AuthContext): it describes
// the browser, not the session. Wiping it would hand the same browser a new
// identity on every logout, so a single shared computer would burn through
// every device slot on the account.

const DEVICE_ID_KEY = "device:id";

// Memoised for the life of the page. Load-bearing for the fallback paths
// below: without it, a browser that cannot reach localStorage would mint a
// fresh id on every single call, so every request would look like a different
// device and the account would hit the cap immediately.
let cached: string | null = null;

const mintId = (): string =>
  // randomUUID needs a secure context. Every environment this ships to is
  // https or localhost, but the fallback keeps a non-secure origin (someone
  // testing the dev server over a LAN IP) working rather than throwing.
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Set on the very first call and stable for the life of this browser profile. */
export const getDeviceId = (): string => {
  if (cached) return cached;

  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      cached = existing;
      return cached;
    }
    const id = mintId();
    localStorage.setItem(DEVICE_ID_KEY, id);
    cached = id;
    return id;
  } catch {
    // Private-mode Safari and similar can throw on localStorage access. An
    // id that lasts only as long as the tab degrades gracefully: the user
    // consumes a device slot per browsing session rather than being unable to
    // sign in at all.
    cached = mintId();
    return cached;
  }
};
