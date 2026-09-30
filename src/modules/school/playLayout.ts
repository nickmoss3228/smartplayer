// modules/school/playLayout.ts
//
// Before and after school the grounds get used: a kickabout on the pitch, and
// the swings, the slide, the sandpit and a game of tag on the playground.
//
// Everything here is a pure function of the plot and the clock, like
// `walkerAt` in props.ts: where the equipment stands, who is playing, and
// where each of them is at any moment. Nobody integrates velocities frame by
// frame, so nothing drifts, and a test can sample a whole game and check that
// nobody runs into a goal, a swing or anybody else.
//
// Where the equipment stands lives here too, not only in Grounds.tsx which
// draws it — a child on a swing has to be on the swing that is drawn.

import type { GroundFeature, GroundsPlan, Rect } from "./groundsLayout";
import type { PersonRole } from "./bubbles";
import type { Spot } from "./props";

// ── The playground's equipment ─────────────────────────────────────────────

/** Where the swings, the slide and the sandpit stand, in world space. */
export interface PlaygroundKit {
  /** The swing frame: its centre on the ground, and each seat's offset along
   *  the top bar (x). Seats swing along z. */
  swings: { x: number; z: number; seats: number[] };
  /** The slide's platform, centred on the ground. The chute runs toward +z. */
  slide: { x: number; z: number };
  sandpit: { x: number; z: number; w: number; d: number };
}

export function playgroundKit(f: GroundFeature): PlaygroundKit {
  const { x0, z0, x1, z1 } = f.rect;
  return {
    swings: { x: x0 + 2.4, z: z0 + 2, seats: [-0.6, 0.6] },
    slide: { x: x1 - 2.2, z: z0 + 2.2 },
    sandpit: { x: (x0 + x1) / 2, z: z1 - 1.8, w: 2.6, d: 2 },
  };
}

/** The swing's pivot: just under the top bar, which is 2.05–2.17 up. */
export const SWING_PIVOT_Y = 2.08;
/** From the pivot down to the top of the seat. */
export const SWING_DROP = 1.47;
/** How far a swing goes each way, and how fast: a pendulum 1.5m long. */
const SWING_MAX = 0.55;
const SWING_RATE = 2.5;

/** The swing's angle at a moment. Positive tips the seat toward −z. */
export const swingAngle = (t: number, phase: number) => SWING_MAX * Math.sin(SWING_RATE * t + phase);

/** The slide, in the frame Grounds.tsx draws it in: origin at the platform's
 *  centre, at the level of the land (GROUND_Y), the chute down toward +z. */
export const SLIDE = {
  /** Top of the platform. */
  deck: 1.5,
  /** The chute's slope, and the top and bottom ends of its sliding surface. */
  angle: 0.72,
  top: { y: 1.54, z: 0.67 },
  bottom: { y: -0.04, z: 2.48 },
} as const;

/** The playground's surface, above the land it is laid on. */
export const PLAY_FLOOR = 0.03;

/** Every piece of equipment as a box the players keep out of, with the space
 *  it sweeps: the swings' seats and the children on them go a long way back
 *  and forth. */
export function kitObstacles(kit: PlaygroundKit): Rect[] {
  const { swings, slide, sandpit } = kit;
  return [
    // The frame's legs at x ±1.4, and the seats' swing along z.
    { x0: swings.x - 1.55, x1: swings.x + 1.55, z0: swings.z - 1.3, z1: swings.z + 1.6 },
    // Platform, chute, and the child's way round from the bottom to the ladder.
    { x0: slide.x - 0.7, x1: slide.x + 1.25, z0: slide.z - 1.2, z1: slide.z + 3.2 },
    { x0: sandpit.x - sandpit.w / 2, x1: sandpit.x + sandpit.w / 2, z0: sandpit.z - sandpit.d / 2, z1: sandpit.z + sandpit.d / 2 },
  ];
}

// ── Who plays ───────────────────────────────────────────────────────────────

export interface Footballer {
  key: string;
  role: PersonRole;
  /** Where in the formation, as fractions of the pitch's half-length (u) and
   *  half-width (v), before the formation is scaled. */
  fu: number;
  fv: number;
  team: 0 | 1;
}

export interface Football {
  rect: Rect;
  alongX: boolean;
  players: Footballer[];
  /** One in front of each goal. */
  keepers: { key: string; role: PersonRole; end: -1 | 1 }[];
}

export interface PlaygroundPlay {
  kit: PlaygroundKit;
  swingers: { key: string; role: PersonRole; seat: number; phase: number }[];
  slider: { key: string; role: PersonRole } | null;
  /** Two children chasing each other round one loop. */
  tag: { keys: [string, string]; role: PersonRole; loop: Spot[] } | null;
  digger: { key: string; role: PersonRole } | null;
}

export interface PlayCast {
  pitch: Football | null;
  playground: PlaygroundPlay | null;
}

/** Formation spots: two teams, one end each. A small pitch gets two a side. */
const SIX: [number, number, 0 | 1][] = [
  [-1, -1, 0],
  [-1, 1, 0],
  [-0.3, -0.35, 0],
  [1, -1, 1],
  [1, 1, 1],
  [0.3, 0.35, 1],
];
const FOUR: [number, number, 0 | 1][] = [
  [-1, -0.6, 0],
  [-0.3, 0.6, 0],
  [0.3, -0.6, 1],
  [1, 0.6, 1],
];

/** How much open ground a game of tag needs, as a loop's two radii. */
const TAG_MIN_RADIUS = 0.6;

/** Who plays on this plot. The same plot always gets the same game. */
export function playCast(grounds: GroundsPlan): PlayCast {
  const pitchF = grounds.features.find((f) => f.kind === "pitch");
  const groundF = grounds.features.find((f) => f.kind === "playground");

  let pitch: Football | null = null;
  if (pitchF) {
    const { x0, z0, x1, z1 } = pitchF.rect;
    const long = pitchF.alongX ? x1 - x0 : z1 - z0;
    const spots = long >= 16 ? SIX : FOUR;
    pitch = {
      rect: pitchF.rect,
      alongX: pitchF.alongX,
      players: spots.map(([fu, fv, team], i) => ({ key: `pitch-p${i}`, role: "footballer", fu, fv, team })),
      keepers: [
        { key: "pitch-k0", role: "keeper", end: -1 },
        { key: "pitch-k1", role: "keeper", end: 1 },
      ],
    };
  }

  let playground: PlaygroundPlay | null = null;
  if (groundF) {
    const kit = playgroundKit(groundF);
    const open = largestOpen(groundF.rect, kitObstacles(kit), 0.3);
    const rx = open ? (open.x1 - open.x0) / 2 - 0.3 : 0;
    const rz = open ? (open.z1 - open.z0) / 2 - 0.3 : 0;
    playground = {
      kit,
      swingers: kit.swings.seats.map((_, seat) => ({
        key: `play-swing${seat}`,
        role: "kid",
        seat,
        // Out of step, the way two children on a swing always are.
        phase: seat * 2.2,
      })),
      slider: { key: "play-slide", role: "kid" },
      tag:
        open && rx >= TAG_MIN_RADIUS && rz >= TAG_MIN_RADIUS
          ? { keys: ["play-tag0", "play-tag1"], role: "kid", loop: ovalLoop(open, rx, rz) }
          : null,
      digger: { key: "play-sand", role: "kid" },
    };
  }

  return { pitch, playground };
}

/** Everybody playing, for the speech scheduler. */
export function playersOf(play: PlayCast): { key: string; role: PersonRole }[] {
  const out: { key: string; role: PersonRole }[] = [];
  if (play.pitch) out.push(...play.pitch.players, ...play.pitch.keepers);
  const pg = play.playground;
  if (pg) {
    out.push(...pg.swingers);
    if (pg.slider) out.push(pg.slider);
    if (pg.tag) out.push(...pg.tag.keys.map((key) => ({ key, role: pg.tag!.role })));
    if (pg.digger) out.push(pg.digger);
  }
  return out;
}

/** The biggest axis-aligned rectangle inside `area` that stays `margin` clear
 *  of every obstacle, on a 0.25m grid. Null if there is none. */
export function largestOpen(area: Rect, obstacles: Rect[], margin: number): Rect | null {
  const step = 0.25;
  const cols = Math.floor((area.x1 - area.x0) / step);
  const rows = Math.floor((area.z1 - area.z0) / step);
  const free: boolean[][] = [];
  for (let j = 0; j < rows; j++) {
    const row: boolean[] = [];
    for (let i = 0; i < cols; i++) {
      const x = area.x0 + (i + 0.5) * step;
      const z = area.z0 + (j + 0.5) * step;
      const inside = x > area.x0 + margin && x < area.x1 - margin && z > area.z0 + margin && z < area.z1 - margin;
      row.push(
        inside &&
          obstacles.every((o) => x < o.x0 - margin || x > o.x1 + margin || z < o.z0 - margin || z > o.z1 + margin),
      );
    }
    free.push(row);
  }
  // Largest rectangle of trues: histogram per row, then the usual stack.
  const height = new Array<number>(cols).fill(0);
  let best: { area: number; i0: number; i1: number; j0: number; j1: number } | null = null;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) height[i] = free[j][i] ? height[i] + 1 : 0;
    const stack: number[] = [];
    for (let i = 0; i <= cols; i++) {
      const h = i < cols ? height[i] : 0;
      while (stack.length && height[stack[stack.length - 1]] >= h) {
        const top = stack.pop()!;
        const hh = height[top];
        const left = stack.length ? stack[stack.length - 1] + 1 : 0;
        const a = hh * (i - left);
        // Squarer beats longer at the same area: tag wants room to turn.
        const score = a * Math.min(hh, i - left);
        if (hh > 0 && (!best || score > best.area)) best = { area: score, i0: left, i1: i, j0: j - hh + 1, j1: j + 1 };
      }
      stack.push(i);
    }
  }
  if (!best) return null;
  return {
    x0: area.x0 + best.i0 * step,
    x1: area.x0 + best.i1 * step,
    z0: area.z0 + best.j0 * step,
    z1: area.z0 + best.j1 * step,
  };
}

/** A loop round the middle of `r`: twelve points on an ellipse, clockwise
 *  seen from above so the runners keep turning the same way. */
function ovalLoop(r: Rect, rx: number, rz: number): Spot[] {
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  return Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: cx + Math.cos(a) * rx, z: cz + Math.sin(a) * rz, ry: 0 };
  });
}

/** Running pace for tag. */
export const TAG_SPEED = 2.4;

// ── The kickabout ───────────────────────────────────────────────────────────

/** How far from the ends and the touchlines the outfield players keep: clear
 *  of the goals and their keepers. */
const END_MARGIN = 2.3;
const SIDE_MARGIN = 0.8;
/** Each player's own jinking about, on top of the whole game moving. */
const WOBBLE = 0.35;
/** How tightly the formation holds together; the rest of the room is for the
 *  game as a whole to move up and down the pitch. */
const FORM_U = 0.55;
const FORM_V = 0.6;
/** A pass every so often, in the air for part of it — for as long as a
 *  child's kick takes to cover the distance. */
export const PASS_EVERY = 2.4;
const PASS_SPEED = 11;
/** The ball rests this far in front of whoever has it. */
const DRIBBLE = 0.3;
/** On the ground, the ball's centre is its radius up. */
export const BALL_R = 0.11;

export interface Runner {
  x: number;
  z: number;
  /** Facing: atan2(dx, dz), like everything else in the school. */
  ry: number;
  /** Metres per second, for how hard the legs swing. */
  speed: number;
  /** 0..1 while kicking, else 0. */
  kick: number;
}

export interface FootballFrame {
  players: Runner[];
  keepers: Runner[];
  ball: { x: number; y: number; z: number };
}

/** A well-stirred unsigned 32-bit number for each integer. Unsigned matters:
 *  XOR in JavaScript yields a signed result, and a negative one would pick a
 *  player numbered -1. */
const hash = (k: number) => {
  let h = Math.imul(k | 0, 2654435761) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  h = Math.imul(h, 2246822519) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
};

/** Who has the ball during pass period `k`. */
function carrier(k: number, n: number): number {
  const raw = (x: number) => hash(x + 7919) % n;
  const r = raw(k);
  // Never a pass to yourself straight back — mostly.
  return r === raw(k - 1) ? (r + 1) % n : r;
}

/** The pitch's own frame: u along its length, v across it, from its centre. */
function pitchFrame(game: Football) {
  const { x0, z0, x1, z1 } = game.rect;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const halfLong = (game.alongX ? x1 - x0 : z1 - z0) / 2;
  const halfShort = (game.alongX ? z1 - z0 : x1 - x0) / 2;
  const toWorld = (u: number, v: number) => (game.alongX ? { x: cx + u, z: cz + v } : { x: cx + v, z: cz + u });
  return { halfLong, halfShort, toWorld };
}

/** Where outfield player `i` is at time t, in the pitch's frame. */
function outfieldAt(game: Football, i: number, t: number): { u: number; v: number } {
  const { halfLong, halfShort } = pitchFrame(game);
  const iu = Math.max(0.5, halfLong - END_MARGIN - WOBBLE);
  const iv = Math.max(0.3, halfShort - SIDE_MARGIN - WOBBLE);
  // The whole game drifts up and down and across the pitch…
  const cu = (1 - FORM_U) * iu * Math.sin(0.33 * t);
  const cv = (1 - FORM_V) * iv * Math.sin(0.47 * t + 1.3);
  const p = game.players[i];
  // …each player keeps their place in it, and jinks about a little.
  return {
    u: cu + p.fu * FORM_U * iu + WOBBLE * Math.sin(1.4 * t + 2.1 * i),
    v: cv + p.fv * FORM_V * iv + WOBBLE * Math.cos(1.2 * t + 1.7 * i),
  };
}

const toward = (a: { u: number; v: number }, b: { u: number; v: number }) => {
  const du = b.u - a.u;
  const dv = b.v - a.v;
  const d = Math.hypot(du, dv) || 1;
  return { u: du / d, v: dv / d, d };
};

/** Where the ball is, in the pitch's frame: rolling at the feet of whoever has
 *  it, aimed at whoever they will pass to next — and in between, in the air. */
function ballAt(game: Football, t: number): { u: number; v: number; y: number; from: number; tau: number } {
  const n = game.players.length;
  const k = Math.floor(t / PASS_EVERY);
  const tau = t - k * PASS_EVERY;
  const from = carrier(k - 1, n);
  const to = carrier(k, n);
  const next = carrier(k + 1, n);
  const pFrom = outfieldAt(game, from, t);
  const pTo = outfieldAt(game, to, t);
  const pNext = outfieldAt(game, next, t);
  const onFoot = (p: { u: number; v: number }, aim: { u: number; v: number }) => {
    const dir = toward(p, aim);
    return { u: p.u + dir.u * DRIBBLE, v: p.v + dir.v * DRIBBLE };
  };
  // How long it is in the air, from how far it had to go when it was kicked —
  // fixed for the whole pass, so the ball never changes pace mid-flight.
  const kickedAt = k * PASS_EVERY;
  const reach = toward(outfieldAt(game, from, kickedAt), outfieldAt(game, to, kickedAt)).d;
  const flight = Math.min(PASS_EVERY - 0.4, Math.max(0.45, reach / PASS_SPEED));
  const b = onFoot(pTo, pNext);
  if (tau >= flight) return { u: b.u, v: b.v, y: BALL_R, from, tau };
  const s = tau / flight;
  const a = onFoot(pFrom, pTo);
  // Along the ground for a short one, lofted for a long one.
  const lob = Math.min(1.6, Math.max(0.15, (reach - 3) * 0.12));
  return {
    u: a.u + (b.u - a.u) * s,
    v: a.v + (b.v - a.v) * s,
    y: BALL_R + lob * Math.sin(Math.PI * s),
    from,
    tau,
  };
}

/** Where each keeper stands across their goal mouth: following the ball, and
 *  never past the posts. */
const keeperV = (ballV: number) => Math.max(-1.2, Math.min(1.2, ballV * 0.5));

/** The whole game at time t: every player, both keepers, and the ball. */
export function footballFrame(game: Football, t: number): FootballFrame {
  const { halfLong, toWorld } = pitchFrame(game);
  const b = ballAt(game, t);
  const before = ballAt(game, t - 0.05);
  const ball = { ...toWorld(b.u, b.v), y: b.y };
  const faceBall = (x: number, z: number) => Math.atan2(ball.x - x, ball.z - z);

  const players: Runner[] = game.players.map((_, i) => {
    const p = outfieldAt(game, i, t);
    const q = outfieldAt(game, i, t - 0.05);
    const w = toWorld(p.u, p.v);
    return {
      ...w,
      ry: faceBall(w.x, w.z),
      speed: Math.hypot(p.u - q.u, p.v - q.v) / 0.05,
      // The passer's kick, at the start of each period.
      kick: i === b.from && b.tau < 0.3 ? Math.sin((b.tau / 0.3) * Math.PI) : 0,
    };
  });

  const keepers: Runner[] = game.keepers.map((kp) => {
    const w = toWorld(kp.end * (halfLong - 1.2), keeperV(b.v));
    return {
      ...w,
      ry: faceBall(w.x, w.z),
      speed: Math.abs(keeperV(b.v) - keeperV(before.v)) / 0.05,
      kick: 0,
    };
  });

  return { players, keepers, ball };
}

// ── The slide ───────────────────────────────────────────────────────────────

export type SlidePose = "walk" | "climb" | "stand" | "slide";

export interface SlideStep {
  /** In the slide's own frame: origin at the platform's centre, ground level. */
  x: number;
  y: number;
  z: number;
  ry: number;
  pose: SlidePose;
  /** 0..1 through whatever the pose is doing, for the arms and legs. */
  k: number;
}

const WALK = 1.3;
/** Round the side of the slide from the bottom of the chute to the ladder. */
const ROUND: { x: number; z: number }[] = [
  { x: 0, z: 2.98 },
  { x: 0.95, z: 2.98 },
  { x: 0.95, z: -0.95 },
  { x: 0, z: -0.95 },
];
const legLengths = ROUND.slice(1).map((p, i) => Math.hypot(p.x - ROUND[i].x, p.z - ROUND[i].z));
const WALK_T = legLengths.reduce((a, b) => a + b, 0) / WALK;
/** Down, up, across, down again: how long each part of one go takes. */
const SLIDE_T = 1.1;
const GET_UP_T = 0.5;
const CLIMB_T = 1.6;
const CROSS_T = 0.8;
const PERCH_T = 0.6;
export const SLIDE_CYCLE = SLIDE_T + GET_UP_T + WALK_T + CLIMB_T + CROSS_T + PERCH_T;

/** Where the child on the slide is, t seconds into the day. For the "slide"
 *  pose the point is on the chute's surface, where they sit. */
export function slideAt(t: number): SlideStep {
  let u = ((t % SLIDE_CYCLE) + SLIDE_CYCLE) % SLIDE_CYCLE;
  const { top, bottom } = SLIDE;
  if (u < SLIDE_T) {
    // Picking up speed all the way down.
    const s = (u / SLIDE_T) ** 2;
    return { x: 0, y: top.y + (bottom.y - top.y) * s, z: top.z + (bottom.z - top.z) * s, ry: 0, pose: "slide", k: s };
  }
  u -= SLIDE_T;
  if (u < GET_UP_T) {
    const k = u / GET_UP_T;
    return { x: 0, y: PLAY_FLOOR, z: bottom.z + 0.5 * k, ry: 0, pose: "stand", k };
  }
  u -= GET_UP_T;
  if (u < WALK_T) {
    let d = u * WALK;
    for (let i = 0; i < legLengths.length; i++) {
      if (d <= legLengths[i] || i === legLengths.length - 1) {
        const a = ROUND[i];
        const b = ROUND[i + 1];
        const k = Math.min(1, d / legLengths[i]);
        return {
          x: a.x + (b.x - a.x) * k,
          y: PLAY_FLOOR,
          z: a.z + (b.z - a.z) * k,
          ry: Math.atan2(b.x - a.x, b.z - a.z),
          pose: "walk",
          k,
        };
      }
      d -= legLengths[i];
    }
  }
  u -= WALK_T;
  if (u < CLIMB_T) {
    // Up the back of the platform, facing it.
    const k = u / CLIMB_T;
    return { x: 0, y: PLAY_FLOOR + (SLIDE.deck - PLAY_FLOOR) * k, z: -0.85, ry: 0, pose: "climb", k };
  }
  u -= CLIMB_T;
  if (u < CROSS_T) {
    const k = u / CROSS_T;
    return { x: 0, y: SLIDE.deck, z: -0.85 + (0.2 + 0.85) * k, ry: 0, pose: "walk", k };
  }
  u -= CROSS_T;
  // A moment at the top before going.
  return { x: 0, y: SLIDE.deck, z: 0.2, ry: 0, pose: "stand", k: u / PERCH_T };
}
