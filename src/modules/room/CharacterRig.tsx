import { useRef } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { CharacterSlot, getCharacterItem } from "../../config/characterCatalog";
import { buildHairModel, buildHatModel, buildFaceModel } from "./characterVoxelModels";
import { VoxelBox } from "./voxelModels";

// Player-controlled rig — click the floor to walk somewhere, click the desk
// chair to sit facing the desk, click the character while seated to stand
// back up. Replaces the old fully-autonomous bounce-between-walls animation;
// same jointed-box-rig geometry/swing idiom, now driven by an external
// target instead of an internal clock.
const DEFAULT_X = 0;
const DEFAULT_Z = 140;
const WALK_SPEED = 90; // world units / second
const SIT_LERP_SPEED = 8; // per-second convergence factor while sitting down
const DEFAULT_SIT_FACING = Math.PI; // rig faces local +Z; Math.PI turns it to face -Z
const ARRIVE_EPSILON = 1;
const LEG_LENGTH = 26;
const TORSO_HEIGHT = 28;
const HEAD_SIZE = 16;
const SWING_FREQUENCY = 6;
const SWING_AMPLITUDE = 0.6;

const DEFAULT_SHIRT_COLOR = "#4a7fd6";
const DEFAULT_PANTS_COLOR = "#2b2d42";
const DEFAULT_SKIN_TONE = "#f2c48d";

export interface CharacterAppearance {
  skinTone: string;
  equipped: Record<CharacterSlot, string | null>;
}

export interface CharacterTarget {
  x: number;
  z: number;
  sitting: boolean;
  // Facing angle (radians) to snap to once seated — lets the caller aim the
  // character at wherever the desk currently is, even after it's been
  // dragged elsewhere in arrange mode. Falls back to a fixed angle if omitted.
  facing?: number;
}

interface CharacterRigProps extends CharacterAppearance {
  target: CharacterTarget | null;
  onCharacterClick?: () => void;
}

function AttachmentBoxes({ model }: { model: VoxelBox[] }) {
  return (
    <>
      {model.map((box, i) => (
        <mesh key={i} position={box.position}>
          <boxGeometry args={box.size} />
          <meshLambertMaterial color={box.color} />
        </mesh>
      ))}
    </>
  );
}

export function CharacterRig({ skinTone: rawSkinTone, equipped, target, onCharacterClick }: CharacterRigProps) {
  // Guards against a missing/malformed skin tone (e.g. an older document
  // predating this field) reaching THREE.Color as undefined, which throws
  // inside the render loop and can take the whole canvas down with it.
  const skinTone = /^#[0-9a-fA-F]{6}$/.test(rawSkinTone ?? "") ? rawSkinTone : DEFAULT_SKIN_TONE;

  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const state = useRef({ x: DEFAULT_X, z: DEFAULT_Z, facingAngle: 0, walkClock: 0, walking: false });

  const outfitItem = equipped.outfit ? getCharacterItem(equipped.outfit) : null;
  const shirtColor = outfitItem?.swatch.color ?? DEFAULT_SHIRT_COLOR;
  const pantsColor = outfitItem?.swatch.accent ?? DEFAULT_PANTS_COLOR;

  const hairItem = equipped.hairstyle ? getCharacterItem(equipped.hairstyle) : null;
  const hairModel = hairItem ? buildHairModel(hairItem.swatch) : [];

  const hatItem = equipped.hat ? getCharacterItem(equipped.hat) : null;
  const hatModel = hatItem ? buildHatModel(hatItem.swatch) : [];

  useFrame((_, delta) => {
    const s = state.current;
    const sitting = !!target?.sitting;
    const goalX = target ? target.x : s.x;
    const goalZ = target ? target.z : s.z;
    const dx = goalX - s.x;
    const dz = goalZ - s.z;
    const dist = Math.hypot(dx, dz);

    if (sitting) {
      const t = Math.min(1, delta * SIT_LERP_SPEED);
      s.x += dx * t;
      s.z += dz * t;
      s.facingAngle = target?.facing ?? DEFAULT_SIT_FACING;
      s.walking = false;
    } else if (dist > ARRIVE_EPSILON) {
      const step = Math.min(dist, WALK_SPEED * delta);
      s.x += (dx / dist) * step;
      s.z += (dz / dist) * step;
      // Modeled facing local +Z; face the direction of travel in the XZ plane.
      s.facingAngle = Math.atan2(dx, dz);
      s.walking = true;
    } else {
      s.walking = false;
    }

    if (groupRef.current) {
      groupRef.current.position.x = s.x;
      groupRef.current.position.z = s.z;
      groupRef.current.rotation.y = s.facingAngle;
    }

    if (s.walking) {
      s.walkClock += delta;
      const swing = Math.sin(s.walkClock * SWING_FREQUENCY) * SWING_AMPLITUDE;
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.7;
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.7;
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onCharacterClick?.();
  };

  return (
    <group ref={groupRef} position={[DEFAULT_X, 0, DEFAULT_Z]} onClick={handleClick}>
      <group ref={leftLegRef} position={[-6, LEG_LENGTH, 0]}>
        <mesh position={[0, -LEG_LENGTH / 2, 0]}>
          <boxGeometry args={[8, LEG_LENGTH, 10]} />
          <meshLambertMaterial color={pantsColor} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[6, LEG_LENGTH, 0]}>
        <mesh position={[0, -LEG_LENGTH / 2, 0]}>
          <boxGeometry args={[8, LEG_LENGTH, 10]} />
          <meshLambertMaterial color={pantsColor} />
        </mesh>
      </group>

      <mesh position={[0, LEG_LENGTH + TORSO_HEIGHT / 2, 0]}>
        <boxGeometry args={[24, TORSO_HEIGHT, 14]} />
        <meshLambertMaterial color={shirtColor} />
      </mesh>

      <group ref={leftArmRef} position={[-15, LEG_LENGTH + TORSO_HEIGHT - 4, 0]}>
        <mesh position={[0, -10, 0]}>
          <boxGeometry args={[6, 20, 8]} />
          <meshLambertMaterial color={shirtColor} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[15, LEG_LENGTH + TORSO_HEIGHT - 4, 0]}>
        <mesh position={[0, -10, 0]}>
          <boxGeometry args={[6, 20, 8]} />
          <meshLambertMaterial color={shirtColor} />
        </mesh>
      </group>

      <group position={[0, LEG_LENGTH + TORSO_HEIGHT + HEAD_SIZE / 2, 0]}>
        <mesh>
          <boxGeometry args={[HEAD_SIZE, HEAD_SIZE, HEAD_SIZE]} />
          <meshLambertMaterial color={skinTone} />
        </mesh>
        <AttachmentBoxes model={buildFaceModel(skinTone)} />
        <AttachmentBoxes model={hairModel} />
        <AttachmentBoxes model={hatModel} />
      </group>
    </group>
  );
}
