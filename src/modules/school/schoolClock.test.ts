import { describe, expect, it } from "vitest";
import { CYCLE_MS, DAY_MS, NIGHT_MS, clockOverride, formatSchoolTime, partAt, schoolTimeAt } from "./schoolClock";

describe("school time", () => {
  it("runs a whole day in eighteen minutes, most of it in daylight", () => {
    expect(CYCLE_MS).toBe(18 * 60_000);
    expect(DAY_MS).toBeGreaterThan(3 * NIGHT_MS);
    const start = schoolTimeAt(0);
    expect(start.hour).toBe(7);
    expect(start.minute).toBe(0);
    // A school hour is a real minute by day.
    expect(schoolTimeAt(60_000).hour).toBe(8);
    expect(schoolTimeAt(DAY_MS).hour).toBe(21);
    // ...and the night goes by in the last four.
    expect(schoolTimeAt(DAY_MS + NIGHT_MS / 2).hour).toBe(2);
    expect(schoolTimeAt(CYCLE_MS).hour).toBe(7);
  });

  it("only ever moves forward within a cycle", () => {
    let last = -1;
    for (let ms = 0; ms < CYCLE_MS; ms += 997) {
      const t = schoolTimeAt(ms);
      // Past midnight the hours wrap; unwrap them so the check is monotonic.
      const unwrapped = t.hours < 7 ? t.hours + 24 : t.hours;
      expect(unwrapped).toBeGreaterThanOrEqual(last);
      last = unwrapped;
      expect(t.minute).toBeGreaterThanOrEqual(0);
      expect(t.minute).toBeLessThan(60);
    }
  });

  it("splits the day into its parts", () => {
    expect(partAt(7.5)).toBe("morning");
    expect(partAt(8)).toBe("lessons");
    expect(partAt(15.99)).toBe("lessons");
    expect(partAt(16)).toBe("afterSchool");
    expect(partAt(19)).toBe("evening");
    expect(partAt(21)).toBe("night");
    expect(partAt(3)).toBe("night");
    expect(partAt(6.99)).toBe("night");
    // Every part turns up in a real cycle, in order.
    const seen: string[] = [];
    for (let ms = 0; ms < CYCLE_MS; ms += 1000) {
      const p = schoolTimeAt(ms).part;
      if (seen[seen.length - 1] !== p) seen.push(p);
    }
    expect(seen).toEqual(["morning", "lessons", "afterSchool", "evening", "night"]);
  });

  it("formats like a clock", () => {
    expect(formatSchoolTime({ hour: 8, minute: 5 })).toBe("08:05");
    expect(formatSchoolTime(schoolTimeAt(DAY_MS - 1))).toBe("20:59");
  });

  it("can be pinned from the address bar in development", () => {
    expect(clockOverride("?clock=21:30")).toBe(21.5);
    expect(clockOverride("?clock=7:00")).toBe(7);
    expect(clockOverride("?clock=25:00")).toBeNull();
    expect(clockOverride("?clock=noon")).toBeNull();
    expect(clockOverride("")).toBeNull();
  });
});
