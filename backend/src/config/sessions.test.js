// config/sessions.test.js — `npm test` in backend/ (node --test, Node >= 22).
//
// Only the pure decision logic is covered here. That is the point of keeping
// config/sessions.js free of Mongoose and JWT: the rules that decide whether
// someone is locked out or flagged as a sharer are testable without a database,
// while the document-mutating half lives in helpers/sessionStore.js.

import test from "node:test";
import assert from "node:assert/strict";

import {
  CONCURRENT_WINDOW_MS,
  SESSION_TTL_MS,
  MAX_TRACKED_NETWORKS,
  ipPrefix,
  deviceLabel,
  pruneDeadSessions,
  recordNetwork,
  sharingScore,
} from "./sessions.js";

const NOW = Date.parse("2026-09-05T12:00:00Z");
const minutesAgo = (n) => new Date(NOW - n * 60 * 1000);

test("ipPrefix reduces IPv4 to a /24", () => {
  assert.equal(ipPrefix("203.0.113.44"), "203.0.113");
  assert.equal(ipPrefix("8.8.8.8"), "8.8.8");
});

test("ipPrefix buckets a v4-mapped v6 address with the plain v4 form", () => {
  // Node yields the mapped form whenever a v4 client hits a dual-stack socket.
  // If these two disagreed, one user would look like two networks and score as
  // a sharer purely because of the socket they landed on.
  assert.equal(ipPrefix("::ffff:203.0.113.4"), ipPrefix("203.0.113.4"));
});

test("ipPrefix reduces IPv6 to a normalised /48", () => {
  assert.equal(ipPrefix("2a02:6b8:c0e:500::1:23"), "2a02:06b8:0c0e");
  // Compressed and expanded spellings of one address must not become two
  // different networks.
  assert.equal(
    ipPrefix("2a02:06b8:0c0e:0500:0000:0000:0001:0023"),
    ipPrefix("2a02:6b8:c0e:500::1:23")
  );
  assert.equal(ipPrefix("fe80::1%eth0"), "fe80:0000:0000");
});

test("ipPrefix returns null for anything unparseable", () => {
  // Callers treat null as "unknown" and record nothing. If garbage parsed into
  // distinct values instead, a broken proxy header would read as a user
  // roaming across dozens of networks.
  for (const bad of ["", "junk", "300.1.1.1", "01.2.3.4", "1.2.3", "a::b::c", null, 42]) {
    assert.equal(ipPrefix(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

test("deviceLabel picks the most specific browser marker", () => {
  // Edge's UA contains both "Chrome" and "Safari"; Chrome's contains "Safari".
  // Naive ordering labels every Edge user "Chrome", which makes the device
  // picker useless for telling two of your own browsers apart.
  const edge =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 Edg/120";
  const chrome =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
  const safari =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

  assert.equal(deviceLabel(edge), "Edge on Windows");
  assert.equal(deviceLabel(chrome), "Chrome on Windows");
  // iOS is checked before macOS, which the iPhone UA also contains.
  assert.equal(deviceLabel(safari), "Safari on iOS");
  assert.equal(deviceLabel(undefined), "Unknown device");
});

test("pruneDeadSessions drops sessions past the TTL but keeps live ones", () => {
  const sessions = [
    { jti: "live", lastSeenAt: new Date(NOW - SESSION_TTL_MS + 60_000) },
    { jti: "dead", lastSeenAt: new Date(NOW - SESSION_TTL_MS - 60_000) },
  ];
  const kept = pruneDeadSessions(sessions, NOW).map((s) => s.jti);
  assert.deepEqual(kept, ["live"]);
});

test("pruneDeadSessions keeps an old device that is still in use", () => {
  // Keying on lastSeenAt rather than createdAt is what stops a user's daily
  // driver from being pruned just because they first signed in a year ago.
  const sessions = [
    {
      jti: "old-but-active",
      createdAt: new Date(NOW - 365 * 24 * 60 * 60 * 1000),
      lastSeenAt: minutesAgo(5),
    },
  ];
  assert.equal(pruneDeadSessions(sessions, NOW).length, 1);
});

test("recordNetwork increments a known network instead of duplicating it", () => {
  const first = recordNetwork([], "203.0.113", NOW);
  const second = recordNetwork(first, "203.0.113", NOW + 1000);
  assert.equal(second.length, 1);
  assert.equal(second[0].count, 2);
});

test("recordNetwork ignores an unknown prefix", () => {
  assert.deepEqual(recordNetwork([], null, NOW), []);
});

test("recordNetwork caps the history and evicts least-recently-seen", () => {
  let list = [];
  for (let i = 0; i < MAX_TRACKED_NETWORKS + 5; i += 1) {
    list = recordNetwork(list, `10.0.${i}`, NOW + i * 1000);
  }
  assert.equal(list.length, MAX_TRACKED_NETWORKS);
  // Newest first, and the oldest networks are gone.
  assert.equal(list[0].prefix, `10.0.${MAX_TRACKED_NETWORKS + 4}`);
  assert.ok(!list.some((entry) => entry.prefix === "10.0.0"));
});

test("recordNetwork does not mutate the array it was given", () => {
  // Callers assign the result onto a Mongoose document; an in-place edit of a
  // subdocument array is the classic way to leave the path unmarked and lose
  // the write silently.
  const original = recordNetwork([], "203.0.113", NOW);
  const snapshot = JSON.stringify(original);
  recordNetwork(original, "198.51.100", NOW + 1000);
  assert.equal(JSON.stringify(original), snapshot);
});

test("sharingScore reads zero for a school-lab user", () => {
  // The stated audience: twenty students behind ONE NAT egress IP. Each of
  // them sees a single prefix and one device. If this ever scores above zero,
  // the feature bans a classroom.
  const user = {
    sessions: [{ jti: "a", ipPrefix: "10.20.30", lastSeenAt: minutesAgo(2) }],
    loginSignals: { recentIpPrefixes: [{ prefix: "10.20.30" }], blockedLoginCount: 0 },
  };
  assert.equal(sharingScore(user, NOW).score, 0);
});

test("sharingScore stays low for one roaming user on mobile data", () => {
  // Carrier CGNAT rotates a subscriber's prefix constantly, so a single
  // legitimate person accumulates a long network history. Roaming alone is
  // capped well below anything that should draw attention.
  const user = {
    sessions: [{ jti: "a", ipPrefix: "10.20.30", lastSeenAt: minutesAgo(2) }],
    loginSignals: {
      recentIpPrefixes: Array.from({ length: 10 }, (_, i) => ({ prefix: `10.0.${i}` })),
      blockedLoginCount: 0,
    },
  };
  const result = sharingScore(user, NOW);
  assert.equal(result.distinctNetworks, 10);
  assert.ok(result.score <= 15, `roaming alone scored ${result.score}`);
});

test("sharingScore rises sharply for concurrent sessions on different networks", () => {
  // One person is only in one place. Two live sessions on two networks is the
  // signal the whole heuristic is built around.
  const user = {
    sessions: [
      { jti: "a", ipPrefix: "203.0.113", lastSeenAt: minutesAgo(2) },
      { jti: "b", ipPrefix: "198.51.100", lastSeenAt: minutesAgo(3) },
    ],
    loginSignals: { recentIpPrefixes: [], blockedLoginCount: 2 },
  };
  const result = sharingScore(user, NOW);
  assert.equal(result.activeNow, 2);
  assert.equal(result.concurrentNetworks, 2);
  assert.ok(result.score >= 50, `expected a strong signal, got ${result.score}`);
});

test("sharingScore ignores sessions that fell outside the concurrency window", () => {
  const user = {
    sessions: [
      { jti: "a", ipPrefix: "203.0.113", lastSeenAt: minutesAgo(2) },
      {
        jti: "b",
        ipPrefix: "198.51.100",
        lastSeenAt: new Date(NOW - CONCURRENT_WINDOW_MS - 60_000),
      },
    ],
    loginSignals: { recentIpPrefixes: [], blockedLoginCount: 0 },
  };
  const result = sharingScore(user, NOW);
  assert.equal(result.activeNow, 1);
  // Sequential use of two devices is ordinary and must not score.
  assert.equal(result.score, 0);
});

test("sharingScore treats a missing prefix as unknown, not as a network", () => {
  const user = {
    sessions: [
      { jti: "a", ipPrefix: null, lastSeenAt: minutesAgo(1) },
      { jti: "b", ipPrefix: null, lastSeenAt: minutesAgo(1) },
    ],
    loginSignals: { recentIpPrefixes: [], blockedLoginCount: 0 },
  };
  assert.equal(sharingScore(user, NOW).concurrentNetworks, 0);
  assert.equal(sharingScore(user, NOW).score, 0);
});

test("sharingScore tolerates a user document with no session fields at all", () => {
  // Every account predating this feature looks exactly like this.
  assert.equal(sharingScore({}, NOW).score, 0);
  assert.equal(sharingScore(undefined, NOW).score, 0);
});
