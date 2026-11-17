import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceStreak, dayBefore, liveStreak, moscowDay } from "./moscowDay.js";

test("moscowDay rolls over at Moscow midnight, not UTC midnight", () => {
  // 21:30 UTC on the 16th is 00:30 on the 17th in Moscow (UTC+3).
  assert.equal(moscowDay(new Date("2026-11-16T21:30:00Z")), "2026-11-17");
  // 20:59 UTC is still the 16th in Moscow.
  assert.equal(moscowDay(new Date("2026-11-16T20:59:00Z")), "2026-11-16");
});

test("dayBefore crosses month and year boundaries", () => {
  assert.equal(dayBefore("2026-03-01"), "2026-02-28");
  assert.equal(dayBefore("2027-01-01"), "2026-12-31");
});

test("advanceStreak: same day keeps, next day adds, a gap restarts", () => {
  const at = new Date("2026-11-17T10:00:00Z");
  assert.deepEqual(advanceStreak({ current: 4, longest: 6, lastSubmittedDate: "2026-11-17" }, at), {
    current: 4,
    longest: 6,
    lastSubmittedDate: "2026-11-17",
  });
  assert.deepEqual(advanceStreak({ current: 4, longest: 4, lastSubmittedDate: "2026-11-16" }, at), {
    current: 5,
    longest: 5,
    lastSubmittedDate: "2026-11-17",
  });
  assert.deepEqual(advanceStreak({ current: 4, longest: 9, lastSubmittedDate: "2026-11-10" }, at), {
    current: 1,
    longest: 9,
    lastSubmittedDate: "2026-11-17",
  });
  assert.equal(advanceStreak({}, at).current, 1);
});

test("an 01:00 and a 22:00 Moscow session on consecutive days extend the streak", () => {
  // 01:00 MSK on the 17th = 22:00 UTC on the 16th.
  const first = advanceStreak({ current: 0, longest: 0, lastSubmittedDate: null }, new Date("2026-11-16T22:00:00Z"));
  // 22:00 MSK on the 18th = 19:00 UTC on the 18th.
  const second = advanceStreak(first, new Date("2026-11-18T19:00:00Z"));
  assert.equal(first.lastSubmittedDate, "2026-11-17");
  assert.equal(second.current, 2);
});

test("liveStreak reports 0 once a day has been missed", () => {
  const at = new Date("2026-11-17T10:00:00Z");
  assert.equal(liveStreak(5, "2026-11-17", at), 5);
  assert.equal(liveStreak(5, "2026-11-16", at), 5);
  assert.equal(liveStreak(5, "2026-11-15", at), 0);
  assert.equal(liveStreak(0, "2026-11-17", at), 0);
  assert.equal(liveStreak(5, null, at), 0);
});
