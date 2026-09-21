// config/sessions.js
//
// Everything the device-cap / session layer needs to make a decision, kept
// pure and side-effect-free so it can be unit-tested without a database (see
// sessions.test.js — `node --test`, no new dependencies).
//
// The problem this exists to solve: a JWT alone is a bearer token. Copy the
// string out of localStorage, paste it into another browser, and you are that
// user — forever, with no way for the server to say no. Binding each token to
// a session row on the User document is what turns "anyone holding this string
// is you" into "this string is one of at most MAX_DEVICES devices, and I can
// revoke any of them".

// Three devices covers the honest cases we actually expect: a phone, a home
// computer, and a school lab machine. A password shared around a friend group
// runs out of slots fast. Raising this is a one-line change; lowering it will
// lock out real users who already registered three devices, so prune first.
export const MAX_DEVICES = 3;

// Must stay >= the JWT's own expiry (7d, set in auth.controller.js). A session
// row that outlives its token is harmless clutter; one that dies BEFORE its
// token would sign a user out early for no reason.
export const SESSION_TTL_DAYS = 7;
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

// How stale lastSeenAt may get before authenticateToken refreshes it. This is
// the knob that keeps session tracking off the write path: at 10 minutes a
// continuously-active user costs ~6 writes/hour instead of one per request.
// The cost of it being coarse is only that "active now" in the admin panel and
// the concurrency signal below are accurate to within this window.
export const LAST_SEEN_THROTTLE_MS = 10 * 60 * 1000;

// Two sessions whose lastSeenAt both fall inside this window are treated as
// simultaneously in use. Deliberately wider than LAST_SEEN_THROTTLE_MS —
// narrower and a genuinely concurrent session could be missed purely because
// its throttled write hadn't landed yet.
export const CONCURRENT_WINDOW_MS = 15 * 60 * 1000;

// Rolling per-user history of which networks have signed in. Capped because it
// lives embedded in the User document: unbounded growth here would bloat every
// single authenticated request, which re-reads the whole document.
export const MAX_TRACKED_NETWORKS = 10;

// Sessions created before this layer shipped have no `jti` to match. Rejecting
// them outright would sign out the entire userbase on deploy, so
// middleware/auth.js accepts a jti-less token until this instant and adopts its
// device lazily. After it passes, the grace is gone for good — and since it is
// set to more than one full token lifetime out, by then no legacy token can
// still verify anyway. Self-clearing: no follow-up deploy needed to close it.
//
// Set this to (deploy date + 8 days) when releasing. It is a hardcoded literal
// rather than an env var on purpose: a grace window that can be quietly
// extended forever by editing an env file is not a grace window.
export const LEGACY_TOKEN_GRACE_UNTIL = Date.parse("2026-09-14T00:00:00Z");

/**
 * Reduce a client IP to the coarsest thing still useful as a "which network"
 * signal: a /24 for IPv4, a /48 for IPv6.
 *
 * Storing the full address would be a meaningful privacy cost for no analytic
 * gain — every question this feature asks is of the form "is this the same
 * network as last time", never "which exact machine". The prefix answers that
 * and is far less damaging to leak.
 *
 * Returns null on anything unparseable, and callers must treat null as
 * "unknown", never as a distinct network — otherwise a stream of malformed
 * values would read as a user roaming across many networks.
 */
export function ipPrefix(ip) {
  if (typeof ip !== "string" || !ip) return null;

  // Drop an IPv6 zone index ("fe80::1%eth0") before anything else.
  const addr = ip.trim().split("%")[0];
  if (!addr) return null;

  // Node hands back v4-mapped addresses ("::ffff:203.0.113.4") whenever a v4
  // client reaches a dual-stack socket. Those are IPv4 clients and must bucket
  // identically to the plain form, or the same user looks like two networks.
  const mappedV4 = addr.match(/(?:^|:)((?:\d{1,3}\.){3}\d{1,3})$/);
  if (mappedV4) return ipv4Prefix(mappedV4[1]);

  if (addr.includes(":")) return ipv6Prefix(addr);
  return ipv4Prefix(addr);
}

function ipv4Prefix(addr) {
  const octets = addr.split(".");
  if (octets.length !== 4) return null;
  for (const octet of octets) {
    // Reject "01" as well as "300": a permissive parse would let two spellings
    // of one address land in two different buckets.
    if (!/^\d{1,3}$/.test(octet)) return null;
    if (octet.length > 1 && octet[0] === "0") return null;
    if (Number(octet) > 255) return null;
  }
  return octets.slice(0, 3).join(".");
}

function ipv6Prefix(addr) {
  // "::" may appear at most once — that is the whole point of the shorthand.
  const halves = addr.split("::");
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];

  let groups;
  if (halves.length === 1) {
    // No compression: the address must be fully spelled out.
    if (head.length !== 8) return null;
    groups = head;
  } else {
    const fill = 8 - head.length - tail.length;
    if (fill < 1) return null; // "::" must stand for at least one zero group
    groups = [...head, ...Array(fill).fill("0"), ...tail];
  }

  // Validate every group, not just the three we keep: a malformed tail must
  // not be silently accepted because the first three hextets happened to parse.
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
  }
  return groups
    .slice(0, 3)
    .map((group) => group.toLowerCase().padStart(4, "0"))
    .join(":");
}

/**
 * A coarse, human-readable name for the device picker ("Chrome on Windows").
 *
 * Display only. It is never compared, matched, or trusted for identity — the
 * client-supplied deviceId is the only thing that decides which session slot a
 * login belongs to. This exists so that a user told to sign a device out can
 * tell their devices apart.
 */
export function deviceLabel(userAgent) {
  const ua = typeof userAgent === "string" ? userAgent : "";

  // Order is load-bearing. Edge's UA contains "Chrome" AND "Safari"; Chrome's
  // contains "Safari". Checking the most specific marker first is what keeps
  // every Edge user from being labelled Chrome.
  const browser =
    /\bEdg[A-Z]?\//.test(ua) ? "Edge"
    : /\bOPR\/|\bOpera\b/.test(ua) ? "Opera"
    : /\bYaBrowser\//.test(ua) ? "Yandex Browser"
    : /\bFirefox\//.test(ua) ? "Firefox"
    : /\bChrome\//.test(ua) ? "Chrome"
    : /\bSafari\//.test(ua) ? "Safari"
    : null;

  const os =
    /\bWindows NT\b/.test(ua) ? "Windows"
    : /\bAndroid\b/.test(ua) ? "Android"
    : /\b(iPhone|iPad|iPod)\b/.test(ua) ? "iOS"
    : /\bMac OS X\b/.test(ua) ? "macOS"
    : /\bLinux\b/.test(ua) ? "Linux"
    : null;

  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return os;
  return "Unknown device";
}

/**
 * Drop sessions whose token can no longer verify anyway.
 *
 * Called before every cap check, which is what stops a user from being locked
 * out by three devices they stopped using months ago. Keying on lastSeenAt
 * rather than createdAt means an actively-used device is never pruned, however
 * long ago it first signed in.
 */
export function pruneDeadSessions(sessions, now = Date.now()) {
  if (!Array.isArray(sessions)) return [];
  const cutoff = now - SESSION_TTL_MS;
  return sessions.filter((session) => {
    const lastSeen = new Date(session?.lastSeenAt ?? session?.createdAt ?? 0).getTime();
    return Number.isFinite(lastSeen) && lastSeen > cutoff;
  });
}

/**
 * Fold a network into the rolling history, newest-first, capped.
 *
 * Returns a NEW array rather than mutating — callers assign the result onto the
 * Mongoose document, and an in-place splice on a subdocument array is exactly
 * the kind of thing that fails to mark the path dirty.
 */
export function recordNetwork(existing, prefix, now = Date.now()) {
  const list = Array.isArray(existing)
    ? existing.map((entry) => ({
        prefix: entry.prefix,
        firstSeenAt: entry.firstSeenAt,
        lastSeenAt: entry.lastSeenAt,
        count: entry.count,
      }))
    : [];
  // Unknown network: record nothing rather than create a null bucket that
  // would then read as "a network" everywhere downstream.
  if (!prefix) return list;

  const at = new Date(now);
  const found = list.find((entry) => entry.prefix === prefix);
  if (found) {
    found.lastSeenAt = at;
    found.count = (found.count ?? 0) + 1;
  } else {
    list.push({ prefix, firstSeenAt: at, lastSeenAt: at, count: 1 });
  }

  // Newest activity first, then trim. Evicting the least-recently-seen network
  // means a user who has genuinely moved house eventually stops being scored
  // for the network they left.
  list.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
  return list.slice(0, MAX_TRACKED_NETWORKS);
}

/**
 * Heuristic 0-100 "this account looks shared" signal for the admin panel.
 *
 * READ THE WEIGHTING BEFORE CHANGING IT. This app's stated audience is school
 * computer labs (see the sizing note in middleware/rateLimit.js), where twenty
 * students sit behind ONE NAT egress IP. So "many users on one network" is the
 * normal case here and must score zero — each of those users sees a single
 * prefix of their own.
 *
 * The failure mode that actually bites runs the other way: mobile carrier
 * CGNAT rotates a subscriber's prefix constantly, so one entirely legitimate
 * person on their phone accumulates a long network history. That is why raw
 * distinctNetworks is the WEAKEST input, contributes nothing until it is
 * already implausible, and is capped low.
 *
 * The strong signal is concurrency: two sessions live at the same time on
 * different networks is hard to explain as one person, because one person is
 * only in one place.
 *
 * This never acts on its own — it ranks accounts for a human who then decides.
 * Treat it as "worth a look", not as proof.
 */
export function sharingScore(user, now = Date.now()) {
  const sessions = pruneDeadSessions(user?.sessions, now);
  const signals = user?.loginSignals ?? {};

  const activeSessions = sessions.filter((session) => {
    const lastSeen = new Date(session?.lastSeenAt ?? 0).getTime();
    return Number.isFinite(lastSeen) && now - lastSeen < CONCURRENT_WINDOW_MS;
  });

  // null prefixes are dropped, not counted: "unknown" is not a network.
  const concurrentNetworks = new Set(
    activeSessions.map((session) => session?.ipPrefix).filter(Boolean)
  ).size;

  const distinctNetworks = Array.isArray(signals.recentIpPrefixes)
    ? signals.recentIpPrefixes.length
    : 0;
  const blockedLogins = signals.blockedLoginCount ?? 0;

  // Simultaneous use from two or more different networks — the one input that
  // is genuinely hard to explain innocently.
  const concurrencyPoints = Math.max(0, concurrentNetworks - 1) * 35;
  // Repeatedly running into the device cap: someone keeps handing the password
  // to a new device.
  const blockedPoints = Math.min(blockedLogins, 4) * 10;
  // Roaming. Four networks is an ordinary week (home, phone, school, a cafe),
  // so nothing scores until past that, and the total is capped at 15 so this
  // can never on its own push an account into "looks shared".
  const roamingPoints = Math.min(Math.max(0, distinctNetworks - 4) * 3, 15);

  const score = Math.min(100, concurrencyPoints + blockedPoints + roamingPoints);

  return {
    score,
    distinctNetworks,
    activeNow: activeSessions.length,
    concurrentNetworks,
    blockedLogins,
  };
}
