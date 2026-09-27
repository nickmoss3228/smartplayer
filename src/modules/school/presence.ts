// modules/school/presence.ts
//
// Where everybody who is walking is, right now. Written by the walkers every
// frame, read by the things that react to people passing — the front doors,
// which swing open when somebody reaches them.
//
// A set of mutable points behind a context rather than React state: it changes
// every frame for every walker, and re-rendering the scene sixty times a second
// to move a door would be absurd. Nothing here ever triggers a render.

import { createContext, useContext, useEffect, useRef } from "react";

export interface Point {
  x: number;
  z: number;
}

export type Presence = Set<Point>;

export const PresenceContext = createContext<Presence | null>(null);

/** A point this actor owns and updates in place, registered for as long as the
 *  actor is mounted. Returns the point itself — write `x`/`z` every frame. */
export function usePresencePoint(): Point {
  const presence = useContext(PresenceContext);
  const point = useRef<Point>({ x: Number.NaN, z: Number.NaN });
  useEffect(() => {
    if (!presence) return;
    const p = point.current;
    presence.add(p);
    return () => {
      presence.delete(p);
    };
  }, [presence]);
  return point.current;
}

export const usePresence = () => useContext(PresenceContext);

/** Distance from (x, z) to the nearest registered walker. Infinity if none. */
export function nearest(presence: Presence | null, x: number, z: number): number {
  if (!presence) return Infinity;
  let best = Infinity;
  for (const p of presence) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < best) best = d;
  }
  return best;
}
