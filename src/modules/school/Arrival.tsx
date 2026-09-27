// modules/school/Arrival.tsx
//
// A newly bought room going up. It used to simply appear, which undersold the
// one moment in the game the player has saved for: now the walls rise out of
// the ground inside a scaffold, dust kicks out from the base, and the furniture
// pops in once the shell is standing.
//
// Everything here is driven from `active` flipping on, and reads the clock the
// frame it does — so it plays once per purchase, and never on page load.

import { ReactNode, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Rect } from "../../config/schoolCatalog";

/** How long the walls take to rise, and the scaffold to clear after. */
const RISE_S = 1.1;
const CLEAR_S = 0.8;

/** Overshoots a touch and settles: the difference between "placed" and
 *  "built". */
const easeOutBack = (k: number) => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
};

/** The start time of an animation that begins when `active` turns on. Null
 *  until the first frame after that. */
function useStart(active: boolean) {
  const start = useRef<number | null>(null);
  useEffect(() => {
    start.current = null;
  }, [active]);
  return start;
}

export const Rise = ({
  active,
  rect,
  children,
}: {
  active: boolean;
  rect: Rect;
  children: ReactNode;
}) => {
  const body = useRef<THREE.Group>(null);
  const extras = useRef<THREE.Group>(null);
  const start = useStart(active);
  // Flattened before the first paint, or the finished room flashes up for a
  // frame before the animation's first tick knocks it down to start rising.
  useLayoutEffect(() => {
    if (active && body.current) body.current.scale.y = 0.02;
  }, [active]);

  const scaffold = useMemo(
    () => new THREE.MeshLambertMaterial({ color: "#c9a24e", transparent: true, opacity: 1 }),
    [],
  );
  const dust = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#d9d2c3", transparent: true, opacity: 0.8, depthWrite: false }),
    [],
  );
  useEffect(
    () => () => {
      scaffold.dispose();
      dust.dispose();
    },
    [scaffold, dust],
  );

  // Puffs round the base: along each edge, pushed outward as they rise.
  const puffs = useMemo(() => {
    const out: { x: number; z: number; dx: number; dz: number }[] = [];
    const n = Math.max(2, Math.round((rect.w + rect.d) / 3));
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n;
      out.push({ x: rect.x + rect.w * f, z: rect.z + rect.d, dx: 0, dz: 1 });
      out.push({ x: rect.x + rect.w, z: rect.z + rect.d * f, dx: 1, dz: 0 });
      out.push({ x: rect.x + rect.w * f, z: rect.z, dx: 0, dz: -1 });
      out.push({ x: rect.x, z: rect.z + rect.d * f, dx: -1, dz: 0 });
    }
    return out;
  }, [rect.x, rect.z, rect.w, rect.d]);
  const puffRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const g = body.current;
    if (!g) return;
    if (!active) {
      g.scale.y = 1;
      if (extras.current) extras.current.visible = false;
      return;
    }
    if (start.current === null) start.current = clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    const k = Math.min(1, t / RISE_S);
    g.scale.y = Math.max(0.02, easeOutBack(k));

    if (extras.current) {
      const done = t > RISE_S + CLEAR_S;
      extras.current.visible = !done;
      scaffold.opacity = t < RISE_S ? 1 : Math.max(0, 1 - (t - RISE_S) / CLEAR_S);
      dust.opacity = Math.max(0, 0.75 * (1 - t / (RISE_S + 0.3)));
      const spread = Math.min(1, t / (RISE_S + 0.3));
      puffRefs.current.forEach((m, i) => {
        if (!m) return;
        const p = puffs[i];
        m.position.set(p.x + p.dx * spread * 0.9, 0.15 + spread * 0.5, p.z + p.dz * spread * 0.9);
        m.scale.setScalar(0.6 + spread * 1.2);
      });
    }
  });

  const H = 3.4;
  const poles: [number, number][] = [
    [rect.x, rect.z],
    [rect.x + rect.w, rect.z],
    [rect.x, rect.z + rect.d],
    [rect.x + rect.w, rect.z + rect.d],
  ];

  return (
    <group>
      <group ref={body}>{children}</group>
      {active && (
        <group ref={extras}>
          {poles.map(([x, z]) => (
            <mesh key={`${x},${z}`} position={[x, H / 2, z]} material={scaffold}>
              <boxGeometry args={[0.12, H, 0.12]} />
            </mesh>
          ))}
          {[1.6, 3.2].map((y) => (
            <group key={y}>
              <mesh position={[rect.x + rect.w / 2, y, rect.z]} material={scaffold}>
                <boxGeometry args={[rect.w, 0.08, 0.08]} />
              </mesh>
              <mesh position={[rect.x + rect.w / 2, y, rect.z + rect.d]} material={scaffold}>
                <boxGeometry args={[rect.w, 0.08, 0.08]} />
              </mesh>
              <mesh position={[rect.x, y, rect.z + rect.d / 2]} material={scaffold}>
                <boxGeometry args={[0.08, 0.08, rect.d]} />
              </mesh>
              <mesh position={[rect.x + rect.w, y, rect.z + rect.d / 2]} material={scaffold}>
                <boxGeometry args={[0.08, 0.08, rect.d]} />
              </mesh>
            </group>
          ))}
          {puffs.map((p, i) => (
            <mesh
              key={i}
              ref={(m) => {
                puffRefs.current[i] = m;
              }}
              position={[p.x, 0.15, p.z]}
              material={dust}
            >
              <boxGeometry args={[0.35, 0.3, 0.35]} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

/** One piece of furniture arriving after its room: scaled up from nothing,
 *  a moment after the walls have finished rising. */
export const PopIn = ({
  active,
  delay,
  children,
}: {
  active: boolean;
  delay: number;
  children: ReactNode;
}) => {
  const g = useRef<THREE.Group>(null);
  const start = useStart(active);
  useLayoutEffect(() => {
    if (active && g.current) g.current.scale.setScalar(0.001);
  }, [active]);
  useFrame(({ clock }) => {
    if (!g.current) return;
    if (!active) {
      g.current.scale.setScalar(1);
      return;
    }
    if (start.current === null) start.current = clock.elapsedTime;
    const k = Math.min(1, Math.max(0, (clock.elapsedTime - start.current - delay) / 0.35));
    g.current.scale.setScalar(Math.max(0.001, k === 0 ? 0 : easeOutBack(k)));
  });
  return <group ref={g}>{children}</group>;
};
