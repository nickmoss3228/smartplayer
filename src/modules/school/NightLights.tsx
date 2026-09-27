// modules/school/NightLights.tsx
//
// The school's own lights: lamps hanging over every room, real light from them
// on the floor and the people, neon along the walls, and pools of light under
// the lampposts outside. See lampLayout.ts for where they go.
//
// Everything that glows shares a handful of materials, and ONE frame loop
// (NightDriver) turns them all up and down together by the school clock — so
// dusk is one smooth fade across the whole campus, and a hundred neon runs cost
// one update, not a hundred.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { schoolNow } from "./schoolClock";
import { POOL_RADIUS, Pendant, RoomLight, nightness } from "./lampLayout";
import { glowMaterials, setGlow } from "./glowMaterials";

/** Turns every light in the school up or down with the clock. Mount once. */
export const NightDriver = () => {
  useFrame(() => setGlow(nightness(schoolNow().hours)));
  return null;
};

// ── Lamps over the rooms ────────────────────────────────────────────────────

const CORD = new THREE.BoxGeometry(0.03, 0.5, 0.03);
const SHADE = new THREE.CylinderGeometry(0.1, 0.3, 0.22, 10, 1, true);
const BULB = new THREE.SphereGeometry(0.09, 8, 6);

/**
 * A lamp hanging from the ceiling the cutaway does not draw. Its cord runs up
 * out of the top of the room, which is how every cutaway game hangs a lamp.
 * The shade is there all day; the bulb and its halo light up after dark.
 */
const PendantLamp = ({ x, z }: { x: number; z: number }) => {
  const g = glowMaterials();
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={CORD} position={[0, 2.95, 0]}>
        <meshLambertMaterial color="#3a3f4a" />
      </mesh>
      <mesh geometry={SHADE} position={[0, 2.62, 0]}>
        <meshLambertMaterial color="#3a3f4a" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={BULB} position={[0, 2.54, 0]} material={g.bulb} />
      <sprite position={[0, 2.5, 0]} scale={[1.5, 1.5, 1]} material={g.halo} />
    </group>
  );
};

export const Pendants = ({ pendants }: { pendants: Pendant[] }) => (
  <group>
    {pendants.map((p) => (
      <PendantLamp key={`${p.roomId}-${p.x.toFixed(2)}-${p.z.toFixed(2)}`} x={p.x} z={p.z} />
    ))}
  </group>
);

/**
 * The light the lamps actually give: one warm point light per room, turned up
 * with the clock. Only mounted while the lights are on, so the day's rendering
 * pays nothing for them.
 */
export const RoomLights = ({ lights }: { lights: RoomLight[] }) => {
  const refs = useRef<(THREE.PointLight | null)[]>([]);
  useFrame(() => {
    const k = nightness(schoolNow().hours);
    for (const l of refs.current) if (l) l.intensity = 7 * k;
  });
  return (
    <group>
      {lights.map((l, i) => (
        <pointLight
          key={`${l.x},${l.z}`}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[l.x, 2.5, l.z]}
          color="#ffcf8f"
          distance={l.range}
          decay={1}
          intensity={0}
        />
      ))}
    </group>
  );
};

// ── Pools of light under the lampposts ──────────────────────────────────────

const POOL = new THREE.PlaneGeometry(POOL_RADIUS * 2, POOL_RADIUS * 2);

export const LampPools = ({ at }: { at: { x: number; z: number }[] }) => {
  const g = glowMaterials();
  const spots = useMemo(() => at.map((p) => [p.x, p.z] as const), [at]);
  return (
    <group>
      {spots.map(([x, z]) => (
        <mesh
          key={`${x},${z}`}
          geometry={POOL}
          material={g.pool}
          position={[x, 0.035, z]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={1}
        />
      ))}
    </group>
  );
};
