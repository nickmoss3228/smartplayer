// modules/school/avatar.ts
//
// The player's own character, when they take it for a walk.
//
// A small mutable record the scene shares between the pieces that move it (a
// tap on the floor, the arrow keys), the one that draws it (People), and the
// camera that follows it — all of which work per frame, where React state
// would re-render the whole scene sixty times a second. `stepAvatar` is the
// only thing that moves it, and it is pure, so it is tested without a scene.

import { Point, WalkGrid, canStand } from "./walkGrid";

/** Brisker than everybody else's stroll: it is the player who is waiting. */
export const AVATAR_SPEED = 2.4;

export interface AvatarState {
  x: number;
  z: number;
  /** Facing, as `atan2(dx, dz)` — the same convention as every walker. */
  heading: number;
  /** Straight legs still to walk, ending where the player tapped. */
  path: Point[];
  /** Where the player tapped, for the marker; null once there. */
  target: Point | null;
  /** Held keys as a direction on the ground; zero when none are held. */
  keys: Point;
  /** Whether the camera keeps the character in view. Off when the player
   *  pans away themselves; on again with the next thing they tell it to do. */
  follow: boolean;
}

export const newAvatar = (at: Point, heading = 0): AvatarState => ({
  x: at.x,
  z: at.z,
  heading,
  path: [],
  target: null,
  keys: { x: 0, z: 0 },
  follow: true,
});

/**
 * Moves the character on by `dt` seconds. Held keys win over a path, and
 * cancel it: the player has taken over. Walking into something slides along
 * it rather than stopping dead, which is what makes steering with keys bearable
 * in rooms full of desks. Returns whether it moved.
 */
export function stepAvatar(s: AvatarState, g: WalkGrid, dt: number): boolean {
  const reach = AVATAR_SPEED * Math.min(dt, 0.1);
  const kl = Math.hypot(s.keys.x, s.keys.z);

  if (kl > 0) {
    s.path = [];
    s.target = null;
    const dx = (s.keys.x / kl) * reach;
    const dz = (s.keys.z / kl) * reach;
    s.heading = Math.atan2(dx, dz);
    for (const [mx, mz] of [
      [dx, dz],
      [dx, 0],
      [0, dz],
    ]) {
      if (!mx && !mz) continue;
      const next = { x: s.x + mx, z: s.z + mz };
      if (canStand(g, next)) {
        s.x = next.x;
        s.z = next.z;
        return true;
      }
    }
    return false;
  }

  let left = reach;
  let moved = false;
  while (left > 0 && s.path.length) {
    const to = s.path[0];
    const dx = to.x - s.x;
    const dz = to.z - s.z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-4) s.heading = Math.atan2(dx, dz);
    if (d <= left) {
      s.x = to.x;
      s.z = to.z;
      s.path.shift();
      left -= d;
    } else {
      s.x += (dx / d) * left;
      s.z += (dz / d) * left;
      left = 0;
    }
    moved = true;
  }
  if (!s.path.length) s.target = null;
  return moved;
}

/**
 * Held arrow keys (or WASD) as a direction on the ground. The camera looks
 * down the (-1, -1, -1) diagonal, so "up the screen" is away from it along the
 * ground: toward -x and -z at once.
 */
export function keysToGround(held: ReadonlySet<string>): Point {
  let sx = 0;
  let sy = 0;
  if (held.has("up")) sy += 1;
  if (held.has("down")) sy -= 1;
  if (held.has("left")) sx -= 1;
  if (held.has("right")) sx += 1;
  // Screen right is (+x, -z) on the ground; screen up is (-x, -z).
  // `|| 0` so that no key held is a plain zero, not a negative one.
  return { x: sx - sy || 0, z: -sx - sy || 0 };
}
