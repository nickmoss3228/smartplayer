import { describe, expect, it } from "vitest";
import { SCHOOL_VARIANTS } from "../../config/schoolCatalog";
import { Rect, groundsPlan } from "./groundsLayout";
import { walkerAt } from "./props";
import {
  BALL_R,
  PLAY_FLOOR,
  SLIDE,
  SLIDE_CYCLE,
  TAG_SPEED,
  footballFrame,
  kitObstacles,
  largestOpen,
  playCast,
  playersOf,
  slideAt,
} from "./playLayout";

const plots = SCHOOL_VARIANTS.map((v) => ({ id: v.id, grounds: groundsPlan(v.id) }));
const inside = (r: Rect, x: number, z: number, margin = 0) =>
  x >= r.x0 + margin && x <= r.x1 - margin && z >= r.z0 + margin && z <= r.z1 - margin;
const clearOf = (r: Rect, x: number, z: number, margin: number) =>
  x < r.x0 - margin || x > r.x1 + margin || z < r.z0 - margin || z > r.z1 + margin;

describe("the grounds before and after school", () => {
  it("has a game on every pitch and children on every playground, each with their own name", () => {
    for (const { id, grounds } of plots) {
      const play = playCast(grounds);
      const hasPitch = grounds.features.some((f) => f.kind === "pitch");
      const hasPlayground = grounds.features.some((f) => f.kind === "playground");
      expect(Boolean(play.pitch), id).toBe(hasPitch);
      expect(Boolean(play.playground), id).toBe(hasPlayground);
      if (play.pitch) {
        expect([4, 6], id).toContain(play.pitch.players.length);
        expect(play.pitch.keepers.length, id).toBe(2);
      }
      const keys = playersOf(play).map((p) => p.key);
      expect(new Set(keys).size, id).toBe(keys.length);
    }
  });

  it("keeps every footballer on the pitch, out of the goals, and apart from everybody else", () => {
    const problems: string[] = [];
    for (const { id, grounds } of plots) {
      const game = playCast(grounds).pitch;
      if (!game) continue;
      const r = game.rect;
      const long = game.alongX ? r.x1 - r.x0 : r.z1 - r.z0;
      const along = (x: number, z: number) =>
        game.alongX ? Math.abs(x - (r.x0 + r.x1) / 2) : Math.abs(z - (r.z0 + r.z1) / 2);
      for (let t = 0; t < 400; t += 0.05) {
        const f = footballFrame(game, t);
        for (const p of f.players) {
          if (!inside(r, p.x, p.z, 0.6)) problems.push(`${id} t=${t.toFixed(2)}: player off the pitch`);
          // The goal mouths are the last metre at each end; outfield players
          // stay two clear of it, where the keepers are.
          if (along(p.x, p.z) > long / 2 - 2) problems.push(`${id} t=${t.toFixed(2)}: player in a goal`);
          if (p.speed > 3.2) problems.push(`${id} t=${t.toFixed(2)}: sprinting at ${p.speed.toFixed(1)}`);
        }
        const all = [...f.players, ...f.keepers];
        for (let i = 0; i < all.length; i++) {
          for (let j = i + 1; j < all.length; j++) {
            const d = Math.hypot(all[i].x - all[j].x, all[i].z - all[j].z);
            if (d < 0.9) problems.push(`${id} t=${t.toFixed(2)}: ${i} and ${j} ${d.toFixed(2)} apart`);
          }
        }
        if (!inside(r, f.ball.x, f.ball.z)) problems.push(`${id} t=${t.toFixed(2)}: ball out`);
        if (f.ball.y < BALL_R - 1e-9) problems.push(`${id} t=${t.toFixed(2)}: ball in the ground`);
      }
    }
    expect(problems.slice(0, 10)).toEqual([]);
  });

  it("moves the ball smoothly from one player to the next, never jumping", () => {
    const problems: string[] = [];
    for (const { id, grounds } of plots) {
      const game = playCast(grounds).pitch;
      if (!game) continue;
      let last = footballFrame(game, 0).ball;
      for (let t = 0.02; t < 200; t += 0.02) {
        const b = footballFrame(game, t).ball;
        // Twenty metres a second is a hard kick; anything more is a teleport.
        const d = Math.hypot(b.x - last.x, b.y - last.y, b.z - last.z);
        if (d > 0.4) problems.push(`${id} t=${t.toFixed(2)}: ball jumped ${d.toFixed(2)}`);
        last = b;
      }
    }
    expect(problems.slice(0, 10)).toEqual([]);
  });

  it("gives the playground's equipment room of its own, and tag room clear of it", () => {
    const problems: string[] = [];
    for (const { id, grounds } of plots) {
      const pg = playCast(grounds).playground;
      if (!pg) continue;
      const area = grounds.features.find((f) => f.kind === "playground")!.rect;
      const obstacles = kitObstacles(pg.kit);
      for (const o of obstacles) {
        if (!inside(area, o.x0, o.z0) || !inside(area, o.x1, o.z1)) problems.push(`${id}: equipment outside the playground`);
      }
      for (let i = 0; i < obstacles.length; i++) {
        for (let j = i + 1; j < obstacles.length; j++) {
          const a = obstacles[i];
          const b = obstacles[j];
          if (a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1) problems.push(`${id}: equipment ${i} and ${j} overlap`);
        }
      }
      if (pg.tag) {
        const loop = pg.tag.loop;
        let lap = 0;
        for (let i = 0; i < loop.length; i++) {
          lap += Math.hypot(loop[(i + 1) % loop.length].x - loop[i].x, loop[(i + 1) % loop.length].z - loop[i].z);
        }
        for (let t = 0; t < lap / TAG_SPEED; t += 0.05) {
          const s = walkerAt(loop, t, TAG_SPEED, 0);
          if (!inside(area, s.x, s.z, 0.3)) problems.push(`${id}: tag leaves the playground`);
          for (const o of obstacles) {
            if (!clearOf(o, s.x, s.z, 0.3)) problems.push(`${id}: tag runs into the equipment`);
          }
        }
      }
      const { sandpit } = pg.kit;
      if (pg.digger && !inside({ x0: sandpit.x - sandpit.w / 2, x1: sandpit.x + sandpit.w / 2, z0: sandpit.z - sandpit.d / 2, z1: sandpit.z + sandpit.d / 2 }, sandpit.x - 0.5, sandpit.z, 0.3)) {
        problems.push(`${id}: the digger is not in the sandpit`);
      }
    }
    expect(problems.slice(0, 10)).toEqual([]);
  });

  it("goes down the slide, round, up the back and down again, without leaving the playground", () => {
    const poses: string[] = [];
    const problems: string[] = [];
    let last = slideAt(0);
    for (let t = 0; t < SLIDE_CYCLE * 2; t += 0.02) {
      const s = slideAt(t);
      if (poses[poses.length - 1] !== s.pose) poses.push(s.pose);
      // Standing on the ground, on the deck, or somewhere up the ladder in between.
      if (s.pose !== "slide" && (s.y < PLAY_FLOOR - 1e-9 || s.y > SLIDE.deck + 1e-9)) problems.push(`t=${t.toFixed(2)}: y ${s.y}`);
      // Nothing but the drop onto the chute moves them further than a stride.
      const d = Math.hypot(s.x - last.x, s.z - last.z);
      if (d > 0.5) problems.push(`t=${t.toFixed(2)}: jumped ${d.toFixed(2)} (${last.pose} → ${s.pose})`);
      last = s;
    }
    expect(problems).toEqual([]);
    expect(poses.slice(0, 7)).toEqual(["slide", "stand", "walk", "climb", "walk", "stand", "slide"]);

    // Every step of it inside the playground, on every campus that has one.
    for (const { id, grounds } of plots) {
      const pg = playCast(grounds).playground;
      if (!pg) continue;
      const area = grounds.features.find((f) => f.kind === "playground")!.rect;
      for (let t = 0; t < SLIDE_CYCLE; t += 0.05) {
        const s = slideAt(t);
        if (!inside(area, pg.kit.slide.x + s.x, pg.kit.slide.z + s.z, 0.2)) problems.push(`${id}: slide child outside`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("finds the biggest open ground round an obstacle", () => {
    const area = { x0: 0, z0: 0, x1: 10, z1: 10 };
    const open = largestOpen(area, [{ x0: 0, x1: 10, z0: 0, z1: 4 }], 0.25)!;
    expect(open.z0).toBeGreaterThanOrEqual(4.25);
    expect(open.x1 - open.x0).toBeGreaterThan(9);
    expect(largestOpen(area, [area], 0)).toBeNull();
  });
});
