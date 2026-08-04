import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CharacterSlot, getCharacterItem } from "../../config/characterCatalog";
import { buildHairModel, buildHatModel } from "./characterVoxelModels";
import { VoxelBox } from "./voxelModels";

// Extracted from RoomScene.tsx's original ambient `Character()` — same
// jointed-box-rig geometry and walk/swing animation, now parameterized by
// the owning user's customization instead of hardcoded colors, so the same
// component renders correctly for "my room" and (via getPlayerRoom) anyone
// else's room — it's just props in, geometry out.
const WALK_MIN_X = -140;
const WALK_MAX_X = 140;
const WALK_Z = 120;
const WALK_SPEED = 45; // world units / second
const LEG_LENGTH = 26;
const TORSO_HEIGHT = 28;
const HEAD_SIZE = 16;
const SWING_FREQUENCY = 6;
const SWING_AMPLITUDE = 0.6;

const DEFAULT_SHIRT_COLOR = "#4a7fd6";
const DEFAULT_PANTS_COLOR = "#2b2d42";

export interface CharacterAppearance {
  skinTone: string;
  equipped: Record<CharacterSlot, string | null>;
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

export function CharacterRig({ skinTone, equipped }: CharacterAppearance) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const state = useRef({ x: WALK_MIN_X, dir: 1, walkClock: 0 });

  const outfitItem = equipped.outfit ? getCharacterItem(equipped.outfit) : null;
  const shirtColor = outfitItem?.swatch.color ?? DEFAULT_SHIRT_COLOR;
  const pantsColor = outfitItem?.swatch.accent ?? DEFAULT_PANTS_COLOR;

  const hairItem = equipped.hairstyle ? getCharacterItem(equipped.hairstyle) : null;
  const hairModel = hairItem ? buildHairModel(hairItem.swatch) : [];

  const hatItem = equipped.hat ? getCharacterItem(equipped.hat) : null;
  const hatModel = hatItem ? buildHatModel(hatItem.swatch) : [];

  useFrame((_, delta) => {
    const s = state.current;
    s.x += s.dir * WALK_SPEED * delta;
    if (s.x > WALK_MAX_X) {
      s.x = WALK_MAX_X;
      s.dir = -1;
    } else if (s.x < WALK_MIN_X) {
      s.x = WALK_MIN_X;
      s.dir = 1;
    }
    s.walkClock += delta;

    if (groupRef.current) {
      groupRef.current.position.x = s.x;
      // Modeled facing local +Z; turn to face the direction of travel along world X.
      groupRef.current.rotation.y = s.dir >= 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    const swing = Math.sin(s.walkClock * SWING_FREQUENCY) * SWING_AMPLITUDE;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.7;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.7;
  });

  return (
    <group ref={groupRef} position={[WALK_MIN_X, 0, WALK_Z]}>
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
        <AttachmentBoxes model={hairModel} />
        <AttachmentBoxes model={hatModel} />
      </group>
    </group>
  );
}
