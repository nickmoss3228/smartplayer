// modules/school/Walking.tsx
//
// Taking the player's character for a walk: what turns a tap on the floor or a
// held key into somewhere to go (walkGrid.ts finds the way, avatar.ts walks
// it), and the ring that shows where it is headed. The keys are in walkKeys.ts.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AvatarState } from "./avatar";
import { WalkGrid, findPath, nearestStandable } from "./walkGrid";

/** A drag that ends where it began is still a drag, not a tap: past this many
 *  pixels the finger was panning the camera. */
const TAP_SLOP = 8;

/**
 * An invisible floor over the whole plot that takes a tap and sends the
 * character there. Anything with a tap of its own — a person, the board — is
 * nearer the camera and stops the event first, so poking a student still
 * pokes the student.
 */
export const FloorCatcher = ({
  land,
  state,
  grid,
}: {
  land: { x0: number; z0: number; x1: number; z1: number };
  state: AvatarState;
  grid: WalkGrid;
}) => (
  <mesh
    position={[(land.x0 + land.x1) / 2, 0.02, (land.z0 + land.z1) / 2]}
    rotation={[-Math.PI / 2, 0, 0]}
    visible={false}
    onClick={(e) => {
      if (e.delta > TAP_SLOP) return;
      const to = nearestStandable(grid, { x: e.point.x, z: e.point.z }, 2.5);
      if (!to) return;
      const path = findPath(grid, { x: state.x, z: state.z }, to);
      if (!path) return;
      state.path = path;
      state.target = to;
      state.follow = true;
    }}
  >
    <planeGeometry args={[land.x1 - land.x0, land.z1 - land.z0]} />
  </mesh>
);

/** Where the character is walking to: a gold ring on the floor, breathing. */
export const WalkTarget = ({ state }: { state: AvatarState }) => {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ring.current;
    if (!m) return;
    m.visible = state.target !== null;
    if (!state.target) return;
    m.position.set(state.target.x, 0.04, state.target.z);
    m.scale.setScalar(1 + Math.sin(clock.elapsedTime * 5) * 0.12);
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.22, 0.32, 20]} />
      <meshBasicMaterial color="#f4c04a" transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
};
