// helpers/moscowDay.js
//
// The calendar day a study streak counts in.
//
// Streaks used to roll over at midnight UTC, which is 03:00 in Moscow. A
// student who studied at 01:00 and again at 22:00 the next evening had both
// sessions on one UTC date, and two evening sessions on consecutive Moscow days
// could land on non-consecutive UTC dates and reset the streak. The audience
// lives on Moscow time, so that is the day that counts.
//
// Dates are "YYYY-MM-DD" strings, the format users.streak_last_submitted_date
// already holds.

const MOSCOW = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Moscow calendar date of `at`, as "YYYY-MM-DD". */
export function moscowDay(at = new Date()) {
  return MOSCOW.format(at);
}

/** The day before a "YYYY-MM-DD" date. Pure calendar arithmetic, no time zone. */
export function dayBefore(day) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * The streak as it stands NOW, not as it was last written.
 *
 * The stored count only changes when a quiz is passed, so a student who stopped
 * three days ago still has their old count in the row. A streak is alive only
 * if the last counted day is today or yesterday.
 */
export function liveStreak(current, lastSubmittedDate, at = new Date()) {
  if (!current || !lastSubmittedDate) return 0;
  const today = moscowDay(at);
  return lastSubmittedDate === today || lastSubmittedDate === dayBefore(today) ? current : 0;
}

/**
 * The streak after a pass on `at`: unchanged if today already counted, one more
 * if the last counted day was yesterday, otherwise a fresh streak of 1.
 */
export function advanceStreak({ current = 0, longest = 0, lastSubmittedDate = null }, at = new Date()) {
  const today = moscowDay(at);
  let next;
  if (lastSubmittedDate === today) next = current || 1;
  else if (lastSubmittedDate === dayBefore(today)) next = (current ?? 0) + 1;
  else next = 1;
  return { current: next, longest: Math.max(longest ?? 0, next), lastSubmittedDate: today };
}
