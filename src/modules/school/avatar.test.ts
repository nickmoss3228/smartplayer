import { describe, expect, it } from "vitest";
import { SCHOOL_VARIANTS } from "../../config/schoolCatalog";
import { buildPlan } from "./props";
import { AVATAR_SPEED, keysToGround, newAvatar, stepAvatar } from "./avatar";
import { canStand, findPath, nearestStandable, walkGrid } from "./walkGrid";

// Four rooms: a corridor and somewhere to walk to off it.
const variant = SCHOOL_VARIANTS[0];
const plan = buildPlan(variant.rooms.slice(0, 4).map((r) => r.id), variant.id);
const g = walkGrid(plan);
const hub = plan.rooms.find((r) => r.id === "corridor") ?? plan.rooms[0];
const start = nearestStandable(g, { x: hub.x + hub.w / 2, z: hub.z + hub.d / 2 }, 6)!;

describe("walking the player's character", () => {
  it("follows a path to its end at walking pace, then stops", () => {
    const room = plan.rooms.find((r) => r.id !== hub.id)!;
    const goal = nearestStandable(g, { x: room.x + room.w / 2, z: room.z + room.d / 2 }, 5)!;
    const s = newAvatar(start);
    s.path = findPath(g, start, goal)!;
    s.target = goal;
    let t = 0;
    let travelled = 0;
    let last = { x: s.x, z: s.z };
    while ((s.path.length || s.target) && t < 120) {
      stepAvatar(s, g, 1 / 30);
      travelled += Math.hypot(s.x - last.x, s.z - last.z);
      last = { x: s.x, z: s.z };
      t += 1 / 30;
      expect(canStand(g, s)).toBe(true);
    }
    expect(s.x).toBeCloseTo(goal.x);
    expect(s.z).toBeCloseTo(goal.z);
    expect(s.target).toBeNull();
    expect(travelled / t).toBeLessThanOrEqual(AVATAR_SPEED + 1e-6);
    expect(stepAvatar(s, g, 1 / 30)).toBe(false);
  });

  it("never steps anywhere it cannot stand, however long a key is held", () => {
    for (const dir of [["up"], ["down"], ["left"], ["right"], ["up", "left"], ["down", "right"]]) {
      const s = newAvatar(start);
      s.keys = keysToGround(new Set(dir));
      for (let i = 0; i < 600; i++) {
        stepAvatar(s, g, 1 / 30);
        expect(canStand(g, s), `${dir.join("+")} at step ${i}`).toBe(true);
      }
    }
  });

  it("drops a path the moment a key is pressed", () => {
    const s = newAvatar(start);
    s.path = [{ x: start.x + 1, z: start.z }];
    s.target = s.path[0];
    s.keys = keysToGround(new Set(["up"]));
    stepAvatar(s, g, 1 / 30);
    expect(s.path).toEqual([]);
    expect(s.target).toBeNull();
  });

  it("maps screen directions onto the isometric ground", () => {
    // Up the screen is away from the camera, which sits at +x, +z.
    const up = keysToGround(new Set(["up"]));
    expect(up.x).toBeLessThan(0);
    expect(up.z).toBeLessThan(0);
    // Right is across the screen: +x and -z.
    const right = keysToGround(new Set(["right"]));
    expect(right.x).toBeGreaterThan(0);
    expect(right.z).toBeLessThan(0);
    expect(keysToGround(new Set(["up", "down"]))).toEqual({ x: 0, z: 0 });
  });
});
