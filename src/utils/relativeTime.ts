// utils/relativeTime.ts
//
// "3 minutes ago" / "2 days ago", in whatever language the UI is running in.
//
// Built on Intl.RelativeTimeFormat rather than a date library: it is already in
// every browser this app supports, it localises without any translation keys of
// our own, and this is the only place in the codebase that needs it.

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" }, // mean weeks per month
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

/**
 * Format a past timestamp relative to now.
 *
 * `locale` should be the active i18next language so this matches the rest of
 * the UI; falling back to the browser default would leave a Russian page
 * saying "5 minutes ago".
 *
 * Returns an empty string for a missing or unparseable date — callers render
 * it inline, and the word "Invalid Date" in a device list is worse than a gap.
 */
export const formatRelativeTime = (
  value: string | Date | null | undefined,
  locale?: string,
  now: number = Date.now()
): string => {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  // Signed, so a clock skew that puts the timestamp slightly in the future
  // reads as "in a moment" rather than a large negative age.
  let duration = (time - now) / 1000;

  for (const { amount, unit } of DIVISIONS) {
    if (Math.abs(duration) < amount) {
      return formatter.format(Math.round(duration), unit);
    }
    duration /= amount;
  }
  return "";
};
