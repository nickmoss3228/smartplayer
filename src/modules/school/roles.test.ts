import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT_ID, SCHOOL_VARIANTS, getVariant } from "../../config/schoolCatalog";
import { buildPlan, castFor, peoplePlan } from "./props";
import { PersonRole } from "./bubbles";

const full = SCHOOL_VARIANTS.map((v) => {
  const plan = buildPlan(getVariant(v.id).rooms.map((r) => r.id), v.id);
  return { id: v.id, plan, cast: peoplePlan(plan, DEFAULT_LAYOUT_ID) };
});

/** Everybody in a cast, with their role. */
const roles = (cast: ReturnType<typeof peoplePlan>) =>
  new Map<string, PersonRole>([
    ...cast.students.map((s) => [s.key, s.role] as const),
    ...cast.teachers.map((s) => [s.key, s.role] as const),
    ...cast.wanderers.map((s) => [s.key, s.role] as const),
    ...cast.commuters.map((s) => [s.key, s.role] as const),
    ...cast.roomLoops.map((s) => [s.key, s.role] as const),
  ]);

describe("who is who in a finished school", () => {
  it("has the head, the staff, the coach and the rest each in their own part", () => {
    for (const { id, cast } of full) {
      const who = roles(cast);
      const find = (pred: (key: string) => boolean) => [...who].filter(([key]) => pred(key)).map(([, r]) => r);
      expect(find((k) => k.endsWith("-head")), id).toEqual(["head"]);
      expect(new Set(find((k) => k.startsWith("staffRoom-t"))), id).toEqual(new Set(["staff"]));
      expect(find((k) => k.endsWith("-coach")), id).toEqual(["coach"]);
      expect(find((k) => k === "hall-rehearse"), id).toEqual(["performer"]);
      expect(find((k) => k === "t1"), id).toEqual(["director"]);
      expect(new Set(find((k) => k.startsWith("musicRoom-"))), id).toEqual(new Set(["musician"]));
      expect(new Set(find((k) => /^w\d+$/.test(k))), id).toEqual(new Set(["walker"]));
      expect(new Set(find((k) => /^library-r\d+$/.test(k))), id).toEqual(new Set(["reader"]));
      expect(find((k) => k.endsWith("-shelver")).every((r) => r === "librarian"), id).toBe(true);
    }
  });

  it("leaves only the caretaker in at night, so only he says anything", () => {
    for (const { id, plan, cast } of full) {
      const night = castFor(plan, cast, "night");
      const roles = [
        ...night.students,
        ...night.teachers,
        ...night.wanderers,
        ...night.commuters,
        ...night.roomLoops,
      ].map((p) => p.role);
      expect(roles, id).toEqual(["caretaker"]);
    }
  });
});
