// modules/school/schoolClock.ts
//
// School time. It runs fast: a whole school day, morning bell to lights out,
// goes by in eighteen real minutes, so a visit of any length shows the school
// changing — the light moving round, the bell, the building emptying in the
// evening, a caretaker doing the rounds at night, everybody back by morning.
//
// Daytime is the part worth watching, so it gets most of the cycle: from 07:00
// to 21:00 a school hour takes a real minute. The night, when almost nobody is
// in, is squeezed into the last four minutes.
//
// The clock is the same for everyone, anchored to real time rather than to when
// the page opened. Coming back later lands somewhere else in the day, and a
// visitor looking round your school sees the same hour you do.
//
// Only the time of DAY runs fast. The season still comes from the real
// calendar (atmosphere.ts): snow in January, not every eighteen minutes.

import { useEffect, useState } from "react";

/** 07:00 → 21:00, one real minute per school hour. */
export const DAY_MS = 14 * 60_000;
/** 21:00 → 07:00. */
export const NIGHT_MS = 4 * 60_000;
export const CYCLE_MS = DAY_MS + NIGHT_MS;

export type DayPart = "morning" | "lessons" | "afterSchool" | "evening" | "night";

export interface SchoolTime {
  /** 0–24, fractional. */
  hours: number;
  hour: number;
  minute: number;
  part: DayPart;
}

/** Which part of the day an hour falls in. */
export function partAt(hours: number): DayPart {
  const h = ((hours % 24) + 24) % 24;
  if (h >= 7 && h < 8) return "morning";
  if (h >= 8 && h < 16) return "lessons";
  if (h >= 16 && h < 19) return "afterSchool";
  if (h >= 19 && h < 21) return "evening";
  return "night";
}

export const isNight = (part: DayPart) => part === "night";

function timeFromHours(hours: number): SchoolTime {
  const h = ((hours % 24) + 24) % 24;
  // Minutes are floored and hours taken from them, so 06:59.99 never rounds up
  // to a "07:60".
  const total = Math.floor(h * 60);
  return { hours: h, hour: Math.floor(total / 60), minute: total % 60, part: partAt(h) };
}

/** School time at a real moment. */
export function schoolTimeAt(ms: number): SchoolTime {
  const t = ((ms % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  const hours = t < DAY_MS ? 7 + (t / DAY_MS) * 14 : 21 + ((t - DAY_MS) / NIGHT_MS) * 10;
  return timeFromHours(hours);
}

/**
 * A fixed school time from the address bar — `?clock=21:30` — in development
 * only, so a screenshot or a test can look at the night without waiting for it.
 * Null in a production build, whatever the URL says.
 */
export function clockOverride(search: string = typeof location === "undefined" ? "" : location.search): number | null {
  if (!import.meta.env.DEV) return null;
  const raw = new URLSearchParams(search).get("clock");
  const m = raw?.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h + min / 60;
}

const OVERRIDE = clockOverride();

/** School time now. Cheap enough to call every frame. */
export function schoolNow(): SchoolTime {
  return OVERRIDE !== null ? timeFromHours(OVERRIDE) : schoolTimeAt(Date.now());
}

/** "08:05". */
export const formatSchoolTime = (t: Pick<SchoolTime, "hour" | "minute">) =>
  `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;

/**
 * School time for React, ticking once a real second — which is a school
 * minute by day, so the clock face visibly moves.
 */
export function useSchoolClock(tickMs = 1000): SchoolTime {
  const [time, setTime] = useState(schoolNow);
  useEffect(() => {
    const id = window.setInterval(() => setTime(schoolNow()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return time;
}

/**
 * Only the part of the day, for anything that should change a few times a
 * cycle rather than every second: who is in the building, which music plays.
 */
export function useDayPart(): DayPart {
  const [part, setPart] = useState<DayPart>(() => schoolNow().part);
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = schoolNow().part;
      setPart((p) => (p === next ? p : next));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  return part;
}
